import { ensureFreshSession, supabase } from '../../../lib/supabase'

const euras = supabase.schema('euras')

function ensureNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function parseEurasValue(value) {
  if (typeof value === 'number') {
    return value
  }

  const raw = String(value ?? '')
    .trim()
    .replace(/\s+/g, '')
  if (!raw) return Number.NaN

  let normalized = raw

  if (raw.includes(',') && raw.includes('.')) {
    normalized = raw.replace(/\./g, '').replace(',', '.')
  } else if (raw.includes(',')) {
    normalized = raw.replace(',', '.')
  }

  return Number(normalized)
}

function toSafeDate(value) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function formatDateLabel(date) {
  const safeDate = toSafeDate(date)
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
    .format(safeDate)
    .replace('.', '')
    .toUpperCase()
  const dateLabel = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(safeDate)

  return `${weekday} - ${dateLabel}`
}

function formatTimeLabel(date) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(toSafeDate(date))
}

function formatCompactTimeLabel(date) {
  return formatTimeLabel(date).replace(':', 'h')
}

function isMissingRelationError(error) {
  const message = String(error?.message ?? '').toLowerCase()
  return error?.code === 'PGRST205' || message.includes('could not find the table') || message.includes('relation')
}

function isPermissionError(error) {
  const message = String(error?.message ?? '').toLowerCase()
  return message.includes('row-level security') || message.includes('permission denied')
}

function mapProductRows(products) {
  const map = new Map()

  for (const row of products ?? []) {
    map.set(row.id, row.titulo ?? 'Produto')
  }

  return map
}

function mapProfileRows(profiles) {
  const map = new Map()

  for (const row of profiles ?? []) {
    map.set(row.id, row.nome_completo ?? 'Aluno')
  }

  return map
}

async function listRedemptions(partnerProfileId) {
  const { data, error } = await euras
    .from('resgates')
    .select('id, aluno_id, produto_id, valor_euras, status, criado_em, confirmado_em')
    .eq('parceiro_id', partnerProfileId)
    .order('criado_em', { ascending: false })
    .limit(100)

  if (error) {
    throw error
  }

  return data ?? []
}

async function loadProductNameMap(productIds) {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return new Map()
  }

  const { data, error } = await euras
    .from('produtos')
    .select('id, titulo')
    .in('id', productIds)

  if (error) {
    if (isMissingRelationError(error) || isPermissionError(error)) {
      return new Map()
    }
    throw error
  }

  return mapProductRows(data)
}

async function loadStudentNameMap(studentIds) {
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return new Map()
  }

  const { data, error } = await euras
    .from('perfis')
    .select('id, nome_completo')
    .in('id', studentIds)

  if (error) {
    if (isMissingRelationError(error) || isPermissionError(error)) {
      return new Map()
    }
    throw error
  }

  return mapProfileRows(data)
}

function mapPendingRequest(row, studentNameById, productNameById) {
  const studentName = studentNameById.get(row.aluno_id) ?? 'Aluno'
  const productTitle = productNameById.get(row.produto_id) ?? 'Produto'

  return {
    id: row.id,
    studentName,
    productTitle,
    amountEuras: ensureNumber(row.valor_euras),
    dateLabel: formatDateLabel(row.criado_em),
    requestedAtLabel: formatTimeLabel(row.criado_em),
    requestedAtCompact: formatCompactTimeLabel(row.criado_em),
  }
}

function mapActivity(row, studentNameById, productNameById) {
  const studentName = studentNameById.get(row.aluno_id) ?? 'Aluno'
  const productTitle = productNameById.get(row.produto_id) ?? 'Produto'
  const activityDate = row.confirmado_em ?? row.criado_em
  const safeDate = toSafeDate(activityDate)

  return {
    id: row.id,
    studentName,
    productTitle,
    productSummary: productTitle,
    amountEuras: ensureNumber(row.valor_euras),
    dateLabel: formatDateLabel(safeDate),
    occurredAtLabel: formatCompactTimeLabel(safeDate),
    occurredDateISO: safeDate.toISOString().slice(0, 10),
    sortKey: safeDate.getTime(),
    status: row.status,
  }
}

function sortActivitiesDesc(a, b) {
  return Number(b.sortKey ?? 0) - Number(a.sortKey ?? 0)
}

function mapPortalProductRow(row, institution) {
  return {
    id: row.id,
    title: row.titulo ?? '',
    description: row.descricao ?? '',
    priceEuras: ensureNumber(row.preco_euras),
    imageUrl: row.url_imagem ?? '',
    active: row.ativo ?? true,
    institution: institution ?? '',
  }
}

