import { ensureFreshSession, supabase } from './supabase'

const euras = supabase.schema('euras')

function isMissingRelationError(error) {
  const message = String(error?.message ?? '').toLowerCase()
  return error?.code === 'PGRST205' || message.includes('could not find the table') || message.includes('relation')
}

function toDateTimeParts(value) {
  const parsed = new Date(value)

  if (Number.isNaN(parsed.getTime())) {
    return {
      date: '1970-01-01',
      time: '00:00',
    }
  }

  const year = parsed.getFullYear()
  const month = String(parsed.getMonth() + 1).padStart(2, '0')
  const day = String(parsed.getDate()).padStart(2, '0')
  const hour = String(parsed.getHours()).padStart(2, '0')
  const minute = String(parsed.getMinutes()).padStart(2, '0')

  return {
    date: `${year}-${month}-${day}`,
    time: `${hour}:${minute}`,
  }
}

function sortActivitiesDesc(a, b) {
  if (a.date !== b.date) {
    return b.date.localeCompare(a.date)
  }

  return b.time.localeCompare(a.time)
}

async function loadStudentNameMap(studentIds) {
  const map = new Map()

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return map
  }

  const { data: profileRows, error: profileError } = await euras
    .from('perfis')
    .select('id, nome_completo')
    .in('id', studentIds)

  if (profileError && !isMissingRelationError(profileError)) {
    throw profileError
  }

  for (const row of profileRows ?? []) {
    map.set(row.id, row.nome_completo ?? 'Aluno')
  }

  const remainingIds = studentIds.filter((id) => !map.has(id))

  if (remainingIds.length === 0) {
    return map
  }

  const { data: studentRows, error: studentError } = await euras
    .from('alunos')
    .select('id, nome_completo')
    .in('id', remainingIds)

  if (studentError && !isMissingRelationError(studentError)) {
    throw studentError
  }

  for (const row of studentRows ?? []) {
    map.set(row.id, row.nome_completo ?? 'Aluno')
  }

  return map
}

async function loadActivitySnapshotMap(activityIds) {
  const map = new Map()

  if (!Array.isArray(activityIds) || activityIds.length === 0) {
    return map
  }

  const { data, error } = await euras
    .from('atividades')
    .select('id, titulo, descricao')
    .in('id', activityIds)

  if (error) {
    if (isMissingRelationError(error)) {
      return map
    }

    throw error
  }

  for (const row of data ?? []) {
    map.set(row.id, row)
  }

  return map
}

async function listActivitiesFromAwards() {
  const { data, error } = await euras
    .from('atividades_concedidas')
    .select('id, atividade_id, aluno_id, valor_euras, titulo_snapshot, descricao_snapshot, concedido_em, observacao')
    .order('concedido_em', { ascending: false })

  if (error) {
    if (isMissingRelationError(error)) {
      return null
    }

    throw error
  }

  const items = data ?? []
  if (items.length === 0) {
    return []
  }

  const studentIds = [...new Set(items.map((item) => item.aluno_id).filter(Boolean))]
  const activityIds = [...new Set(items.map((item) => item.atividade_id).filter(Boolean))]

  const [studentNameMap, activitySnapshotMap] = await Promise.all([
    loadStudentNameMap(studentIds),
    loadActivitySnapshotMap(activityIds),
  ])

  return items
    .map((item) => {
      const timestamp = item.concedido_em
      const dateTime = toDateTimeParts(timestamp)
      const activitySnapshot = activitySnapshotMap.get(item.atividade_id)

      return {
        id: item.id,
        studentName: studentNameMap.get(item.aluno_id) ?? 'Aluno',
        description:
          item.descricao_snapshot ??
          item.titulo_snapshot ??
          activitySnapshot?.descricao ??
          activitySnapshot?.titulo ??
          item.observacao ??
          'Atividade registrada',
        amountEuras: Number(item.valor_euras ?? 0),
        date: dateTime.date,
        time: dateTime.time,
      }
    })
    .sort(sortActivitiesDesc)
}

async function listActivitiesFromLegacyEntries() {
  const { data: entries, error: entriesError } = await euras
    .from('lancamentos_alunos')
    .select('id, aluno_id, tipo, valor, observacao, criado_em')
    .in('tipo', ['credito', 'ajuste'])
    .order('criado_em', { ascending: false })

  if (entriesError) {
    if (isMissingRelationError(entriesError)) {
      return []
    }

    throw entriesError
  }

  const rows = entries ?? []
  if (rows.length === 0) {
    return []
  }

  const studentIds = [...new Set(rows.map((row) => row.aluno_id).filter(Boolean))]
  const studentNameMap = await loadStudentNameMap(studentIds)

  return rows
    .map((row) => {
      const dateTime = toDateTimeParts(row.criado_em)

      return {
        id: row.id,
        studentName: studentNameMap.get(row.aluno_id) ?? 'Aluno',
        description: row.observacao ?? 'Lancamento de Euras',
        amountEuras: Number(row.valor ?? 0),
        date: dateTime.date,
        time: dateTime.time,
      }
    })
    .sort(sortActivitiesDesc)
}

export function getActivitiesApiErrorMessage(error) {
  const message = error?.message ?? ''
  const normalizedMessage = message
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

  if (!message) {
    return 'Não foi possível carregar as atividades do banco.'
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

  return message
}

export async function listActivities() {
  await ensureFreshSession()

  const activitiesFromAwards = await listActivitiesFromAwards()

  if (activitiesFromAwards !== null && activitiesFromAwards.length > 0) {
    return activitiesFromAwards
  }

  const legacyActivities = await listActivitiesFromLegacyEntries()
  if (legacyActivities.length > 0) {
    return legacyActivities
  }

  return activitiesFromAwards ?? []
}
