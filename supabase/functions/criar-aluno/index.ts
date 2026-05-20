import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

class ApiError extends Error {
  status: number;
  code: string;
  details?: string | null;
  hint?: string | null;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: string | null,
    hint?: string | null,
  ) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details ?? null;
    this.hint = hint ?? null;
  }
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeText(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeUpper(value: unknown) {
  return normalizeText(value).toUpperCase();
}

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function isMissingRelationError(error: unknown) {
  const code = String((error as { code?: string })?.code ?? "");
  const message = String((error as { message?: string })?.message ?? "")
    .toLowerCase();

  return (
    code === "PGRST205" ||
    code === "42P01" ||
    message.includes("could not find the table") ||
    message.includes("relation")
  );
}

function isMissingColumnError(error: unknown, columnName: string) {
  const joined = [
    String((error as { message?: string })?.message ?? "").toLowerCase(),
    String((error as { details?: string })?.details ?? "").toLowerCase(),
    String((error as { hint?: string })?.hint ?? "").toLowerCase(),
  ].join(" ");

  return joined.includes(columnName.toLowerCase()) && joined.includes("column");
}

function isEmailAlreadyExistsError(error: unknown) {
  const code = String((error as { code?: string })?.code ?? "").toLowerCase();
  const message = String((error as { message?: string })?.message ?? "")
    .toLowerCase();

  return (
    code === "user_already_exists" ||
    code === "email_exists" ||
    message.includes("already registered") ||
    message.includes("already exists") ||
    message.includes("email already") ||
    message.includes("duplicate key value")
  );
}

function mapUnknownError(error: unknown) {
  if (error instanceof ApiError) return error;

  if (isEmailAlreadyExistsError(error)) {
    return new ApiError(
      409,
      "user_already_exists",
      "Este e-mail ja esta cadastrado para outro usuario.",
    );
  }

  const code = String((error as { code?: string })?.code ?? "");
  const details = String((error as { details?: string })?.details ?? "");
  const hint = String((error as { hint?: string })?.hint ?? "");
  const message = String(
    (error as { message?: string })?.message ??
      "Falha ao criar aluno no servidor.",
  );

  return new ApiError(
    400,
    code || "student_create_failed",
    message,
    details || null,
    hint || null,
  );
}

async function findAuthUserByEmail(adminClient: any, email: string) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) throw error;

    const users = data?.users ?? [];
    const found = users.find(
      (user: { id?: string | null; email?: string | null }) =>
        normalizeEmail(user?.email ?? "") === email,
    );

    if (found?.id) return found;
    if (users.length < perPage) return null;

    page += 1;
  }
}

async function ensureAdminCaller(userClient: any, userId: string) {
  const euras = userClient.schema("euras");

  let response = await euras
    .from("perfis")
    .select("id")
    .or(`id.eq.${userId},auth_user_id.eq.${userId}`)
    .eq("papel", "admin")
    .eq("ativo", true)
    .limit(1)
    .maybeSingle();

  if (response.error && isMissingColumnError(response.error, "auth_user_id")) {
    response = await euras
      .from("perfis")
      .select("id")
      .eq("id", userId)
      .eq("papel", "admin")
      .eq("ativo", true)
      .limit(1)
      .maybeSingle();
  }

  if (response.error) throw response.error;

  if (!response.data?.id) {
    throw new ApiError(
      403,
      "forbidden",
      "Somente admins podem cadastrar aluno.",
    );
  }
}

async function getProfileByEmail(eurasAdmin: any, email: string) {
  let response = await eurasAdmin
    .from("perfis")
    .select("id, papel, auth_user_id, email")
    .eq("email", email)
    .limit(1)
    .maybeSingle();

  if (response.error && isMissingColumnError(response.error, "auth_user_id")) {
    response = await eurasAdmin
      .from("perfis")
      .select("id, papel, email")
      .eq("email", email)
      .limit(1)
      .maybeSingle();
  }

  if (response.error) throw response.error;

  return response.data ?? null;
}

