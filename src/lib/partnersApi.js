import { createClient } from '@supabase/supabase-js'
import { ensureFreshSession, supabase } from './supabase'

const euras = supabase.schema('euras')
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
let supabaseAdminClient = null

const DEFAULT_SCHEDULE = {
  week: { open: true, openHour: '06', openMinute: '00', closeHour: '18', closeMinute: '00' },
  saturday: { open: true, openHour: '08', openMinute: '00', closeHour: '13', closeMinute: '00' },
  sunday: { open: false, openHour: '00', openMinute: '00', closeHour: '00', closeMinute: '00' },
}
const PRODUCTS_CACHE_TTL_MS = 45000
let cachedCatalogProducts = null
const cachedPartnerProducts = new Map()
const inFlightProductRequests = new Map()

function makeCacheEntry(data) {
  return {
    data,
    expiresAt: Date.now() + PRODUCTS_CACHE_TTL_MS,
  }
}

function readCacheEntry(entry) {
  if (!entry) {
    return null
  }

  if (entry.expiresAt <= Date.now()) {
    return null
  }

  return entry.data
}

function getCachedCatalogProducts() {
  return readCacheEntry(cachedCatalogProducts)
}

function setCachedCatalogProducts(products) {
  cachedCatalogProducts = makeCacheEntry(products)
}

function getCachedPartnerProducts(partnerId) {
  return readCacheEntry(cachedPartnerProducts.get(String(partnerId)))
}

function setCachedPartnerProducts(partnerId, payload) {
  cachedPartnerProducts.set(String(partnerId), makeCacheEntry(payload))
}

function invalidateProductCaches(partnerId) {
  cachedCatalogProducts = null

  if (partnerId) {
    cachedPartnerProducts.delete(String(partnerId))
    return
  }

  cachedPartnerProducts.clear()
}

function runInFlightProductRequest(cacheKey, requestFactory) {
  const inFlightRequest = inFlightProductRequests.get(cacheKey)
  if (inFlightRequest) {
    return inFlightRequest
  }

  const requestPromise = requestFactory().finally(() => {
    if (inFlightProductRequests.get(cacheKey) === requestPromise) {
      inFlightProductRequests.delete(cacheKey)
    }
  })

  inFlightProductRequests.set(cacheKey, requestPromise)
  return requestPromise
}

function normalizeTypeToGroup(partner) {
  const type = String(partner?.type ?? '').toLowerCase()
  const name = String(partner?.name ?? '').toLowerCase()

  if (type.includes('ceeds') || name.startsWith('ceeds')) {
    return 'ceeds'
  }

  return 'external'
}

function normalizeLogo(partner) {
  if (normalizeTypeToGroup(partner) === 'ceeds') {
    return { logo: 'CEEDS', variant: 'light' }
  }

  const name = String(partner?.name ?? '')
  const loweredName = name.toLowerCase()

  if (loweredName.includes('studio')) {
    return { logo: 'Studio D', variant: 'black' }
  }

  if (loweredName.includes('otica')) {
    return { logo: 'OB', variant: 'blue' }
  }

  if (loweredName.includes('odonto')) {
    return { logo: 'OdontoCenter', variant: 'light' }
  }

  return { logo: name || 'Parceiro', variant: 'light' }
}

function normalizeHour(value) {
  const numericValue = Number(value)
  if (Number.isNaN(numericValue)) return '00'
  return String(Math.max(0, Math.min(23, numericValue))).padStart(2, '0')
}

function normalizeMinute(value) {
  const numericValue = Number(value)
  if (Number.isNaN(numericValue)) return '00'
  return String(Math.max(0, Math.min(59, numericValue))).padStart(2, '0')
}

function normalizeSchedule(schedule) {
  const source = schedule ?? {}

  const normalizeItem = (key, fallbackOpen) => {
    const item = source[key] ?? {}

    return {
      open: typeof item.open === 'boolean' ? item.open : fallbackOpen,
      openHour: normalizeHour(item.openHour ?? '06'),
      openMinute: normalizeMinute(item.openMinute ?? '00'),
      closeHour: normalizeHour(item.closeHour ?? '18'),
      closeMinute: normalizeMinute(item.closeMinute ?? '00'),
    }
  }

  return {
    week: normalizeItem('week', true),
    saturday: normalizeItem('saturday', true),
    sunday: normalizeItem('sunday', false),
  }
}

function cloneSchedule(schedule) {
  return normalizeSchedule(schedule)
}

function parseEurasValue(value) {
  if (typeof value === 'number') {
    return value
  }

  const raw = String(value ?? '').trim().replace(/\s+/g, '')
  if (!raw) return Number.NaN

  let normalized = raw

  if (raw.includes(',') && raw.includes('.')) {
    normalized = raw.replace(/\./g, '').replace(',', '.')
  } else if (raw.includes(',')) {
    normalized = raw.replace(',', '.')
  }

  return Number(normalized)
}

function isMissingRelationError(error) {
  const message = String(error?.message ?? '').toLowerCase()
  return error?.code === 'PGRST205' || message.includes('could not find the table') || message.includes('relation')
}

