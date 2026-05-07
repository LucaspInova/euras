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

function toStatusQuery(statusFilter) {
  if (statusFilter === 'approved') return 'confirmado'
  if (statusFilter === 'rejected') return 'cancelado'
  return null
}

async function listActivitiesFromResgates(statusFilter = 'all') {
  let query = euras
    .from('resgates')
    .select(`
      id,
      valor_euras,
      status,
      criado_em,
      aluno:aluno_id ( nome_completo ),
      parceiro:parceiro_id ( nome_completo ),
      produto:produto_id ( titulo )
    `)
    .order('criado_em', { ascending: false })

  const dbStatus = toStatusQuery(statusFilter)
  if (dbStatus) {
    query = query.eq('status', dbStatus)
  }

  const { data, error } = await query

  if (error) {
    if (isMissingRelationError(error)) {
      return []
    }

    throw error
  }

  return (data ?? [])
    .map((row) => {
      const dateTime = toDateTimeParts(row.criado_em)

      return {
        id: row.id,
        studentName:
          row.aluno?.nome_completo ?? 'Aluno',
        partnerName:
          row.parceiro?.nome_completo ?? 'Parceiro',
        productName:
          row.produto?.titulo ?? 'Produto',
        amountEuras: Number(row.valor_euras ?? 0),
        status: row.status ?? '',
        createdAt: row.criado_em ?? '',
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

export async function listActivities(statusFilter = 'all') {
  await ensureFreshSession()
  return listActivitiesFromResgates(statusFilter)
}
