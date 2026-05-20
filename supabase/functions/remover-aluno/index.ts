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

function isMissingRelationError(error: unknown) {
  const code = String((error as { code?: string })?.code ?? "");
  const message = String(
    (error as { message?: string })?.message ?? "",
  ).toLowerCase();

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

function isAuthUserNotFoundError(error: unknown) {
  const status = Number((error as { status?: number })?.status ?? 0);
  const code = String((error as { code?: string })?.code ?? "").toLowerCase();
  const message = String(
    (error as { message?: string })?.message ?? "",
  ).toLowerCase();

  return (
    status === 404 ||
    code.includes("not_found") ||
    message.includes("user not found") ||
    message.includes("not found")
  );
}

function mapUnknownError(error: unknown) {
  if (error instanceof ApiError) {
    return error;
  }

  const code = String((error as { code?: string })?.code ?? "");
  const details = String((error as { details?: string })?.details ?? "");
  const hint = String((error as { hint?: string })?.hint ?? "");
  const message = String(
    (error as { message?: string })?.message ??
      "Falha ao remover aluno no servidor.",
  );

  return new ApiError(
    400,
    code || "student_remove_failed",
    message,
    details || null,
    hint || null,
  );
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

  if (response.error) {
    throw response.error;
  }

  if (!response.data?.id) {
    throw new ApiError(
      403,
      "forbidden",
      "Somente admins podem remover aluno.",
    );
  }
}

async function findStudentProfile(eurasAdmin: any, studentId: string) {
  let response = await eurasAdmin
    .from("perfis")
    .select("id, papel, auth_user_id")
    .or(`id.eq.${studentId},auth_user_id.eq.${studentId}`)
    .eq("papel", "aluno")
    .limit(1)
    .maybeSingle();

  if (response.error && isMissingColumnError(response.error, "auth_user_id")) {
    response = await eurasAdmin
      .from("perfis")
      .select("id, papel")
      .eq("id", studentId)
      .eq("papel", "aluno")
      .limit(1)
      .maybeSingle();
  }

  if (response.error) {
    throw response.error;
  }

  return response.data ?? null;
}

async function deleteLegacyStudentIfPresent(eurasAdmin: any, profileId: string) {
  const { error } = await eurasAdmin
    .from("alunos")
    .delete()
    .eq("id", profileId);

  if (error && !isMissingRelationError(error)) {
    throw error;
  }
}

async function deleteStudentProfile(eurasAdmin: any, profileId: string) {
  const { data, error } = await eurasAdmin
    .from("perfis")
    .delete()
    .eq("id", profileId)
    .eq("papel", "aluno")
    .select("id")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data?.id) {
    throw new ApiError(404, "student_not_found", "Aluno nao encontrado.");
  }
}

async function deleteAuthUserIfPresent(adminClient: any, authUserId: string | null) {
  if (!authUserId) {
    return;
  }

  const { error } = await adminClient.auth.admin.deleteUser(authUserId);
  if (error && !isAuthUserNotFoundError(error)) {
    throw error;
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

    const studentId = normalizeText(
      payload.studentId ?? payload.aluno_id ?? payload.profileId ?? payload.perfil_id,
    );

    if (!studentId) {
      throw new ApiError(400, "validation_error", "Informe o aluno.");
    }

    const profile = await findStudentProfile(eurasAdmin, studentId);
    if (!profile?.id) {
      throw new ApiError(404, "student_not_found", "Aluno nao encontrado.");
    }

    const profileId = String(profile.id);
    const authUserId = normalizeText(profile.auth_user_id) || profileId;

    await deleteLegacyStudentIfPresent(eurasAdmin, profileId);
    await deleteStudentProfile(eurasAdmin, profileId);
    await deleteAuthUserIfPresent(adminClient, authUserId);

    return jsonResponse({
      ok: true,
      message: "Aluno removido com sucesso.",
      studentId: profileId,
    });
  } catch (error) {
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