function isMissingColumnError(error, columnName) {
  const joined = [
    String(error?.message ?? '').toLowerCase(),
    String(error?.details ?? '').toLowerCase(),
    String(error?.hint ?? '').toLowerCase(),
  ].join(' ')

  return joined.includes(String(columnName ?? '').toLowerCase()) && joined.includes('column')
}

function getSupabaseAdminClient() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return null
  }

  if (!supabaseAdminClient) {
    supabaseAdminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    })
  }

  return supabaseAdminClient
}

function createPartnerSignupClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Variaveis do Supabase não foram configuradas para criar o usuário parceiro.')
  }

  let projectRef = 'supabase'

  try {
    projectRef = new URL(SUPABASE_URL).hostname.split('.')[0] || projectRef
  } catch {
    // Mantem fallback caso URL esteja malformada.
  }

  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: `sb-${projectRef}-partner-signup-${Date.now()}`,
    },
  })
}

async function createPartnerAuthUser({ email, password, displayName }) {
  const adminClient = getSupabaseAdminClient()

  if (adminClient) {
    const { data, error } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: displayName,
        full_name: displayName,
      },
    })

    if (error) {
      throw error
    }

    const authUserId = data?.user?.id
    if (!authUserId) {
      throw new Error('Não foi possível obter o identificador do usuário no Auth.')
    }

    return {
      userId: authUserId,
      deleteAuthUser: async () => {
        const { error: deleteError } = await adminClient.auth.admin.deleteUser(authUserId)
        if (deleteError) {
          throw deleteError
        }
      },
    }
  }

  const signupClient = createPartnerSignupClient()
  const { data, error } = await signupClient.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: displayName,
        full_name: displayName,
      },
    },
  })

  if (error) {
    throw error
  }

  const authUserId = data?.user?.id
  if (!authUserId) {
    throw new Error('Não foi possível obter o identificador do usuário criado no Auth.')
  }

  return {
    userId: authUserId,
    deleteAuthUser: null,
  }
}

async function insertPartnerProfileWithAuthId(profilePayload) {
  const payloadWithAuthUserId = {
    ...profilePayload,
    auth_user_id: profilePayload.id,
  }

  const responseWithAuthUserId = await euras
    .from('perfis')
    .insert(payloadWithAuthUserId)
    .select('id')
    .single()

  if (!responseWithAuthUserId.error) {
    return responseWithAuthUserId
  }

  if (!isMissingColumnError(responseWithAuthUserId.error, 'auth_user_id')) {
    return responseWithAuthUserId
  }

  return euras
    .from('perfis')
    .insert(profilePayload)
    .select('id')
    .single()
}

function ensureNumber(value, fallback = 0) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : fallback
}

function scheduleTimeToParts(value, fallbackHour, fallbackMinute) {
  const text = String(value ?? '')
  const [hour = fallbackHour, minute = fallbackMinute] = text.split(':')

  return {
    hour: normalizeHour(hour),
    minute: normalizeMinute(minute),
  }
}

function mapScheduleFromRows(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return cloneSchedule(DEFAULT_SCHEDULE)
  }

  const findFirst = (candidates) => rows.find((row) => candidates.includes(Number(row.dia_semana)))

  const weekRow = findFirst([0, 1, 2, 3, 4, 5])
  const saturdayRow = findFirst([6])
  const sundayRow = findFirst([7])

  const parseRow = (row, fallback) => {
    if (!row) {
      return { ...fallback }
    }

    const openParts = scheduleTimeToParts(row.abre_as, fallback.openHour, fallback.openMinute)
    const closeParts = scheduleTimeToParts(row.fecha_as, fallback.closeHour, fallback.closeMinute)

    return {
      open: !row.fechado,
      openHour: openParts.hour,
      openMinute: openParts.minute,
      closeHour: closeParts.hour,
      closeMinute: closeParts.minute,
    }
  }

  return {
    week: parseRow(weekRow, DEFAULT_SCHEDULE.week),
    saturday: parseRow(saturdayRow, DEFAULT_SCHEDULE.saturday),
    sunday: parseRow(sundayRow, DEFAULT_SCHEDULE.sunday),
  }
}

function mapPartner(row) {
  const mapped = {
    id: row.id,
    profileId: row.perfil_parceiro_id ?? row.profile_id ?? null,
    name: row.nome_instituicao ?? row.nome_completo ?? '',
    user: row.usuario_responsavel_nome ?? row.nome_completo ?? '',
    phone: row.telefone ?? '',
    email: row.email ?? '',
    campus: row.campus ?? '',
    imageUrl: row.url_imagem ?? row.url_avatar ?? '',
    type: row.tipo ?? 'externo',
    active: row.ativo ?? true,
  }

  const visual = normalizeLogo(mapped)

  return {
    id: mapped.id,
    profileId: mapped.profileId,
    name: mapped.name,
    user: mapped.user,
    phone: mapped.phone,
    email: mapped.email,
    campus: mapped.campus,
    imageUrl: mapped.imageUrl,
    group: normalizeTypeToGroup(mapped),
    logo: visual.logo,
    variant: visual.variant,
    active: mapped.active,
  }
}

