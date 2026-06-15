const PARTNER_USERNAME_COLUMNS = [
  'usuario_responsavel_nome',
  'nome_usuario',
  'nome',
  'username',
]
const PROFILE_COLUMNS_WITH_AUTH = 'id, auth_user_id, nome_completo, telefone, email, campus, papel, ativo'
const PROFILE_COLUMNS = 'id, nome_completo, telefone, email, campus, papel, ativo'

function isMissingColumnError(error, columnName) {
  const joined = [
    String(error?.message ?? ''),
    String(error?.details ?? ''),
    String(error?.hint ?? ''),
  ]
    .join(' ')
    .toLowerCase()

  return joined.includes('column') && joined.includes(String(columnName).toLowerCase())
}

function mapPartnerRow(partnerRow) {
  if (!partnerRow) return null

  const username = PARTNER_USERNAME_COLUMNS
    .map((column) => partnerRow?.[column])
    .find((value) => typeof value === 'string' && value.trim()) ?? ''

  return {
    ...partnerRow,
    usuario_responsavel_nome: username,
  }
}

function mapProfileAsPartnerFallback(profile) {
  if (!profile) return null

  const fallbackName = String(profile.nome_completo ?? '').trim() || 'Parceiro'

  return mapPartnerRow({
    id: null,
    perfil_parceiro_id: profile.id,
    nome_instituicao: fallbackName,
    usuario_responsavel_nome: fallbackName,
    telefone: profile.telefone ?? null,
    email: profile.email ?? null,
    campus: profile.campus ?? null,
    ativo: profile.ativo ?? true,
  })
}

function normalizeNullableText(value) {
  const normalized = String(value ?? '').trim()
  return normalized || null
}

async function runProfileQuery(supabase, buildQuery) {
  let response = await buildQuery(PROFILE_COLUMNS_WITH_AUTH)

  if (response.error && isMissingColumnError(response.error, 'auth_user_id')) {
    response = await buildQuery(PROFILE_COLUMNS)
  }

  return response
}

async function resolveLoggedProfileByAuthUserId(supabase) {
  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) {
    throw authError
  }

  const authUserId = authData?.user?.id ?? null
  if (!authUserId) {
    throw new Error('Sessao expirada. Faca login novamente.')
  }

  const profileQuery = await supabase
    .schema('euras')
    .from('perfis')
    .select(PROFILE_COLUMNS_WITH_AUTH)
    .eq('auth_user_id', authUserId)
    .eq('papel', 'parceiro')
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (profileQuery.error && !isMissingColumnError(profileQuery.error, 'auth_user_id')) {
    throw profileQuery.error
  }

  let profile = profileQuery.data ?? null

  if (!profile) {
    const profileByIdQuery = await runProfileQuery(supabase, (columns) =>
      supabase
        .schema('euras')
        .from('perfis')
        .select(columns)
        .eq('id', authUserId)
        .eq('papel', 'parceiro')
        .eq('ativo', true)
        .limit(1)
        .maybeSingle(),
    )

    if (profileByIdQuery.error) {
      throw profileByIdQuery.error
    }

    profile = profileByIdQuery.data ?? null
  }

  const authEmail = String(authData?.user?.email ?? '').trim().toLowerCase()
  if (!profile && authEmail) {
    const profileByEmailQuery = await runProfileQuery(supabase, (columns) =>
      supabase
        .schema('euras')
        .from('perfis')
        .select(columns)
        .ilike('email', authEmail)
        .eq('papel', 'parceiro')
        .eq('ativo', true)
        .limit(1)
        .maybeSingle(),
    )

    if (profileByEmailQuery.error) {
      throw profileByEmailQuery.error
    }

    profile = profileByEmailQuery.data ?? null
  }

  if (!profile) {
    throw new Error('Perfil do parceiro nao encontrado. Faca login novamente.')
  }

  return {
    authUserId,
    profile,
  }
}

