import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type DaySchedule = {
  open: boolean;
  openHour: string;
  openMinute: string;
  closeHour: string;
  closeMinute: string;
};

type WeeklySchedule = {
  week: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
};

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

const DEFAULT_SCHEDULE: WeeklySchedule = {
  week: {
    open: true,
    openHour: "06",
    openMinute: "00",
    closeHour: "18",
    closeMinute: "00",
  },
  saturday: {
    open: true,
    openHour: "08",
    openMinute: "00",
    closeHour: "13",
    closeMinute: "00",
  },
  sunday: {
    open: false,
    openHour: "00",
    openMinute: "00",
    closeHour: "00",
    closeMinute: "00",
  },
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

function normalizeEmail(value: unknown) {
  return normalizeText(value).toLowerCase();
}

function normalizeHour(value: unknown) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return "00";
  return String(Math.max(0, Math.min(23, numeric))).padStart(2, "0");
}

function normalizeMinute(value: unknown) {
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return "00";
  return String(Math.max(0, Math.min(59, numeric))).padStart(2, "0");
}

function normalizeSchedule(input: unknown): WeeklySchedule {
  const source =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};

  const normalizeItem = (
    key: "week" | "saturday" | "sunday",
    fallbackOpen: boolean,
  ): DaySchedule => {
    const rawItem =
      typeof source[key] === "object" && source[key] !== null
        ? (source[key] as Record<string, unknown>)
        : {};

    return {
      open: typeof rawItem.open === "boolean" ? rawItem.open : fallbackOpen,
      openHour: normalizeHour(rawItem.openHour ?? "06"),
      openMinute: normalizeMinute(rawItem.openMinute ?? "00"),
      closeHour: normalizeHour(rawItem.closeHour ?? "18"),
      closeMinute: normalizeMinute(rawItem.closeMinute ?? "00"),
    };
  };

  return {
    week: normalizeItem("week", DEFAULT_SCHEDULE.week.open),
    saturday: normalizeItem("saturday", DEFAULT_SCHEDULE.saturday.open),
    sunday: normalizeItem("sunday", DEFAULT_SCHEDULE.sunday.open),
  };
}

function asTimeString(hour: unknown, minute: unknown) {
  return `${normalizeHour(hour)}:${normalizeMinute(minute)}:00`;
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

function isInvalidPartnerTypeError(error: unknown) {
  const message = String(
    (error as { message?: string })?.message ?? "",
  ).toLowerCase();
  return message.includes("invalid input value for enum tipo_parceiro");
}

function isEmailAlreadyExistsError(error: unknown) {
  const code = String((error as { code?: string })?.code ?? "").toLowerCase();
  const message = String(
    (error as { message?: string })?.message ?? "",
  ).toLowerCase();

  return (
    code === "user_already_exists" ||
    code === "email_exists" ||
    message.includes("already registered") ||
    message.includes("already exists") ||
    message.includes("email already") ||
    message.includes("duplicate key value")
  );
}

function buildPartnerTypeCandidates(name: string) {
  const normalizedName = name.toLowerCase();
  const isCeeds = normalizedName.startsWith("ceeds");
  const prioritized = isCeeds
    ? ["ceeds", "CEEDS", "grupo_ceeds", "institucional", "interno"]
    : ["externo", "EXTERNO", "parceiro_externo", "conveniado"];

  return [...new Set(prioritized)];
}

async function authUserExistsByEmail(adminClient: any, email: string) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await adminClient.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      throw error;
    }

    const users = data?.users ?? [];
    const found = users.some(
      (user: { email?: string | null }) =>
        normalizeEmail(user?.email ?? "") === email,
    );

    if (found) {
      return true;
    }

    if (users.length < perPage) {
      return false;
    }

    page += 1;
  }
}

async function countRows(
  eurasAdmin: any,
  tableName: string,
  columnName: string,
  value: string,
) {
  const { count, error } = await eurasAdmin
    .from(tableName)
    .select("id", { count: "exact", head: true })
    .eq(columnName, value);

  if (error) {
    if (isMissingRelationError(error)) {
      return 0;
    }

    throw error;
  }

  return count ?? 0;
}

async function canReuseProfile(
  eurasAdmin: any,
  profile: {
    id: string;
    papel: string;
    auth_user_id: string | null;
  },
) {
  if (
    profile.auth_user_id ||
    profile.papel === "admin" ||
    profile.papel === "parceiro"
  ) {
    return false;
  }

  const [partners, students, products, rescues, wallet] = await Promise.all([
    countRows(eurasAdmin, "parceiros", "perfil_parceiro_id", profile.id),
    countRows(eurasAdmin, "alunos", "id", profile.id),
    countRows(eurasAdmin, "produtos", "perfil_parceiro_id", profile.id),
    countRows(eurasAdmin, "resgates", "aluno_id", profile.id),
    countRows(eurasAdmin, "razao_carteira", "aluno_id", profile.id),
  ]);

  return partners + students + products + rescues + wallet === 0;
}