function mapPartnerProduct(product, partnerName) {
  return {
    id: product.id,
    name: product.titulo ?? '',
    description: product.descricao ?? '',
    priceEuras: ensureNumber(product.preco_euras),
    imageUrl: product.url_imagem ?? '',
    partnerName,
  }
}

function mapCatalogProduct(product, institutionByProfileId) {
  return {
    id: product.id,
    name: product.titulo ?? '',
    institution: institutionByProfileId.get(product.perfil_parceiro_id) ?? 'Instituição não encontrada',
    description: product.descricao ?? '',
    priceEuras: ensureNumber(product.preco_euras),
    imageUrl: product.url_imagem ?? '',
  }
}

function asTimeString(hour, minute) {
  return `${normalizeHour(hour)}:${normalizeMinute(minute)}:00`
}

function isInvalidPartnerTypeError(error) {
  const message = String(error?.message ?? '').toLowerCase()
  return message.includes('invalid input value for enum tipo_parceiro')
}

function buildPartnerTypeCandidates(name) {
  const normalizedName = String(name ?? '').trim().toLowerCase()
  const isCeeds = normalizedName.startsWith('ceeds')

  const prioritized = isCeeds
    ? ['ceeds', 'CEEDS', 'grupo_ceeds', 'institucional', 'interno']
    : ['externo', 'EXTERNO', 'parceiro_externo', 'conveniado']

  return [...new Set(prioritized)]
}

async function insertPartnerWithCompatibleType(payload) {
  const typeCandidates = buildPartnerTypeCandidates(payload?.nome_instituicao)
  let lastEnumError = null

  for (const candidate of typeCandidates) {
    const { data, error } = await euras
      .from('parceiros')
      .insert({
        ...payload,
        tipo: candidate,
      })
      .select('id')
      .single()

    if (!error) {
      return { data, error: null }
    }

    if (isInvalidPartnerTypeError(error)) {
      lastEnumError = error
      continue
    }

    return { data: null, error }
  }

  const { data, error } = await euras
    .from('parceiros')
    .insert(payload)
    .select('id')
    .single()

  if (error && lastEnumError && isInvalidPartnerTypeError(error)) {
    return { data: null, error: lastEnumError }
  }

  return { data, error }
}

async function updatePartnerWithCompatibleType(partnerId, payload) {
  const typeCandidates = buildPartnerTypeCandidates(payload?.nome_instituicao)
  let lastEnumError = null

  for (const candidate of typeCandidates) {
    const { error } = await euras
      .from('parceiros')
      .update({
        ...payload,
        tipo: candidate,
      })
      .eq('id', partnerId)

    if (!error) {
      return { error: null }
    }

    if (isInvalidPartnerTypeError(error)) {
      lastEnumError = error
      continue
    }

    return { error }
  }

  const { error } = await euras
    .from('parceiros')
    .update(payload)
    .eq('id', partnerId)

  if (error && lastEnumError && isInvalidPartnerTypeError(error)) {
    return { error: lastEnumError }
  }

  return { error }
}

async function listPartnersFromProfiles() {
  const { data, error } = await euras
    .from('perfis')
    .select('id, nome_completo, telefone, email, campus, url_avatar, ativo')
    .eq('papel', 'parceiro')
    .eq('ativo', true)
    .order('nome_completo', { ascending: true })

  if (error) {
    throw error
  }

  return (data ?? [])
    .map((row) =>
      mapPartner({
        id: row.id,
        perfil_parceiro_id: row.id,
        nome_instituicao: row.nome_completo,
        usuario_responsavel_nome: row.nome_completo,
        telefone: row.telefone,
        email: row.email,
        campus: row.campus,
        url_imagem: row.url_avatar,
        tipo: row.nome_completo?.startsWith('CEEDS') ? 'ceeds' : 'externo',
        ativo: row.ativo,
      }),
    )
    .sort((a, b) => a.name.localeCompare(b.name))
}

async function loadPartnerScheduleMap(partnerIds) {
  if (!Array.isArray(partnerIds) || partnerIds.length === 0) {
    return new Map()
  }

  const { data, error } = await euras
    .from('parceiro_horarios_funcionamento')
    .select('parceiro_id, dia_semana, abre_as, fecha_as, fechado')
    .in('parceiro_id', partnerIds)

  if (error) {
    if (isMissingRelationError(error)) {
      return new Map()
    }

    throw error
  }

  const grouped = new Map()

  for (const row of data ?? []) {
    const key = String(row.parceiro_id)
    const list = grouped.get(key) ?? []
    list.push(row)
    grouped.set(key, list)
  }

  const scheduleMap = new Map()
  for (const [key, rows] of grouped.entries()) {
    scheduleMap.set(key, mapScheduleFromRows(rows))
  }

  return scheduleMap
}