async function upsertProfileWithCompatibility(
  eurasAdmin: any,
  payload: Record<string, unknown>,
) {
  const withAuthUserId = {
    ...payload,
    auth_user_id: payload.id,
  };

  let response = await eurasAdmin
    .from("perfis")
    .upsert(withAuthUserId, { onConflict: "id" })
    .select("id")
    .single();

  if (!response.error) return response;

  if (!isMissingColumnError(response.error, "auth_user_id")) {
    return response;
  }

  response = await eurasAdmin
    .from("perfis")
    .upsert(payload, { onConflict: "id" })
    .select("id")
    .single();

  return response;
}

async function updateProfileEmailConflictIfNeeded(
  eurasAdmin: any,
  existingProfile: any,
  targetAuthUserId: string,
) {
  if (!existingProfile?.id) return;

  const existingRole = normalizeText(existingProfile.papel).toLowerCase();

  if (existingRole && existingRole !== "aluno") {
    throw new ApiError(
      409,
      "user_already_exists",
      "Este e-mail ja esta cadastrado para outro usuario.",
    );
  }

  if (existingProfile.id !== targetAuthUserId) {
    const { error } = await eurasAdmin
      .from("perfis")
      .delete()
      .eq("id", existingProfile.id)
      .eq("email", existingProfile.email);

    if (error) throw error;
  }
}

async function upsertLegacyStudentIfPresent(
  eurasAdmin: any,
  studentId: string,
  payload: Record<string, unknown>,
) {
  const legacyPayload = {
    id: studentId,
    nome_completo: payload.nome_completo,
    telefone: payload.telefone ?? "",
    email: payload.email ?? "",
    campus: payload.campus,
    curso: payload.curso,
    data_entrada: payload.data_entrada,
    ativo: true,
  };

  let response = await eurasAdmin
    .from("alunos")
    .upsert(legacyPayload, { onConflict: "id" });

  if (response.error && isMissingColumnError(response.error, "campus")) {
    const fallbackPayload = {
      ...legacyPayload,
      sede: legacyPayload.campus,
    } as Record<string, unknown>;

    delete fallbackPayload.campus;

    response = await eurasAdmin
      .from("alunos")
      .upsert(fallbackPayload, { onConflict: "id" });
  }

  if (response.error && !isMissingRelationError(response.error)) {
    throw response.error;
  }
}

