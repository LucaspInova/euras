import "@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FALLBACK_STUDENT_PASSWORD = "Euras@2026";

class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type Perfil = {
  id: string;
  email: string | null;
  papel: string;
  ativo: boolean;
  auth_user_id: string | null;
};

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new HttpError(500, "service_error", `Variavel ${name} nao configurada.`);
  return value;
}

function normalizeEmail(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function isValidEmail(value: string) {
  return /\S+@\S+\.\S+/.test(value);
}

function getStudentPassword() {
  const configured = Deno.env.get("EURAS_STUDENT_DEFAULT_PASSWORD")?.trim();
  return configured && configured.length >= 6 ? configured : FALLBACK_STUDENT_PASSWORD;
}

async function readJson(req: Request) {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "invalid_request", "JSON invalido.");
  }
}

async function findAuthUsersByEmail(adminClient: ReturnType<typeof createClient>, email: string) {
  const matches = [];
  const perPage = 1000;

  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new HttpError(500, "service_error", `Erro ao consultar usuarios Auth: ${error.message}`);
    }

    const users = data?.users ?? [];
    for (const user of users) {
      if (normalizeEmail(user.email) === email) matches.push(user);
    }

    if (users.length < perPage) break;
  }

  return matches;
}

function publicFailure(error: unknown) {
  if (error instanceof HttpError) {
    return {
      ok: false,
      code: error.code,
      message: error.message,
    };
  }

  return {
    ok: false,
    code: "service_error",
    message: "Nao foi possivel preparar o login do aluno.",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      throw new HttpError(405, "method_not_allowed", "Metodo nao permitido.");
    }

    const body = await readJson(req);
    const email = normalizeEmail(typeof body?.email === "string" ? body.email : "");
    const ensurePassword = body?.ensurePassword === true;

    if (!isValidEmail(email)) {
      throw new HttpError(400, "invalid_email", "E-mail invalido.");
    }

    const supabaseUrl = requiredEnv("SUPABASE_URL");
    const serviceRoleKey = requiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const adminDb = adminClient.schema("euras");

    const { data: perfisComEmail, error: perfisEmailError } = await adminDb
      .from("perfis")
      .select("id,email,papel,ativo,auth_user_id")
      .not("email", "is", null)
      .limit(10000);

    if (perfisEmailError) {
      throw new HttpError(500, "service_error", `Erro ao validar email: ${perfisEmailError.message}`);
    }

    const perfisMesmoEmail = ((perfisComEmail ?? []) as Perfil[]).filter(
      (perfil) => normalizeEmail(perfil.email) === email,
    );

    if (perfisMesmoEmail.length !== 1) {
      throw new HttpError(
        perfisMesmoEmail.length > 1 ? 409 : 403,
        perfisMesmoEmail.length > 1 ? "duplicate_profile_email" : "student_not_allowed",
        perfisMesmoEmail.length > 1
          ? "Email ja esta em uso por mais de um perfil."
          : "Aluno nao liberado para acesso ao app.",
      );
    }

    const aluno = perfisMesmoEmail[0];

    if (aluno.papel !== "aluno" || !aluno.ativo) {
      throw new HttpError(403, "student_not_allowed", "Aluno nao liberado para acesso ao app.");
    }

    const authUsersWithEmail = await findAuthUsersByEmail(adminClient, email);
    let authUser = null;

    if (aluno.auth_user_id) {
      const { data: linkedUserData, error: linkedUserError } =
        await adminClient.auth.admin.getUserById(aluno.auth_user_id);

      if (linkedUserError || !linkedUserData?.user) {
        throw new HttpError(409, "invalid_auth_link", "auth_user_id atual nao existe no Supabase Auth.");
      }

      const conflictingAuthUser = authUsersWithEmail.find((user) => user.id !== aluno.auth_user_id);
      if (conflictingAuthUser) {
        throw new HttpError(409, "duplicate_auth_email", "Email ja esta vinculado a outro usuario Auth.");
      }

      authUser = linkedUserData.user;
    } else {
      if (authUsersWithEmail.length > 1) {
        throw new HttpError(409, "duplicate_auth_email", "Email duplicado no Supabase Auth.");
      }

      authUser = authUsersWithEmail[0] ?? null;

      if (!authUser) {
        const { data: createdData, error: createError } =
          await adminClient.auth.admin.createUser({
            email,
            password: getStudentPassword(),
            email_confirm: true,
            app_metadata: { papel: "aluno" },
          });

        if (createError || !createdData?.user) {
          throw new HttpError(
            500,
            "service_error",
            `Erro ao criar usuario Auth: ${createError?.message ?? ""}`,
          );
        }

        authUser = createdData.user;
      }
    }

    const { data: perfisMesmoAuth, error: perfisAuthError } = await adminDb
      .from("perfis")
      .select("id")
      .eq("auth_user_id", authUser.id)
      .neq("id", aluno.id)
      .limit(1);

    if (perfisAuthError) {
      throw new HttpError(500, "service_error", `Erro ao validar vinculo Auth: ${perfisAuthError.message}`);
    }

    if (perfisMesmoAuth?.length) {
      throw new HttpError(409, "duplicate_auth_link", "Usuario Auth ja esta vinculado a outro perfil.");
    }

    const updatePayload = {
      email,
      email_confirm: true,
      app_metadata: {
        ...(authUser.app_metadata ?? {}),
        papel: "aluno",
      },
    };

    const userUpdatePayload = ensurePassword
      ? { ...updatePayload, password: getStudentPassword() }
      : updatePayload;

    const { data: updatedUserData, error: updateUserError } =
      await adminClient.auth.admin.updateUserById(authUser.id, userUpdatePayload);

    if (updateUserError || !updatedUserData?.user) {
      throw new HttpError(
        500,
        "service_error",
        `Erro ao atualizar usuario Auth: ${updateUserError?.message ?? ""}`,
      );
    }

    const { error: updatePerfilError } = await adminDb
      .from("perfis")
      .update({ auth_user_id: updatedUserData.user.id })
      .eq("id", aluno.id);

    if (updatePerfilError) {
      throw new HttpError(500, "service_error", `Erro ao atualizar perfil: ${updatePerfilError.message}`);
    }

    return jsonResponse(200, { ok: true });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("preparar-login-aluno-app error", error);
    return jsonResponse(200, publicFailure(error));
  }
});