async function replacePartnerSchedule(partnerId, schedule) {
  const normalized = normalizeSchedule(schedule)
  const buildSafeScheduleRow = (day, item, fallbackOpenHour, fallbackCloseHour) => {
    const isOpen = Boolean(item?.open)

    return {
      parceiro_id: partnerId,
      dia_semana: day,
      abre_as: asTimeString(isOpen ? item.openHour : fallbackOpenHour, isOpen ? item.openMinute : '00'),
      fecha_as: asTimeString(isOpen ? item.closeHour : fallbackCloseHour, isOpen ? item.closeMinute : '00'),
      fechado: !isOpen,
    }
  }

  const rows = [
    buildSafeScheduleRow(0, normalized.week, '08', '18'),
    buildSafeScheduleRow(6, normalized.saturday, '08', '13'),
    buildSafeScheduleRow(7, normalized.sunday, '08', '13'),
  ]

  const { error: deleteError } = await euras
    .from('parceiro_horarios_funcionamento')
    .delete()
    .eq('parceiro_id', partnerId)

  if (deleteError) {
    if (isMissingRelationError(deleteError)) {
      return
    }

    throw deleteError
  }

  const { error: insertError } = await euras
    .from('parceiro_horarios_funcionamento')
    .insert(rows)

  if (insertError) {
    throw insertError
  }
}

async function loadInstitutionsByProfileIds(profileIds) {
  const result = new Map()

  if (!Array.isArray(profileIds) || profileIds.length === 0) {
    return result
  }

  const { data: partnerRows, error: partnerError } = await euras
    .from('parceiros')
    .select('perfil_parceiro_id, nome_instituicao, ativo')
    .in('perfil_parceiro_id', profileIds)

  if (partnerError && !isMissingRelationError(partnerError)) {
    throw partnerError
  }

  for (const row of partnerRows ?? []) {
    if (row.ativo === false) continue
    result.set(row.perfil_parceiro_id, row.nome_instituicao ?? 'Parceiro')
  }

  const missingProfileIds = profileIds.filter((profileId) => !result.has(profileId))

  if (missingProfileIds.length === 0) {
    return result
  }

  const { data: profileRows, error: profileError } = await euras
    .from('perfis')
    .select('id, nome_completo')
    .in('id', missingProfileIds)

  if (profileError) {
    throw profileError
  }

  for (const row of profileRows ?? []) {
    result.set(row.id, row.nome_completo ?? 'Parceiro')
  }

  return result
}

async function resolvePartnerProfileIdByInstitution(institution) {
  const normalizedInstitution = String(institution ?? '').trim()
  if (!normalizedInstitution) {
    return null
  }

  const { data: partnerRow, error: partnerError } = await euras
    .from('parceiros')
    .select('perfil_parceiro_id')
    .ilike('nome_instituicao', normalizedInstitution)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (partnerError && !isMissingRelationError(partnerError)) {
    throw partnerError
  }

  if (partnerRow?.perfil_parceiro_id) {
    return partnerRow.perfil_parceiro_id
  }

  const { data: profileRow, error: profileError } = await euras
    .from('perfis')
    .select('id')
    .eq('papel', 'parceiro')
    .ilike('nome_completo', normalizedInstitution)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  return profileRow?.id ?? null
}

async function getRawPartnerById(partnerId) {
  const { data, error } = await euras
    .from('parceiros')
    .select('id, perfil_parceiro_id, nome_instituicao, usuario_responsavel_nome, telefone, email, campus, url_imagem, tipo, ativo')
    .eq('id', partnerId)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (error) {
    if (isMissingRelationError(error)) {
      return null
    }

    throw error
  }

  return data
}

async function getPartnerIdentityById(partnerId) {
  const partnerRow = await getRawPartnerById(partnerId)

  if (partnerRow) {
    return mapPartner(partnerRow)
  }

  const { data: profile, error: profileError } = await euras
    .from('perfis')
    .select('id, nome_completo, telefone, email, campus, url_avatar, ativo')
    .eq('id', partnerId)
    .eq('papel', 'parceiro')
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  if (!profile) {
    return null
  }

  return mapPartner({
    id: profile.id,
    perfil_parceiro_id: profile.id,
    nome_instituicao: profile.nome_completo,
    usuario_responsavel_nome: profile.nome_completo,
    telefone: profile.telefone,
    email: profile.email,
    campus: profile.campus,
    url_imagem: profile.url_avatar,
    tipo: profile.nome_completo?.startsWith('CEEDS') ? 'ceeds' : 'externo',
    ativo: profile.ativo,
  })
}

async function getRawPartnerProductById(profileId, productId) {
  const { data, error } = await euras
    .from('produtos')
    .select('id, perfil_parceiro_id, titulo, descricao, preco_euras, url_imagem, ativo')
    .eq('id', productId)
    .eq('perfil_parceiro_id', profileId)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data
}