async function rollbackStudentCreation(
  eurasAdmin: any,
  adminClient: any,
  profileId: string | null,
  legacyStudentId: string | null,
  authUserId: string | null,
) {
  if (legacyStudentId) {
    const { error } = await eurasAdmin
      .from("alunos")
      .delete()
      .eq("id", legacyStudentId);

    if (error && !isMissingRelationError(error)) {
      console.error("Falha ao reverter aluno legado apos erro.", error);
    }
  }

  if (profileId) {
    const { error } = await eurasAdmin
      .from("perfis")
      .delete()
      .eq("id", profileId);

    if (error) {
      console.error("Falha ao reverter perfil apos erro.", error);
    }
  }

  if (authUserId) {
    const { error } = await adminClient.auth.admin.deleteUser(authUserId);

    if (error) {
      console.error("Falha ao reverter usuario Auth apos erro.", error);
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: "method_not_allowed",
          message: "Metodo nao permitido.",
        },
      },
      405,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: "server_misconfigured",
          message: "Segredos do Supabase nao configurados para a funcao.",
        },
      },
      500,
    );
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return jsonResponse(
      {
        ok: false,
        error: {
          code: "unauthorized",
          message: "Sessao invalida. Faca login novamente.",
        },
      },
      401,
    );
  }

  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        Authorization: authHeader,
      },
    },
  });

  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const eurasAdmin = adminClient.schema("euras");

  let createdAuthUserId: string | null = null;
  let createdProfileId: string | null = null;
  let createdLegacyStudentId: string | null = null;

  try {
    const { data: authData, error: authError } =
      await userClient.auth.getUser(token);

    if (authError || !authData.user?.id) {
      throw new ApiError(
        401,
        "unauthorized",
        "Sessao invalida. Faca login novamente.",
      );
    }

    await ensureAdminCaller(userClient, authData.user.id);

    let payload: Record<string, unknown>;

    try {
      payload = (await req.json()) as Record<string, unknown>;
    } catch {
      throw new ApiError(
        400,
        "invalid_json",
        "Payload invalido. Envie JSON valido.",
      );
    }

    const nomeCompleto = normalizeUpper(payload.nome_completo);
    const telefone = normalizeText(payload.telefone);
    const email = normalizeEmail(payload.email);
    const senha = normalizeText(payload.senha);
    const campus = normalizeUpper(payload.campus);
    const curso = normalizeUpper(payload.curso);
    const dataEntrada = normalizeText(payload.data_entrada);

    if (!nomeCompleto) {
      throw new ApiError(400, "validation_error", "Informe o nome do aluno.");
    }

    if (!email) {
      throw new ApiError(400, "validation_error", "Informe o e-mail.");
    }

    if (!senha || senha.length < 6) {
      throw new ApiError(
        400,
        "validation_error",
        "A senha deve ter no minimo 6 caracteres.",
      );
    }

    if (!campus || !curso || !dataEntrada) {
      throw new ApiError(
        400,
        "validation_error",
        "Informe campus, curso e data de entrada.",
      );
    }

    const createAuthPayload = {
      email,
      password: senha,
      email_confirm: true,
      app_metadata: {
        role: "aluno",
        papel: "aluno",
      },
      user_metadata: {
        name: nomeCompleto,
        full_name: nomeCompleto,
        role: "aluno",
        papel: "aluno",
      },
    };

    const updateAuthPayload ={
      email,
      password: senha,
      email_confirm: true,
       app_metadata: {
        role: "aluno",
        papel: "aluno",
       },
       user_metadata: {
        name: nomeCompleto,
        full_name: nomeCompleto,
        role: "aluno",
        papel: "aluno",
       }
    }

    const existingAuthUser = await findAuthUserByEmail(adminClient, email);

    let authUserId = String(existingAuthUser?.id ?? "");

    if (authUserId) {
      const { error } = await adminClient.auth.admin.updateUserById(
        authUserId,
        updateAuthPayload,
      );

      if (error) throw error;
    } else {
      const { data, error } = await adminClient.auth.admin.createUser(
        createAuthPayload,  
      );

      if (error) throw error;

      authUserId = String(data?.user?.id ?? "");
      createdAuthUserId = authUserId || null;
    }

    if (!authUserId) {
      throw new ApiError(
        500,
        "auth_user_id_missing",
        "Nao foi possivel obter o id do usuario criado no Auth.",
      );
    }

    const existingProfile = await getProfileByEmail(eurasAdmin, email);

    await updateProfileEmailConflictIfNeeded(
      eurasAdmin,
      existingProfile,
      authUserId,
    );

    const profilePayload = {
      id: authUserId,
      nome_completo: nomeCompleto,
      papel: "aluno",
      telefone,
      email,
      campus,
      curso,
      data_entrada: dataEntrada,
      ativo: true,
    };

    const { data: profileRow, error: profileError } =
      await upsertProfileWithCompatibility(eurasAdmin, profilePayload);

    if (profileError) throw profileError;

    const profileId = String(profileRow.id);
    createdProfileId = createdAuthUserId ? profileId : null;

    await upsertLegacyStudentIfPresent(eurasAdmin, profileId, profilePayload);
    createdLegacyStudentId = createdAuthUserId ? profileId : null;

    return jsonResponse(
      {
        ok: true,
        message: "Aluno cadastrado com sucesso.",
        studentId: profileId,
        profileId,
        authUserId,
      },
      201,
    );
  } catch (error) {
    if (createdAuthUserId) {
      await rollbackStudentCreation(
        eurasAdmin,
        adminClient,
        createdProfileId,
        createdLegacyStudentId,
        createdAuthUserId,
      );
    }

    const mapped = mapUnknownError(error);

    return jsonResponse(
      {
        ok: false,
        error: {
          code: mapped.code,
          message: mapped.message,
          details: mapped.details ?? null,
          hint: mapped.hint ?? null,
        },
      },
      mapped.status,
    );
  }
});