async function resolveLoggedPartnerProfile(supabase) {
  const { authUserId, profile } = await resolveLoggedProfileByAuthUserId(supabase)
  const partnerQuery = await supabase
    .schema('euras')
    .from('parceiros')
    .select('*')
    .eq('perfil_parceiro_id', profile.id)
    .limit(1)
    .maybeSingle()

  if (partnerQuery.error) {
    throw partnerQuery.error
  }

  const partner = mapPartnerRow(partnerQuery.data)
  const partnerForDisplay = partner ?? mapProfileAsPartnerFallback(profile)

  return {
    authUserId,
    profile,
    partner,
    data: {
      ...(partnerForDisplay ?? {}),
      perfil_id: profile.id,
      auth_user_id: profile.auth_user_id,
      nome_completo: profile.nome_completo ?? partnerForDisplay?.usuario_responsavel_nome ?? '',
      telefone: profile.telefone ?? partnerForDisplay?.telefone ?? null,
      email: profile.email ?? partnerForDisplay?.email ?? null,
      campus: profile.campus ?? partnerForDisplay?.campus ?? null,
    },
  }
}

async function findPartnerByProfileId(supabase, profileId) {
  if (!profileId) {
    return null
  }

  const partnerQuery = await supabase
    .schema('euras')
    .from('parceiros')
    .select('*')
    .eq('perfil_parceiro_id', profileId)
    .limit(1)
    .maybeSingle()

  if (partnerQuery.error) {
    throw partnerQuery.error
  }

  return mapPartnerRow(partnerQuery.data)
}

async function findProfileFallbackByProfileId(supabase, profileId) {
  if (!profileId) {
    return null
  }

  const profileQuery = await supabase
    .schema('euras')
    .from('perfis')
    .select('id, auth_user_id, nome_completo, telefone, email, campus, ativo')
    .eq('id', profileId)
    .limit(1)
    .maybeSingle()

  if (profileQuery.error) {
    throw profileQuery.error
  }

  return mapProfileAsPartnerFallback(profileQuery.data)
}

async function resolveLoggedPartnerContext(supabase) {
  const { profile } = await resolveLoggedProfileByAuthUserId(supabase)
  const profileId = profile?.id ?? null
  if (!profileId) {
    return { profileId: null, partner: null, partnerId: null }
  }

  const partnerByProfile = await findPartnerByProfileId(supabase, profileId)

  return {
    profileId,
    partner: partnerByProfile,
    partnerId: profileId,
  }
}

async function resolveLoggedPartnerWithDetails(supabase) {
  const context = await resolveLoggedPartnerContext(supabase)
  if (!context.profileId) return context

  if (context.partner) {
    return context
  }

  const partner = await findPartnerByProfileId(supabase, context.profileId)
  return {
    profileId: context.profileId,
    partner: partner ?? (await findProfileFallbackByProfileId(supabase, context.profileId)),
    // In euras.resgates, parceiro_id references euras.perfis.id.
    partnerId: context.profileId,
  }
}