async function removeReusableProfile(eurasAdmin: any, email: string) {
  const { data: profile, error } = await eurasAdmin
    .from("perfis")
    .select("id, papel, auth_user_id")
    .eq("email", email)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!profile?.id) {
    return;
  }

  if (!(await canReuseProfile(eurasAdmin, profile))) {
    throw new ApiError(
      409,
      "user_already_exists",
      "Este e-mail ja esta cadastrado para outro usuario.",
    );
  }

  const { error: deleteError } = await eurasAdmin
    .from("perfis")
    .delete()
    .eq("id", profile.id)
    .is("auth_user_id", null)
    .eq("email", email);

  if (deleteError) {
    throw deleteError;
  }
}

function mapUnknownError(error: unknown) {
  if (error instanceof ApiError) {
    return error;
  }

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
      "Falha ao criar parceiro no servidor.",
  );

  return new ApiError(
    400,
    code || "partner_create_failed",
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
      "Somente admins podem cadastrar parceiro.",
    );
  }
}

async function insertProfileWithCompatibility(
  eurasAdmin: any,
  payload: Record<string, unknown>,
) {
  const withAuthUserId = {
    ...payload,
    auth_user_id: payload.id,
  };

  const withAuthResponse = await eurasAdmin
    .from("perfis")
    .insert(withAuthUserId)
    .select("id")
    .single();

  if (!withAuthResponse.error) {
    return withAuthResponse;
  }

  if (!isMissingColumnError(withAuthResponse.error, "auth_user_id")) {
    return withAuthResponse;
  }

  return eurasAdmin.from("perfis").insert(payload).select("id").single();
}

async function upsertProfileWithCompatibility(
  eurasAdmin: any,
  payload: Record<string, unknown>,
) {
  const authUserId = String(payload.auth_user_id ?? payload.id ?? "").trim();

  if (authUserId) {
    const existingByAuthResponse = await eurasAdmin
      .from("perfis")
      .select("id")
      .eq("auth_user_id", authUserId)
      .limit(1)
      .maybeSingle();

    if (
      existingByAuthResponse.error &&
      !isMissingColumnError(existingByAuthResponse.error, "auth_user_id")
    ) {
      return existingByAuthResponse;
    }

    let existingProfileId =
      (existingByAuthResponse.data?.id as string | undefined) ?? null;

    if (!existingProfileId) {
      const existingByIdResponse = await eurasAdmin
        .from("perfis")
        .select("id")
        .eq("id", authUserId)
        .limit(1)
        .maybeSingle();

      if (existingByIdResponse.error) {
        return existingByIdResponse;
      }

      existingProfileId =
        (existingByIdResponse.data?.id as string | undefined) ?? null;
    }

    if (!existingProfileId && payload.email) {
      const existingByEmailResponse = await eurasAdmin
        .from("perfis")
        .select("id")
        .eq("email", String(payload.email))
        .limit(1)
        .maybeSingle();

      if (existingByEmailResponse.error) {
        return existingByEmailResponse;
      }

      existingProfileId =
        (existingByEmailResponse.data?.id as string | undefined) ?? null;
    }

    if (existingProfileId) {
      const updatePayload = {
        ...payload,
        auth_user_id: authUserId,
      };
      delete updatePayload.id;

      let updateResponse = await eurasAdmin
        .from("perfis")
        .update(updatePayload)
        .eq("id", existingProfileId)
        .select("id")
        .single();

      if (
        updateResponse.error &&
        isMissingColumnError(updateResponse.error, "auth_user_id")
      ) {
        delete updatePayload.auth_user_id;
        updateResponse = await eurasAdmin
          .from("perfis")
          .update(updatePayload)
          .eq("id", existingProfileId)
          .select("id")
          .single();
      }

      return updateResponse;
    }
  }

  return insertProfileWithCompatibility(eurasAdmin, payload);
}

async function insertPartnerWithCompatibleType(
  eurasAdmin: any,
  payload: Record<string, unknown>,
) {
  const typeCandidates = buildPartnerTypeCandidates(
    String(payload.nome_instituicao ?? ""),
  );
  let lastEnumError: unknown = null;

  for (const candidate of typeCandidates) {
    const { data, error } = await eurasAdmin
      .from("parceiros")
      .insert({
        ...payload,
        tipo: candidate,
      })
      .select("id")
      .single();

    if (!error) {
      return { data, error: null };
    }

    if (isInvalidPartnerTypeError(error)) {
      lastEnumError = error;
      continue;
    }

    return { data: null, error };
  }

  const fallback = await eurasAdmin
    .from("parceiros")
    .insert(payload)
    .select("id")
    .single();

  if (
    fallback.error &&
    lastEnumError &&
    isInvalidPartnerTypeError(fallback.error)
  ) {
    return { data: null, error: lastEnumError };
  }

  return fallback;
}