async function resolvePartnerInstitutionName(partnerProfileId) {
  const fallbackName = 'Parceiro'

  if (!partnerProfileId) {
    return fallbackName
  }

  const { data: partnerRow, error: partnerError } = await euras
    .from('parceiros')
    .select('nome_instituicao')
    .eq('perfil_parceiro_id', partnerProfileId)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (partnerError && !isMissingRelationError(partnerError) && !isPermissionError(partnerError)) {
    throw partnerError
  }

  if (partnerRow?.nome_instituicao?.trim()) {
    return partnerRow.nome_instituicao.trim()
  }

  const { data: profileRow, error: profileError } = await euras
    .from('perfis')
    .select('nome_completo')
    .eq('id', partnerProfileId)
    .eq('papel', 'parceiro')
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (profileError && !isPermissionError(profileError)) {
    throw profileError
  }

  if (profileRow?.nome_completo?.trim()) {
    return profileRow.nome_completo.trim()
  }

  return fallbackName
}

function normalizePortalProductInput({ title, description, priceEuras, imageUrl }) {
  const normalizedTitle = String(title ?? '').trim()
  if (!normalizedTitle) {
    throw new Error('Informe o nome do produto.')
  }

  const numericPrice = parseEurasValue(priceEuras)
  if (!Number.isFinite(numericPrice) || numericPrice < 0) {
    throw new Error('Informe um valor válido para o produto.')
  }

  return {
    title: normalizedTitle,
    description: String(description ?? '').trim(),
    priceEuras: numericPrice,
    imageUrl: String(imageUrl ?? '').trim(),
  }
}

function ensurePartnerProfileId(partnerProfileId) {
  if (!partnerProfileId) {
    throw new Error('Perfil do parceiro não encontrado. Faça login novamente.')
  }
}

export function getPartnerPortalApiErrorMessage(error) {
  const message = error?.message ?? ''

  if (!message) {
    return 'Não foi possível carregar os dados do portal parceiro.'
  }

  if (message.toLowerCase().includes('tempo limite')) {
    return 'Conexão com o banco demorou demais. Tente novamente em instantes.'
  }

  if (message.toLowerCase().includes('sessao expirada')) {
    return 'Sua sessão expirou. Faça login novamente.'
  }

  if (isPermissionError(error)) {
    return 'Sem permissão no banco para o portal parceiro. Verifique as policies de parceiro no Supabase.'
  }

  return message
}

export async function getPartnerPortalHomeData(partnerProfileId) {
  await ensureFreshSession()
  ensurePartnerProfileId(partnerProfileId)

  const redemptionRows = await listRedemptions(partnerProfileId)

  const productIds = [...new Set(redemptionRows.map((row) => row.produto_id).filter(Boolean))]
  const studentIds = [...new Set(redemptionRows.map((row) => row.aluno_id).filter(Boolean))]

  const [productNameById, studentNameById] = await Promise.all([
    loadProductNameMap(productIds),
    loadStudentNameMap(studentIds),
  ])

  const pendingRequests = redemptionRows
    .filter((row) => row.status === 'pendente')
    .map((row) => mapPendingRequest(row, studentNameById, productNameById))

  const activities = redemptionRows
    .filter((row) => row.status === 'confirmado' || row.status === 'cancelado')
    .map((row) => mapActivity(row, studentNameById, productNameById))
    .sort(sortActivitiesDesc)
    .slice(0, 8)

  return {
    pendingRequests,
    activities,
  }
}

function toUpdatedActivity(row, productNameById, studentNameById) {
  const safeDate = toSafeDate(row.confirmado_em ?? row.criado_em)

  return {
    id: row.id,
    studentName: studentNameById.get(row.aluno_id) ?? 'Aluno',
    productTitle: productNameById.get(row.produto_id) ?? 'Produto',
    productSummary: productNameById.get(row.produto_id) ?? 'Produto',
    amountEuras: ensureNumber(row.valor_euras),
    dateLabel: formatDateLabel(safeDate),
    occurredAtLabel: formatCompactTimeLabel(safeDate),
    occurredDateISO: safeDate.toISOString().slice(0, 10),
    sortKey: safeDate.getTime(),
    status: row.status,
  }
}

async function updateRedemptionStatus({ redemptionId, partnerProfileId, nextStatus }) {
  await ensureFreshSession()
  ensurePartnerProfileId(partnerProfileId)

  const { data: updatedRedemption, error } = await euras
    .from('resgates')
    .update({
      status: nextStatus,
      confirmado_por: partnerProfileId,
      confirmado_em: new Date().toISOString(),
    })
    .eq('id', redemptionId)
    .eq('parceiro_id', partnerProfileId)
    .eq('status', 'pendente')
    .select('id, aluno_id, produto_id, valor_euras, status, criado_em, confirmado_em')
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!updatedRedemption) {
    throw new Error('Solicitação não encontrada ou já processada.')
  }

  const [productNameById, studentNameById] = await Promise.all([
    loadProductNameMap(updatedRedemption.produto_id ? [updatedRedemption.produto_id] : []),
    loadStudentNameMap(updatedRedemption.aluno_id ? [updatedRedemption.aluno_id] : []),
  ])

  return toUpdatedActivity(updatedRedemption, productNameById, studentNameById)
}