export function getPartnerApiErrorMessage(error) {
  const message = error?.message ?? ''
  const normalizedMessage = message
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

  if (!message) {
    return 'Não foi possível concluir a operação no banco de parceiros.'
  }

  if (normalizedMessage.includes('tempo limite')) {
    return 'Conexão com o banco demorou demais. Tente novamente em instantes.'
  }

  if (normalizedMessage.includes('sessao expirada')) {
    return 'Sua sessão expirou. Faça login novamente.'
  }

  if (normalizedMessage.includes('infinite recursion detected in policy')) {
    return 'Erro de permissão no banco (RLS). Rode o script de correção de policies e tente novamente.'
  }

  if (normalizedMessage.includes('row-level security')) {
    return 'Operação bloqueada por permissão (RLS). Verifique se seu usuário é admin.'
  }

  if (normalizedMessage.includes('invalid input value for enum tipo_parceiro')) {
    return 'Valor de tipo de parceiro inválido no schema atual. Atualize o schema ou rode o script de bootstrap final.'
  }

  if (error?.code === '23503') {
    return 'Não foi possível concluir a operação por referência inválida entre tabelas.'
  }

  if (error?.code === '23505') {
    return 'Já existe um registro com os mesmos dados únicos.'
  }

  if (normalizedMessage.includes('nao encontrado')) {
    return 'Registro não encontrado no banco.'
  }

  return message
}

