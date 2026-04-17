import { supabase } from './supabase'

const euras = supabase.schema('euras')
const TIMEOUT_MS = 15000

function withTimeout(promise, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => reject(new Error(message)), TIMEOUT_MS)
    }),
  ])
}

function normalizeTypeToGroup(partner) {
  const type = String(partner.tipo ?? '').toLowerCase()
  const name = String(partner.nome_instituicao ?? '').toLowerCase()

  if (type.includes('ceeds') || name.startsWith('ceeds')) {
    return 'ceeds'
  }

  return 'external'
}

function normalizeLogo(partner) {
  if (normalizeTypeToGroup(partner) === 'ceeds') {
    return { logo: 'CEEDS', variant: 'light' }
  }

  const name = String(partner.nome_instituicao ?? '')

  if (name.toLowerCase().includes('studio')) {
    return { logo: 'Studio D', variant: 'black' }
  }

  if (name.toLowerCase().includes('otica')) {
    return { logo: 'OB', variant: 'blue' }
  }

  if (name.toLowerCase().includes('odonto')) {
    return { logo: 'OdontoCenter', variant: 'light' }
  }

  return { logo: name || 'Parceiro', variant: 'light' }
}

function mapPartner(row) {
  const visual = normalizeLogo(row)

  return {
    id: row.id,
    profileId: row.perfil_parceiro_id ?? null,
    name: row.nome_instituicao ?? '',
    user: row.usuario_responsavel_nome ?? '',
    phone: row.telefone ?? '',
    email: row.email ?? '',
    campus: row.campus ?? '',
    imageUrl: row.url_imagem ?? '',
    group: normalizeTypeToGroup(row),
    logo: visual.logo,
    variant: visual.variant,
    active: row.ativo ?? true,
  }
}

function defaultScheduleFromRows(rows) {
  const byDay = new Map(rows.map((row) => [row.dia_semana, row]))

  const week = byDay.get(1)
  const saturday = byDay.get(6)
  const sunday = byDay.get(0)

  const toUi = (row, fallbackClosed) => {
    if (!row) {
      return { open: !fallbackClosed, openHour: '06', openMinute: '00', closeHour: '18', closeMinute: '00' }
    }

    const openTime = (row.abre_as ?? '06:00:00').slice(0, 5).split(':')
    const closeTime = (row.fecha_as ?? '18:00:00').slice(0, 5).split(':')

    return {
      open: !row.fechado,
      openHour: openTime[0] ?? '06',
      openMinute: openTime[1] ?? '00',
      closeHour: closeTime[0] ?? '18',
      closeMinute: closeTime[1] ?? '00',
    }
  }

  return {
    week: toUi(week, false),
    saturday: toUi(saturday, false),
    sunday: toUi(sunday, true),
  }
}

function normalizeHour(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return '00'
  return String(Math.min(23, Math.max(0, n))).padStart(2, '0')
}

function normalizeMinute(value) {
  const n = Number(value)
  if (Number.isNaN(n)) return '00'
  return String(Math.min(59, Math.max(0, n))).padStart(2, '0')
}

function scheduleToRows(partnerId, schedule) {
  const mapping = [
    { key: 'week', day: 1 },
    { key: 'saturday', day: 6 },
    { key: 'sunday', day: 0 },
  ]

  return mapping.map(({ key, day }) => {
    const item = schedule[key]
    const openHour = normalizeHour(item.openHour)
    const openMinute = normalizeMinute(item.openMinute)
    const closeHour = normalizeHour(item.closeHour)
    const closeMinute = normalizeMinute(item.closeMinute)

    return {
      parceiro_id: partnerId,
      dia_semana: day,
      abre_as: `${openHour}:${openMinute}:00`,
      fecha_as: `${closeHour}:${closeMinute}:00`,
      fechado: !item.open,
    }
  })
}

export function getPartnerApiErrorMessage(error) {
  const message = error?.message ?? ''

  if (!message) {
    return 'Nao foi possivel concluir a operacao com parceiros no Supabase.'
  }

  if (message.toLowerCase().includes('invalid schema')) {
    return 'O schema euras nao esta exposto para a API do Supabase.'
  }

  if (message.toLowerCase().includes('row-level security')) {
    return 'Seu usuario nao passou nas regras de permissao para parceiros.'
  }

  if (message.toLowerCase().includes('could not find the table')) {
    return 'As tabelas de parceiros/produtos ainda nao foram criadas no schema euras.'
  }

  return message
}

export async function listPartners() {
  const { data, error } = await withTimeout(
    euras
      .from('parceiros')
      .select('*')
      .is('removido_em', null)
      .order('nome_instituicao'),
    'Tempo limite ao listar parceiros no Supabase.',
  )

  if (error) {
    throw error
  }

  return data.map(mapPartner)
}

export async function getPartnerById(partnerId) {
  const { data, error } = await withTimeout(
    euras
      .from('parceiros')
      .select('*')
      .eq('id', partnerId)
      .single(),
    'Tempo limite ao carregar parceiro no Supabase.',
  )

  if (error) {
    throw error
  }

  const { data: scheduleRows, error: scheduleError } = await withTimeout(
    euras
      .from('parceiro_horarios_funcionamento')
      .select('*')
      .eq('parceiro_id', partnerId),
    'Tempo limite ao carregar horarios do parceiro.',
  )

  if (scheduleError) {
    throw scheduleError
  }

  return {
    ...mapPartner(data),
    schedule: defaultScheduleFromRows(scheduleRows ?? []),
  }
}