export async function approvePartnerRedemption({ redemptionId, partnerProfileId }) {
  return updateRedemptionStatus({
    redemptionId,
    partnerProfileId,
    nextStatus: 'confirmado',
  })
}

export async function rejectPartnerRedemption({ redemptionId, partnerProfileId }) {
  return updateRedemptionStatus({
    redemptionId,
    partnerProfileId,
    nextStatus: 'cancelado',
  })
}

export async function listPartnerPortalProducts(partnerProfileId) {
  await ensureFreshSession()
  ensurePartnerProfileId(partnerProfileId)

  const institution = await resolvePartnerInstitutionName(partnerProfileId)

  const { data, error } = await euras
    .from('produtos')
    .select('id, titulo, descricao, preco_euras, url_imagem, ativo')
    .eq('perfil_parceiro_id', partnerProfileId)
    .eq('ativo', true)
    .order('titulo', { ascending: true })

  if (error) {
    throw error
  }

  return {
    products: (data ?? []).map((row) => mapPortalProductRow(row, institution)),
  }
}

export async function getPartnerPortalProductById(partnerProfileId, productId) {
  await ensureFreshSession()
  ensurePartnerProfileId(partnerProfileId)

  const institution = await resolvePartnerInstitutionName(partnerProfileId)

  const { data, error } = await euras
    .from('produtos')
    .select('id, titulo, descricao, preco_euras, url_imagem, ativo')
    .eq('id', productId)
    .eq('perfil_parceiro_id', partnerProfileId)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    return null
  }

  return mapPortalProductRow(data, institution)
}

export async function createPartnerPortalProduct(partnerProfileId, { title, description, priceEuras, imageUrl }) {
  const payload = normalizePortalProductInput({ title, description, priceEuras, imageUrl })

  await ensureFreshSession()
  ensurePartnerProfileId(partnerProfileId)

  const { data, error } = await euras
    .from('produtos')
    .insert({
      perfil_parceiro_id: partnerProfileId,
      titulo: payload.title,
      descricao: payload.description,
      preco_euras: payload.priceEuras,
      url_imagem: payload.imageUrl,
      ativo: true,
    })
    .select('id')
    .single()

  if (error) {
    throw error
  }

  return data?.id ?? null
}

export async function updatePartnerPortalProduct(
  partnerProfileId,
  productId,
  { title, description, priceEuras, imageUrl },
) {
  const payload = normalizePortalProductInput({ title, description, priceEuras, imageUrl })

  await ensureFreshSession()
  ensurePartnerProfileId(partnerProfileId)

  const { data: currentProduct, error: findError } = await euras
    .from('produtos')
    .select('id')
    .eq('id', productId)
    .eq('perfil_parceiro_id', partnerProfileId)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (findError) {
    throw findError
  }

  if (!currentProduct) {
    throw new Error('Produto não encontrado.')
  }

  const { error } = await euras
    .from('produtos')
    .update({
      titulo: payload.title,
      descricao: payload.description,
      preco_euras: payload.priceEuras,
      url_imagem: payload.imageUrl,
    })
    .eq('id', productId)
    .eq('perfil_parceiro_id', partnerProfileId)

  if (error) {
    throw error
  }
}

export async function removePartnerPortalProduct(partnerProfileId, productId) {
  await ensureFreshSession()
  ensurePartnerProfileId(partnerProfileId)

  const { data: currentProduct, error: findError } = await euras
    .from('produtos')
    .select('id')
    .eq('id', productId)
    .eq('perfil_parceiro_id', partnerProfileId)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (findError) {
    throw findError
  }

  if (!currentProduct) {
    throw new Error('Produto não encontrado.')
  }

  const { error } = await euras
    .from('produtos')
    .update({ ativo: false })
    .eq('id', productId)
    .eq('perfil_parceiro_id', partnerProfileId)

  if (error) {
    throw error
  }
}

export async function listPartnerPortalActivities(partnerProfileId) {
  await ensureFreshSession()
  ensurePartnerProfileId(partnerProfileId)

  const redemptionRows = await listRedemptions(partnerProfileId)

  const productIds = [...new Set(redemptionRows.map((row) => row.produto_id).filter(Boolean))]
  const studentIds = [...new Set(redemptionRows.map((row) => row.aluno_id).filter(Boolean))]

  const [productNameById, studentNameById] = await Promise.all([
    loadProductNameMap(productIds),
    loadStudentNameMap(studentIds),
  ])

  return {
    activities: redemptionRows
      .map((row) => mapActivity(row, studentNameById, productNameById))
      .sort(sortActivitiesDesc),
  }
}