export async function listPartners() {
  await ensureFreshSession()

  const { data, error } = await euras
    .from('parceiros')
    .select('id, perfil_parceiro_id, nome_instituicao, usuario_responsavel_nome, telefone, email, campus, url_imagem, tipo, ativo')
    .eq('ativo', true)
    .order('nome_instituicao', { ascending: true })

  if (error) {
    if (isMissingRelationError(error)) {
      return listPartnersFromProfiles()
    }

    throw error
  }

  return (data ?? [])
    .map(mapPartner)
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getPartnerById(partnerId) {
  await ensureFreshSession()

  const partnerRow = await getRawPartnerById(partnerId)

  if (partnerRow) {
    const mappedPartner = mapPartner(partnerRow)
    const scheduleMap = await loadPartnerScheduleMap([partnerRow.id])

    return {
      ...mappedPartner,
      schedule: scheduleMap.get(String(partnerRow.id)) ?? cloneSchedule(DEFAULT_SCHEDULE),
    }
  }

  const { data: profile, error: profileError } = await euras
    .from('perfis')
    .select('id, nome_completo, telefone, email, campus, url_avatar, ativo')
    .eq('id', partnerId)
    .eq('papel', 'parceiro')
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  if (!profile) {
    return null
  }

  return {
    ...mapPartner({
      id: profile.id,
      perfil_parceiro_id: profile.id,
      nome_instituicao: profile.nome_completo,
      usuario_responsavel_nome: profile.nome_completo,
      telefone: profile.telefone,
      email: profile.email,
      campus: profile.campus,
      url_imagem: profile.url_avatar,
      tipo: profile.nome_completo?.startsWith('CEEDS') ? 'ceeds' : 'externo',
      ativo: profile.ativo,
    }),
    schedule: cloneSchedule(DEFAULT_SCHEDULE),
  }
}

export async function createPartner({ name, user, phone, email, senha, campus, imageUrl, schedule }) {
  await ensureFreshSession()

  const normalizedName = name?.trim().toUpperCase() ?? ''
  if (!normalizedName) {
    throw new Error('Informe o nome da instituição.')
  }

  const normalizedEmail = email?.trim().toLowerCase() ?? ''
  if (!normalizedEmail) {
    throw new Error('Informe o e-mail.')
  }

  const normalizedPassword = senha?.trim() ?? ''
  if (!normalizedPassword || normalizedPassword.length < 6) {
    throw new Error('A senha deve ter no mínimo 6 caracteres.')
  }

  const normalizedUser = user?.trim().toUpperCase() ?? normalizedName
  const normalizedCampus = campus?.trim().toUpperCase() ?? ''
  const normalizedImageUrl = imageUrl?.trim() ?? ''
  const normalizedPhone = phone?.trim() ?? ''
  let createdAuthUserId = null
  let deleteAuthUser = null
  let createdProfileId = null
  let createdPartnerId = null

  try {
    const authCreation = await createPartnerAuthUser({
      email: normalizedEmail,
      password: normalizedPassword,
      displayName: normalizedUser,
    })

    createdAuthUserId = authCreation.userId
    deleteAuthUser = authCreation.deleteAuthUser

    const { data: profile, error: profileError } = await insertPartnerProfileWithAuthId({
      id: createdAuthUserId,
      nome_completo: normalizedUser,
      papel: 'parceiro',
      telefone: normalizedPhone,
      email: normalizedEmail,
      campus: normalizedCampus,
      url_avatar: normalizedImageUrl,
      ativo: true,
    })

    if (profileError) {
      throw profileError
    }

    createdProfileId = profile.id

    const partnerPayload = {
      perfil_parceiro_id: profile.id,
      perfil_id: profile.id,
      nome_instituicao: normalizedName,
      usuario_responsavel_nome: normalizedUser,
      telefone: normalizedPhone,
      email: normalizedEmail,
      campus: normalizedCampus,
      url_imagem: normalizedImageUrl,
      ativo: true,
    }

    let { data: partner, error: partnerError } = await insertPartnerWithCompatibleType(partnerPayload)

    if (partnerError && isMissingColumnError(partnerError, 'perfil_id')) {
      const fallbackPartnerPayload = { ...partnerPayload }
      delete fallbackPartnerPayload.perfil_id

      const fallbackInsert = await insertPartnerWithCompatibleType(fallbackPartnerPayload)
      partner = fallbackInsert.data
      partnerError = fallbackInsert.error
    }

    if (partnerError) {
      if (isMissingRelationError(partnerError)) {
        invalidateProductCaches()
        return profile.id
      }

      throw partnerError
    }

    createdPartnerId = partner.id
    await replacePartnerSchedule(partner.id, schedule)
    invalidateProductCaches()
    return partner.id
  } catch (error) {
    if (createdPartnerId) {
      const { error: removePartnerError } = await euras
        .from('parceiros')
        .delete()
        .eq('id', createdPartnerId)

      if (removePartnerError) {
        console.error('Falha ao reverter parceiro apos erro de cadastro.', removePartnerError)
      }
    }

    if (createdProfileId) {
      const { error: removeProfileError } = await euras
        .from('perfis')
        .delete()
        .eq('id', createdProfileId)

      if (removeProfileError) {
        console.error('Falha ao reverter perfil apos erro de cadastro.', removeProfileError)
      }
    }

    let authCleanupFailed = false
    let canCleanupAuthUser = false

    if (deleteAuthUser) {
      canCleanupAuthUser = true
      try {
        await deleteAuthUser()
      } catch (cleanupError) {
        authCleanupFailed = true
        console.error('Falha ao remover usuário do Auth apos erro no cadastro do parceiro.', cleanupError)
      }
    }

    if (createdAuthUserId) {
      let message =
        'Falha ao concluir o cadastro do parceiro apos criar o usuário de autenticacao.'

      if (!canCleanupAuthUser) {
        message += ' O usuário de autenticacao foi criado e pode precisar ser removido manualmente no Supabase Auth.'
      } else if (authCleanupFailed) {
        message += ' O usuário de autenticacao foi criado, mas a limpeza automatica falhou. Remova manualmente no Supabase Auth.'
      } else {
        message += ' O usuário de autenticacao criado foi revertido automaticamente.'
      }

      if (error?.message) {
        message += ` Motivo original: ${error.message}`
      }

      const wrappedError = new Error(message)
      wrappedError.code = error?.code
      wrappedError.details = error?.details
      wrappedError.hint = error?.hint
      wrappedError.cause = error
      throw wrappedError
    }

    throw error
  }
}

export async function updatePartner(partnerId, { name, user, phone, email, campus, imageUrl, schedule }) {
  await ensureFreshSession()

  const partnerRow = await getRawPartnerById(partnerId)

  if (!partnerRow) {
    const profileUpdate = {
      nome_completo: user?.trim().toUpperCase() || name?.trim().toUpperCase(),
      telefone: phone?.trim() ?? '',
      email: email?.trim() ?? '',
      campus: campus?.trim().toUpperCase() ?? '',
      url_avatar: imageUrl?.trim() ?? '',
    }

    const { data: updatedProfile, error: profileError } = await euras
      .from('perfis')
      .update(profileUpdate)
      .eq('id', partnerId)
      .eq('papel', 'parceiro')
      .eq('ativo', true)
      .select('id')
      .maybeSingle()

    if (profileError) {
      throw profileError
    }

    if (!updatedProfile) {
      throw new Error('Parceiro não encontrado.')
    }

    invalidateProductCaches(partnerId)
    return
  }

  const normalizedName = name?.trim().toUpperCase() || partnerRow.nome_instituicao
  const normalizedUser = user?.trim().toUpperCase() ?? partnerRow.usuario_responsavel_nome ?? normalizedName
  const normalizedCampus = campus?.trim().toUpperCase() ?? partnerRow.campus ?? ''
  const normalizedImageUrl = imageUrl?.trim() ?? partnerRow.url_imagem ?? ''

  const { error: partnerError } = await updatePartnerWithCompatibleType(partnerId, {
    nome_instituicao: normalizedName,
    usuario_responsavel_nome: normalizedUser,
    telefone: phone?.trim() ?? '',
    email: email?.trim() ?? '',
    campus: normalizedCampus,
    url_imagem: normalizedImageUrl,
  })

  if (partnerError) {
    throw partnerError
  }

  if (partnerRow.perfil_parceiro_id) {
    const { error: profileError } = await euras
      .from('perfis')
      .update({
        nome_completo: normalizedUser,
        telefone: phone?.trim() ?? '',
        email: email?.trim() ?? '',
        campus: normalizedCampus,
        url_avatar: normalizedImageUrl,
      })
      .eq('id', partnerRow.perfil_parceiro_id)

    if (profileError) {
      throw profileError
    }
  }

  await replacePartnerSchedule(partnerId, schedule)
  invalidateProductCaches(partnerId)
}

export async function removePartner(partnerId) {
  await ensureFreshSession()

  const partnerRow = await getRawPartnerById(partnerId)

  if (!partnerRow) {
    const { data: profile, error: profileError } = await euras
      .from('perfis')
      .update({ ativo: false })
      .eq('id', partnerId)
      .eq('papel', 'parceiro')
      .select('id')
      .maybeSingle()

    if (profileError) {
      throw profileError
    }

    if (!profile) {
      throw new Error('Parceiro não encontrado.')
    }

    invalidateProductCaches(partnerId)
    return
  }

  const { error: partnerError } = await euras
    .from('parceiros')
    .update({ ativo: false })
    .eq('id', partnerId)

  if (partnerError) {
    throw partnerError
  }

  if (partnerRow.perfil_parceiro_id) {
    const { error: profileError } = await euras
      .from('perfis')
      .update({ ativo: false })
      .eq('id', partnerRow.perfil_parceiro_id)

    if (profileError) {
      throw profileError
    }
  }

  invalidateProductCaches(partnerId)
}

export async function listPartnerProducts(partnerId) {
  const cacheHit = getCachedPartnerProducts(partnerId)
  if (cacheHit) {
    return cacheHit
  }

  return runInFlightProductRequest(`partner-products:${partnerId}`, async () => {
    await ensureFreshSession()

    const partner = await getPartnerIdentityById(partnerId)

    if (!partner) {
      const emptyPayload = { partner: null, products: [] }
      setCachedPartnerProducts(partnerId, emptyPayload)
      return emptyPayload
    }

    if (!partner.profileId) {
      const emptyPayload = { partner, products: [] }
      setCachedPartnerProducts(partnerId, emptyPayload)
      return emptyPayload
    }

    const { data, error } = await euras
      .from('produtos')
      .select('id, perfil_parceiro_id, titulo, descricao, preco_euras, url_imagem, ativo')
      .eq('perfil_parceiro_id', partner.profileId)
      .eq('ativo', true)
      .order('titulo', { ascending: true })

    if (error) {
      throw error
    }

    const payload = {
      partner,
      products: (data ?? []).map((product) => mapPartnerProduct(product, partner.name)),
    }

    setCachedPartnerProducts(partnerId, payload)
    return payload
  })
}

export async function prefetchPartnerProducts(partnerId) {
  try {
    await listPartnerProducts(partnerId)
  } catch {
    // Prefetch não deve interromper a navegação principal.
  }
}

export async function createPartnerProduct(partnerId, { title, description, priceEuras, imageUrl }) {
  await ensureFreshSession()

  const partner = await getPartnerIdentityById(partnerId)
  if (!partner || !partner.profileId) {
    throw new Error('Parceiro não encontrado.')
  }

  const normalizedTitle = title?.trim() ?? ''
  if (!normalizedTitle) {
    throw new Error('Informe o titulo do produto.')
  }

  const numericPrice = Number(priceEuras)
  if (Number.isNaN(numericPrice) || numericPrice < 0) {
    throw new Error('Informe um preco de Euras válido.')
  }

  const { error } = await euras
    .from('produtos')
    .insert({
      perfil_parceiro_id: partner.profileId,
      titulo: normalizedTitle,
      descricao: description?.trim() ?? '',
      preco_euras: numericPrice,
      url_imagem: imageUrl?.trim() ?? '',
      ativo: true,
    })

  if (error) {
    throw error
  }

  invalidateProductCaches(partnerId)
}

export async function getPartnerProductById(partnerId, productId) {
  await ensureFreshSession()

  const partner = await getPartnerIdentityById(partnerId)
  if (!partner || !partner.profileId) {
    return null
  }

  const product = await getRawPartnerProductById(partner.profileId, productId)

  if (!product) {
    return null
  }

  return {
    id: product.id,
    title: product.titulo ?? '',
    description: product.descricao ?? '',
    priceEuras: ensureNumber(product.preco_euras),
    imageUrl: product.url_imagem ?? '',
    partnerId: partner.id,
    partnerName: partner.name,
  }
}

export async function updatePartnerProduct(partnerId, productId, { title, description, priceEuras, imageUrl }) {
  await ensureFreshSession()

  const partner = await getPartnerIdentityById(partnerId)
  if (!partner || !partner.profileId) {
    throw new Error('Parceiro não encontrado.')
  }

  const currentProduct = await getRawPartnerProductById(partner.profileId, productId)
  if (!currentProduct) {
    throw new Error('Produto não encontrado.')
  }

  const numericPrice = Number(priceEuras)
  if (Number.isNaN(numericPrice) || numericPrice < 0) {
    throw new Error('Informe um preco de Euras válido.')
  }

  const { error } = await euras
    .from('produtos')
    .update({
      titulo: title?.trim() || currentProduct.titulo,
      descricao: description?.trim() ?? '',
      preco_euras: numericPrice,
      url_imagem: imageUrl?.trim() ?? '',
    })
    .eq('id', productId)
    .eq('perfil_parceiro_id', partner.profileId)

  if (error) {
    throw error
  }

  invalidateProductCaches(partnerId)
}

export async function removePartnerProduct(partnerId, productId) {
  await ensureFreshSession()

  const partner = await getPartnerIdentityById(partnerId)
  if (!partner || !partner.profileId) {
    throw new Error('Parceiro não encontrado.')
  }

  const product = await getRawPartnerProductById(partner.profileId, productId)
  if (!product) {
    throw new Error('Produto não encontrado.')
  }

  const { error } = await euras
    .from('produtos')
    .update({ ativo: false })
    .eq('id', productId)
    .eq('perfil_parceiro_id', partner.profileId)

  if (error) {
    throw error
  }

  invalidateProductCaches(partnerId)
}

export async function listProducts() {
  const cacheHit = getCachedCatalogProducts()
  if (cacheHit) {
    return cacheHit
  }

  return runInFlightProductRequest('catalog-products', async () => {
    await ensureFreshSession()

    const { data, error } = await euras
      .from('produtos')
      .select('id, perfil_parceiro_id, titulo, descricao, preco_euras, url_imagem, ativo')
      .eq('ativo', true)
      .order('titulo', { ascending: true })

    if (error) {
      throw error
    }

    const products = data ?? []
    const profileIds = [...new Set(products.map((product) => product.perfil_parceiro_id).filter(Boolean))]
    const institutionByProfileId = await loadInstitutionsByProfileIds(profileIds)

    const mappedProducts = products
      .map((product) => mapCatalogProduct(product, institutionByProfileId))
      .sort((a, b) => a.name.localeCompare(b.name))

    setCachedCatalogProducts(mappedProducts)
    return mappedProducts
  })
}

export async function createProduct({ name, institution, description, priceEuras, imageUrl }) {
  await ensureFreshSession()

  const normalizedName = name?.trim() ?? ''
  if (!normalizedName) {
    throw new Error('Informe o nome do produto.')
  }

  const normalizedInstitution = institution?.trim() ?? ''
  if (!normalizedInstitution) {
    throw new Error('Informe a instituição do produto.')
  }

  const numericPrice = parseEurasValue(priceEuras)
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    throw new Error('Informe um valor válido para o produto.')
  }

  const profileId = await resolvePartnerProfileIdByInstitution(normalizedInstitution)
  if (!profileId) {
    throw new Error('Instituição não cadastrada como parceiro. Cadastre o parceiro antes de criar o produto.')
  }

  const { error } = await euras
    .from('produtos')
    .insert({
      perfil_parceiro_id: profileId,
      titulo: normalizedName,
      descricao: description?.trim() ?? '',
      preco_euras: numericPrice,
      url_imagem: imageUrl?.trim() ?? '',
      ativo: true,
    })

  if (error) {
    throw error
  }

  invalidateProductCaches()
}