export async function createPartner({ name, user, phone, email, campus, schedule }) {
  const { data, error } = await withTimeout(
    euras
      .from('parceiros')
      .insert({
        nome_instituicao: name,
        usuario_responsavel_nome: user || null,
        telefone: phone || null,
        email: email || null,
        campus: campus || null,
        ativo: true,
      })
      .select('id')
      .single(),
    'Tempo limite ao criar parceiro no Supabase.',
  )

  if (error) {
    throw error
  }

  const scheduleRows = scheduleToRows(data.id, schedule)
  const { error: scheduleError } = await withTimeout(
    euras.from('parceiro_horarios_funcionamento').insert(scheduleRows),
    'Tempo limite ao criar horarios do parceiro.',
  )

  if (scheduleError) {
    throw scheduleError
  }

  return data.id
}

export async function updatePartner(partnerId, { name, user, phone, email, campus, schedule }) {
  const { error } = await withTimeout(
    euras
      .from('parceiros')
      .update({
        nome_instituicao: name,
        usuario_responsavel_nome: user || null,
        telefone: phone || null,
        email: email || null,
        campus: campus || null,
      })
      .eq('id', partnerId),
    'Tempo limite ao atualizar parceiro.',
  )

  if (error) {
    throw error
  }

  const { error: deleteError } = await withTimeout(
    euras.from('parceiro_horarios_funcionamento').delete().eq('parceiro_id', partnerId),
    'Tempo limite ao atualizar horarios do parceiro.',
  )

  if (deleteError) {
    throw deleteError
  }

  const scheduleRows = scheduleToRows(partnerId, schedule)
  const { error: insertError } = await withTimeout(
    euras.from('parceiro_horarios_funcionamento').insert(scheduleRows),
    'Tempo limite ao salvar horarios do parceiro.',
  )

  if (insertError) {
    throw insertError
  }
}

export async function removePartner(partnerId) {
  const { error } = await withTimeout(
    euras
      .from('parceiros')
      .update({
        ativo: false,
        removido_em: new Date().toISOString(),
      })
      .eq('id', partnerId),
    'Tempo limite ao remover parceiro.',
  )

  if (error) {
    throw error
  }
}

export async function listPartnerProducts(partnerId) {
  const partner = await getPartnerById(partnerId)

  if (!partner.profileId) {
    return { partner, products: [] }
  }

  const { data, error } = await withTimeout(
    euras
      .from('produtos')
      .select('*')
      .eq('perfil_parceiro_id', partner.profileId)
      .eq('ativo', true)
      .order('titulo'),
    'Tempo limite ao listar produtos do parceiro.',
  )

  if (error) {
    throw error
  }

  const products = (data ?? []).map((row) => ({
    id: row.id,
    name: row.titulo ?? '',
    description: row.descricao ?? '',
    priceEuras: row.preco_euras ?? 0,
    imageUrl: row.url_imagem ?? '',
    partnerName: partner.name,
  }))

  return { partner, products }
}

export async function createPartnerProduct(partnerId, { title, description, priceEuras, imageUrl }) {
  const partner = await getPartnerById(partnerId)

  if (!partner.profileId) {
    throw new Error(
      'Este parceiro nao possui perfil_parceiro_id vinculado. Nao e possivel cadastrar produto para ele.',
    )
  }

  const numericPrice = Number(priceEuras)
  if (Number.isNaN(numericPrice) || numericPrice < 0) {
    throw new Error('Informe um preco de Euras valido.')
  }

  const { error } = await withTimeout(
    euras.from('produtos').insert({
      perfil_parceiro_id: partner.profileId,
      titulo: title,
      descricao: description || null,
      preco_euras: numericPrice,
      url_imagem: imageUrl || null,
      ativo: true,
    }),
    'Tempo limite ao criar produto no Supabase.',
  )

  if (error) {
    throw error
  }
}

export async function getPartnerProductById(partnerId, productId) {
  const partner = await getPartnerById(partnerId)

  if (!partner.profileId) {
    throw new Error('Este parceiro nao possui perfil_parceiro_id vinculado.')
  }

  const { data, error } = await withTimeout(
    euras
      .from('produtos')
      .select('*')
      .eq('id', productId)
      .eq('perfil_parceiro_id', partner.profileId)
      .single(),
    'Tempo limite ao carregar produto do parceiro.',
  )

  if (error) {
    throw error
  }

  return {
    id: data.id,
    title: data.titulo ?? '',
    description: data.descricao ?? '',
    priceEuras: data.preco_euras ?? 0,
    imageUrl: data.url_imagem ?? '',
    partnerId,
    partnerName: partner.name,
  }
}

export async function updatePartnerProduct(partnerId, productId, { title, description, priceEuras, imageUrl }) {
  const partner = await getPartnerById(partnerId)

  if (!partner.profileId) {
    throw new Error('Este parceiro nao possui perfil_parceiro_id vinculado.')
  }

  const numericPrice = Number(priceEuras)
  if (Number.isNaN(numericPrice) || numericPrice < 0) {
    throw new Error('Informe um preco de Euras valido.')
  }

  const { error } = await withTimeout(
    euras
      .from('produtos')
      .update({
        titulo: title,
        descricao: description || null,
        preco_euras: numericPrice,
        url_imagem: imageUrl || null,
      })
      .eq('id', productId)
      .eq('perfil_parceiro_id', partner.profileId),
    'Tempo limite ao atualizar produto.',
  )

  if (error) {
    throw error
  }
}

export async function removePartnerProduct(partnerId, productId) {
  const partner = await getPartnerById(partnerId)

  if (!partner.profileId) {
    throw new Error('Este parceiro nao possui perfil_parceiro_id vinculado.')
  }

  const { error } = await withTimeout(
    euras
      .from('produtos')
      .update({ ativo: false })
      .eq('id', productId)
      .eq('perfil_parceiro_id', partner.profileId),
    'Tempo limite ao remover produto.',
  )

  if (error) {
    throw error
  }
}