export async function fetchParceiro(supabase) {
  try {
    const context = await resolveLoggedPartnerWithDetails(supabase)
    return { data: context.partner ?? null, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export async function fetchPerfilParceiroAtual(supabase) {
  try {
    const context = await resolveLoggedPartnerProfile(supabase)
    return { data: context.data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export async function fetchResgatesPendentes(supabase, parceiroProfileId = null, limit = null) {
  void parceiroProfileId
  try {
    const context = await resolveLoggedPartnerContext(supabase)
    if (!context.partnerId) {
      return { data: [], error: null }
    }

    let query = supabase
      .schema('euras')
      .from('resgates')
      .select(`
        id,
        valor_euras,
        criado_em,
        status,
        aluno:aluno_id ( nome_completo ),
        produto:produto_id ( titulo )
      `)
      .eq('parceiro_id', context.partnerId)
      .eq('status', 'pendente')
      .order('criado_em', { ascending: false })

    if (limit) query = query.limit(limit)

    const { data, error } = await query
    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export async function fetchResgates(supabase, parceiroProfileId = null, filtroStatus = null) {
  void parceiroProfileId
  try {
    const context = await resolveLoggedPartnerContext(supabase)
    if (!context.partnerId) {
      return { data: [], error: null }
    }

    let query = supabase
      .schema('euras')
      .from('resgates')
      .select(`
        id,
        valor_euras,
        criado_em,
        status,
        motivo_recusa,
        aluno:aluno_id ( nome_completo ),
        produto:produto_id ( titulo )
      `)
      .eq('parceiro_id', context.partnerId)
      .order('criado_em', { ascending: false })

    if (filtroStatus) {
      query = query.eq('status', filtroStatus)
    }

    const { data, error } = await query
    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

export async function fetchAtividadesParceiro(supabase, parceiroProfileId = null, limit = null) {
  void parceiroProfileId
  try {
    const context = await resolveLoggedPartnerContext(supabase)
    if (!context.partnerId) {
      return { data: [], error: null }
    }

    let query = supabase
      .schema('euras')
      .from('resgates')
      .select(`
        id,
        valor_euras,
        criado_em,
        status,
        aluno:aluno_id ( nome_completo ),
        produto:produto_id ( titulo )
      `)
      .eq('parceiro_id', context.partnerId)
      .order('criado_em', { ascending: false })

    if (limit) query = query.limit(limit)

    const { data, error } = await query
    return { data, error }
  } catch (error) {
    return { data: null, error }
  }
}

// Mantida por compatibilidade com outros arquivos
export async function fetchAtividadesConcedidas(supabase, parceiroProfileId, limit = null) {
  return fetchAtividadesParceiro(supabase, parceiroProfileId, limit)
}

async function recusarResgateComEstorno(supabase, resgateId, motivo) {
  const motivoRecusa = String(motivo ?? '').trim()

  if (!motivoRecusa) {
    return { data: null, error: new Error('Informe o motivo para recusar a solicitacao.') }
  }

  const { data, error } = await supabase
    .schema('euras')
    .rpc('recusar_resgate_parceiro', {
      p_resgate_id: resgateId,
      p_motivo: motivoRecusa,
    })

  return { data, error }
}

export async function atualizarStatusResgate(supabase, resgateId, novoStatus, userId, motivo = null) {
  const context = await resolveLoggedPartnerContext(supabase)
  const confirmedByProfileId = context.profileId ?? userId ?? null

  if (!confirmedByProfileId) {
    return { data: null, error: new Error('Sessao expirada. Faca login novamente.') }
  }

  if (novoStatus === 'cancelado') {
    return recusarResgateComEstorno(supabase, resgateId, motivo)
  }

  const campos = {
    status: novoStatus,
    confirmado_por: confirmedByProfileId,
    confirmado_em: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .schema('euras')
    .from('resgates')
    .update(campos)
    .eq('id', resgateId)

  return { data, error }
}

export async function fetchProdutos(supabase, apenasAtivos = false) {
  let query = supabase
    .schema('euras')
    .from('produtos')
    .select('*')
    .order('criado_em', { ascending: false })

  if (apenasAtivos) query = query.eq('ativo', true)

  const { data, error } = await query
  return { data, error }
}

export async function criarProduto(supabase, produto) {
  const basePayload = { ...produto }
  const partnerProfileId = basePayload.perfil_parceiro_id
  const partnerRowId = basePayload.parceiro_id

  delete basePayload.perfil_parceiro_id
  delete basePayload.parceiro_id

  const payloadCandidates = []

  if (partnerProfileId) {
    payloadCandidates.push({
      ...basePayload,
      perfil_parceiro_id: partnerProfileId,
    })
  }

  if (partnerRowId) {
    payloadCandidates.push({
      ...basePayload,
      parceiro_id: partnerRowId,
    })
  }

  if (payloadCandidates.length === 0) {
    payloadCandidates.push(basePayload)
  }

  let fallbackError = null

  for (const payload of payloadCandidates) {
    const { data, error } = await supabase
      .schema('euras')
      .from('produtos')
      .insert(payload)
      .select()
      .single()

    if (!error) {
      return { data, error: null }
    }

    const attemptedPartnerColumn = Object.keys(payload).find((key) =>
      ['perfil_parceiro_id', 'parceiro_id'].includes(key),
    )

    if (attemptedPartnerColumn && isMissingColumnError(error, attemptedPartnerColumn)) {
      fallbackError = error
      continue
    }

    return { data: null, error }
  }

  return { data: null, error: fallbackError }
}

export async function atualizarProduto(supabase, produtoId, campos) {
  const { data, error } = await supabase
    .schema('euras')
    .from('produtos')
    .update(campos)
    .eq('id', produtoId)
    .select()
    .maybeSingle()

  return { data, error }
}

export async function atualizarPerfil(supabase, campos) {
  try {
    const { profile, partner } = await resolveLoggedPartnerProfile(supabase)
    const normalizedName = String(
      campos?.nome ?? campos?.usuario_responsavel_nome ?? profile?.nome_completo ?? '',
    ).trim()

    if (!normalizedName) {
      throw new Error('Informe o nome de usuario.')
    }

    const normalizedPhone = normalizeNullableText(campos?.telefone)
    const normalizedCampus = normalizeNullableText(campos?.campus ?? profile?.campus)

    const profileUpdateQuery = await supabase
      .schema('euras')
      .from('perfis')
      .update({
        nome_completo: normalizedName,
        telefone: normalizedPhone,
        campus: normalizedCampus,
      })
      .eq('id', profile.id)
      .select('id')
      .limit(1)
      .maybeSingle()

    if (profileUpdateQuery.error) {
      throw profileUpdateQuery.error
    }

    if (!profileUpdateQuery.data?.id) {
      throw new Error('Perfil do parceiro nao encontrado para atualizacao.')
    }

    const partnerInstitutionName =
      String(campos?.nome_instituicao ?? partner?.nome_instituicao ?? normalizedName).trim() ||
      normalizedName

    if (partner) {
      const partnerUpdateQuery = await supabase
        .schema('euras')
        .from('parceiros')
        .update({
          nome_instituicao: partnerInstitutionName,
          usuario_responsavel_nome: normalizedName,
          telefone: normalizedPhone,
          campus: normalizedCampus,
        })
        .eq('perfil_parceiro_id', profile.id)
        .select('id')
        .limit(1)
        .maybeSingle()

      if (partnerUpdateQuery.error) {
        throw partnerUpdateQuery.error
      }

      if (!partnerUpdateQuery.data?.id) {
        throw new Error('Parceiro nao encontrado para atualizacao.')
      }
    }

    const refreshed = await resolveLoggedPartnerProfile(supabase)
    return { data: refreshed.data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

export function getParceiroDataErrorMessage(error) {
  const message = String(error?.message ?? '').trim()

  if (!message) {
    return 'Não foi possível carregar os dados do portal parceiro.'
  }

  const normalized = message
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

  if (normalized.includes('tempo limite')) {
    return 'Conexão com o banco demorou demais. Tente novamente em instantes.'
  }

  if (
    error?.code === 'over_email_send_rate_limit' ||
    error?.status === 429 ||
    normalized.includes('no new code') ||
    normalized.includes('codigo novo') ||
    normalized.includes('too many') ||
    normalized.includes('rate limit')
  ) {
    return 'O Supabase limitou o envio de codigos por seguranca. Aguarde alguns minutos antes de tentar novamente.'
  }

  if (error?.code === 'weak_password' || normalized.includes('weak password')) {
    return 'A senha informada e fraca. Use uma senha maior ou mais dificil de adivinhar.'
  }

  if (error?.code === 'reauthentication_needed') {
    return 'Por seguranca, faca login novamente antes de alterar a senha.'
  }

  if (normalized.includes('sessao expirada') || normalized.includes('sessao invalida')) {
    return 'Sua sessão expirou. Faça login novamente.'
  }

  if (
    normalized.includes('recusar_resgate_parceiro') ||
    normalized.includes('function') ||
    normalized.includes('funcao')
  ) {
    return 'Funcao de estorno do resgate nao encontrada. Aplique a migration de recusa com estorno no Supabase.'
  }

  if (normalized.includes('row-level security')) {
    return 'Sem permissão para esta operação. Verifique as políticas de acesso no Supabase.'
  }

  return message
}