export async function getProductById(productId) {
  await ensureFreshSession()

  const { data: product, error } = await euras
    .from('produtos')
    .select('id, perfil_parceiro_id, titulo, descricao, preco_euras, url_imagem, ativo')
    .eq('id', productId)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!product) {
    return null
  }

  const institutionByProfileId = await loadInstitutionsByProfileIds([product.perfil_parceiro_id])
  return mapCatalogProduct(product, institutionByProfileId)
}

export async function updateProduct(productId, { name, institution, description, priceEuras, imageUrl }) {
  await ensureFreshSession()

  const { data: currentProduct, error: findError } = await euras
    .from('produtos')
    .select('id')
    .eq('id', productId)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (findError) {
    throw findError
  }

  if (!currentProduct) {
    throw new Error('Produto não encontrado.')
  }

  const normalizedName = name?.trim() ?? ''
  if (!normalizedName) {
    throw new Error('Informe o nome do produto.')
  }

  const normalizedInstitution = institution?.trim() ?? ''
  if (!normalizedInstitution) {
    throw new Error('Informe a instituição do produto.')
  }

  const numericPrice = parseEurasValue(priceEuras)
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    throw new Error('Informe um valor válido para o produto.')
  }

  const profileId = await resolvePartnerProfileIdByInstitution(normalizedInstitution)
  if (!profileId) {
    throw new Error('Instituição não cadastrada como parceiro. Cadastre o parceiro antes de salvar o produto.')
  }

  const { error } = await euras
    .from('produtos')
    .update({
      perfil_parceiro_id: profileId,
      titulo: normalizedName,
      descricao: description?.trim() ?? '',
      preco_euras: numericPrice,
      url_imagem: imageUrl?.trim() ?? '',
    })
    .eq('id', productId)

  if (error) {
    throw error
  }

  invalidateProductCaches()
}

export async function removeProduct(productId) {
  await ensureFreshSession()

  const { data, error: findError } = await euras
    .from('produtos')
    .select('id')
    .eq('id', productId)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (findError) {
    throw findError
  }

  if (!data) {
    throw new Error('Produto não encontrado.')
  }

  const { error } = await euras
    .from('produtos')
    .update({ ativo: false })
    .eq('id', productId)

  if (error) {
    throw error
  }

  invalidateProductCaches()
}