async function upsertPartnerWithCompatibility(
  eurasAdmin: any,
  basePayload: Record<string, unknown>,
) {
  const profileId = String(basePayload.perfil_parceiro_id ?? "");

  const findExistingPartnerByProfile = async () =>
    eurasAdmin
      .from("parceiros")
      .select("id")
      .eq("perfil_parceiro_id", profileId)
      .limit(1)
      .maybeSingle();

  const updateAttempt = async (
    partnerId: string,
    payload: Record<string, unknown>,
  ) =>
    eurasAdmin
      .from("parceiros")
      .update(payload)
      .eq("id", partnerId)
      .select("id")
      .limit(1)
      .maybeSingle();

  let payload = { ...basePayload };
  const existingPartnerResponse = await findExistingPartnerByProfile();

  if (existingPartnerResponse.error) {
    return { partnerId: null, error: existingPartnerResponse.error };
  }

  const existingPartnerId =
    (existingPartnerResponse.data?.id as string | undefined) ?? null;

  if (existingPartnerId) {
    let updateResponse = await updateAttempt(existingPartnerId, payload);

    if (
      updateResponse.error &&
      isMissingColumnError(updateResponse.error, "perfil_id")
    ) {
      payload = { ...payload };
      delete payload.perfil_id;
      updateResponse = await updateAttempt(existingPartnerId, payload);
    }

    if (updateResponse.error) {
      return { partnerId: null, error: updateResponse.error };
    }

    return { partnerId: existingPartnerId, error: null };
  }

  let insertResponse = await insertPartnerWithCompatibleType(eurasAdmin, payload);

  if (
    insertResponse.error &&
    isMissingColumnError(insertResponse.error, "perfil_id")
  ) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.perfil_id;
    insertResponse = await insertPartnerWithCompatibleType(
      eurasAdmin,
      fallbackPayload,
    );
  }

  if (!insertResponse.error && insertResponse.data?.id) {
    return {
      partnerId: insertResponse.data.id as string,
      error: null,
    };
  }

  const partnerAfterInsertResponse = await findExistingPartnerByProfile();

  if (partnerAfterInsertResponse.error) {
    return { partnerId: null, error: partnerAfterInsertResponse.error };
  }

  return {
    partnerId:
      (partnerAfterInsertResponse.data?.id as string | undefined) ?? null,
    error: insertResponse.error,
  };
}

async function replacePartnerSchedule(
  eurasAdmin: any,
  partnerId: string,
  schedule: WeeklySchedule,
) {
  const buildSafeRow = (
    day: number,
    item: DaySchedule,
  ) => {
    const isOpen = Boolean(item.open);
    const opensAt = asTimeString(item.openHour, item.openMinute);
    const closesAt = asTimeString(item.closeHour, item.closeMinute);

    if (isOpen && opensAt >= closesAt) {
      throw new ApiError(
        400,
        "validation_error",
        "Horario de funcionamento invalido. A abertura deve ser antes do fechamento.",
      );
    }

    return {
      parceiro_id: partnerId,
      dia_semana: day,
      abre_as: isOpen ? opensAt : null,
      fecha_as: isOpen ? closesAt : null,
      fechado: !isOpen,
    };
  };

  const rows = [
    buildSafeRow(1, schedule.week),
    buildSafeRow(2, schedule.week),
    buildSafeRow(3, schedule.week),
    buildSafeRow(4, schedule.week),
    buildSafeRow(5, schedule.week),
    buildSafeRow(6, schedule.saturday),
    buildSafeRow(0, schedule.sunday),
  ];

  const { error: deleteError } = await eurasAdmin
    .from("parceiro_horarios_funcionamento")
    .delete()
    .eq("parceiro_id", partnerId);

  if (deleteError) {
    if (isMissingRelationError(deleteError)) {
      return;
    }

    throw deleteError;
  }

  const { error: insertError } = await eurasAdmin
    .from("parceiro_horarios_funcionamento")
    .insert(rows);

  if (insertError) {
    throw insertError;
  }
}

async function rollbackPartnerCreation(
  eurasAdmin: any,
  adminClient: any,
  profileId: string | null,
  partnerId: string | null,
  authUserId: string | null,
) {
  if (partnerId) {
    const { error: removePartnerError } = await eurasAdmin
      .from("parceiros")
      .delete()
      .eq("id", partnerId);

    if (removePartnerError && !isMissingRelationError(removePartnerError)) {
      console.error(
        "Falha ao reverter parceiro apos erro de cadastro.",
        removePartnerError,
      );
    }
  }

  if (profileId) {
    const { error: removeProfileError } = await eurasAdmin
      .from("perfis")
      .delete()
      .eq("id", profileId);

    if (removeProfileError) {
      console.error(
        "Falha ao reverter perfil apos erro de cadastro.",
        removeProfileError,
      );
    }
  }

  if (authUserId) {
    const { error: removeAuthError } =
      await adminClient.auth.admin.deleteUser(authUserId);

    if (removeAuthError) {
      console.error(
        "Falha ao reverter usuario Auth apos erro de cadastro.",
        removeAuthError,
      );
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
  let createdPartnerId: string | null = null;

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

    const nomeInstituicao = normalizeText(
      payload.nome_instituicao,
    ).toUpperCase();
    const nomeUsuario = normalizeText(payload.nome_usuario).toUpperCase();
    const numero = normalizeText(payload.numero);
    const email = normalizeEmail(payload.email);
    const senha = normalizeText(payload.senha);
    const campus = normalizeText(payload.campus).toUpperCase();
    const imageUrl = normalizeText(payload.image_url);
    const schedule = normalizeSchedule(payload.schedule);

    if (!nomeInstituicao) {
      throw new ApiError(
        400,
        "validation_error",
        "Informe o nome da instituicao.",
      );
    }

    if (!nomeUsuario) {
      throw new ApiError(
        400,
        "validation_error",
        "Informe o nome do usuario responsavel.",
      );
    }

    if (!numero) {
      throw new ApiError(
        400,
        "validation_error",
        "Informe o numero do parceiro.",
      );
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

    const authUserExists = await authUserExistsByEmail(adminClient, email);
    if (authUserExists) {
      throw new ApiError(
        409,
        "user_already_exists",
        "Este e-mail ja esta cadastrado para outro usuario.",
      );
    }

    await removeReusableProfile(eurasAdmin, email);

    const { data: createdUser, error: createUserError } =
      await adminClient.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true,
        app_metadata: {
          role: "parceiro",
          papel: "parceiro",
        },
        user_metadata: {
          name: nomeUsuario,
          full_name: nomeUsuario,
          role: "parceiro",
          papel: "parceiro",
        },
      });

    if (createUserError) {
      if (isEmailAlreadyExistsError(createUserError)) {
        throw new ApiError(
          409,
          "user_already_exists",
          "Este e-mail ja esta cadastrado para outro usuario.",
        );
      }

      throw createUserError;
    }

    const authUserId = createdUser?.user?.id;
    if (!authUserId) {
      throw new ApiError(
        500,
        "auth_user_id_missing",
        "Nao foi possivel obter o id do usuario criado no Auth.",
      );
    }

    createdAuthUserId = authUserId;

    const { data: profileRow, error: profileError } =
      await upsertProfileWithCompatibility(eurasAdmin, {
        id: authUserId,
        nome_completo: nomeUsuario,
        papel: "parceiro",
        telefone: numero,
        email,
        campus,
        url_avatar: imageUrl,
        ativo: true,
      });

    if (profileError) {
      throw profileError;
    }

    const profileId = String(profileRow.id);
    createdProfileId = profileId;

    const partnerPayload = {
      perfil_parceiro_id: profileId,
      perfil_id: profileId,
      nome_instituicao: nomeInstituicao,
      usuario_responsavel_nome: nomeUsuario,
      telefone: numero,
      email,
      campus,
      url_imagem: imageUrl,
      ativo: true,
    };

    const partnerUpsert = await upsertPartnerWithCompatibility(
      eurasAdmin,
      partnerPayload,
    );

    let partnerTableMissing = false;
    let partnerId = profileId;

    if (partnerUpsert.error) {
      if (isMissingRelationError(partnerUpsert.error)) {
        partnerTableMissing = true;
      } else {
        throw partnerUpsert.error;
      }
    } else if (partnerUpsert.partnerId) {
      partnerId = partnerUpsert.partnerId;
      createdPartnerId = partnerId;
      await replacePartnerSchedule(eurasAdmin, partnerId, schedule);
    }

    return jsonResponse(
      {
        ok: true,
        message: "Parceiro cadastrado com sucesso.",
        partnerId,
        profileId,
        partnerTableMissing,
      },
      201,
    );
  } catch (error) {
    if (createdProfileId || createdPartnerId || createdAuthUserId) {
      await rollbackPartnerCreation(
        eurasAdmin,
        adminClient,
        createdProfileId,
        createdPartnerId,
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
