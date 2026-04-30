import { centsToBalance } from './studentFormatters'
import { ensureFreshSession, supabase } from './supabase'

const euras = supabase.schema('euras')

function normalizeUpper(value) {
  return value?.trim().toUpperCase() ?? ''
}

function parseDateBr(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value ?? '')
  if (!match) return null

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const candidate = new Date(year, month - 1, day)

  const isValid =
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day

  if (!isValid) {
    return null
  }

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function isoToBrDate(value) {
  if (!value) return ''

  const dateOnly = String(value).slice(0, 10)
  const [year, month, day] = dateOnly.split('-')

  if (!year || !month || !day) {
    return ''
  }

  return `${day}/${month}/${year}`
}

function ensureInteger(value, fallback = 0) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return fallback
  }

  return Math.round(numeric)
}

function isMissingRelationError(error) {
  const message = String(error?.message ?? '').toLowerCase()
  return error?.code === 'PGRST205' || message.includes('could not find the table') || message.includes('relation')
}

function mapStudent(row) {
  return {
    id: row.id,
    name: row.nome_completo ?? '',
    course: row.curso ?? '',
    campus: row.campus ?? '',
    phone: row.telefone ?? '',
    entryDate: isoToBrDate(row.data_entrada),
    email: row.email ?? '',
    balance: centsToBalance(ensureInteger(row.saldo_euras)),
  }
}

async function listStudentsFromLegacyTables() {
  const { data: students, error: studentError } = await euras
    .from('alunos')
    .select('id, nome_completo, telefone, email, campus, curso, data_entrada, ativo')
    .eq('ativo', true)
    .order('nome_completo', { ascending: true })

  if (studentError) {
    throw studentError
  }

  const studentRows = students ?? []
  if (studentRows.length === 0) {
    return []
  }

  const ids = studentRows.map((row) => row.id)
  const { data: entries, error: entryError } = await euras
    .from('lancamentos_alunos')
    .select('aluno_id, tipo, valor')
    .in('aluno_id', ids)

  if (entryError && !isMissingRelationError(entryError)) {
    throw entryError
  }

  const balanceByStudentId = new Map()

  for (const entry of entries ?? []) {
    const current = balanceByStudentId.get(entry.aluno_id) ?? 0
    const value = ensureInteger(entry.valor)

    if (entry.tipo === 'debito') {
      balanceByStudentId.set(entry.aluno_id, current - value)
    } else {
      balanceByStudentId.set(entry.aluno_id, current + value)
    }
  }

  return studentRows.map((row) =>
    mapStudent({
      ...row,
      saldo_euras: balanceByStudentId.get(row.id) ?? 0,
    }),
  )
}

async function getStudentFromLegacyTables(studentId) {
  const { data: student, error: studentError } = await euras
    .from('alunos')
    .select('id, nome_completo, telefone, email, campus, curso, data_entrada, ativo')
    .eq('id', studentId)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (studentError) {
    throw studentError
  }

  if (!student) {
    return null
  }

  const { data: entries, error: entryError } = await euras
    .from('lancamentos_alunos')
    .select('tipo, valor')
    .eq('aluno_id', studentId)

  if (entryError && !isMissingRelationError(entryError)) {
    throw entryError
  }

  const balance = (entries ?? []).reduce((total, entry) => {
    const value = ensureInteger(entry.valor)
    return entry.tipo === 'debito' ? total - value : total + value
  }, 0)

  return mapStudent({
    ...student,
    saldo_euras: balance,
  })
}

async function upsertLegacyStudentIfPresent(studentId, profileData) {
  const { error } = await euras
    .from('alunos')
    .upsert(
      {
        id: studentId,
        nome_completo: profileData.nome_completo,
        telefone: profileData.telefone ?? '',
        email: profileData.email ?? '',
        campus: profileData.campus,
        curso: profileData.curso,
        data_entrada: profileData.data_entrada,
        ativo: profileData.ativo,
      },
      { onConflict: 'id' },
    )

  if (error && !isMissingRelationError(error)) {
    throw error
  }
}

async function setLegacyStudentActiveIfPresent(studentId, active) {
  const { error } = await euras
    .from('alunos')
    .update({ ativo: active })
    .eq('id', studentId)

  if (error && !isMissingRelationError(error)) {
    throw error
  }
}

async function resolveCreatorProfileId(createdByAuthUserId) {
  if (!createdByAuthUserId) {
    return null
  }

  const { data: profileByAuth, error: authLookupError } = await euras
    .from('perfis')
    .select('id')
    .eq('auth_user_id', createdByAuthUserId)
    .limit(1)
    .maybeSingle()

  if (authLookupError && !isMissingRelationError(authLookupError)) {
    throw authLookupError
  }

  if (profileByAutha.id) {
    return profileByAuth.id
  }

  const { data: profileById, error: idLookupError } = await euras
    .from('perfis')
    .select('id')
    .eq('id', createdByAuthUserId)
    .limit(1)
    .maybeSingle()

  if (idLookupError && !isMissingRelationError(idLookupError)) {
    throw idLookupError
  }

  return profileById?.id ?? null
}

async function insertLegacyCreditIfPresent({ studentId, amountInCents, createdByProfileId, note }) {
  const { error } = await euras
    .from('lancamentos_alunos')
    .insert({
      aluno_id: studentId,
      tipo: 'credito',
      valor: ensureInteger(amountInCents),
      observacao: note ?? '',
      criado_por: createdByProfileId,
    })

  if (!error) {
    return true
  }

  if (!isMissingRelationError(error)) {
    throw error
  }

  return false
}

export function getStudentApiErrorMessage(error) {
  const message = error?.message ?? ''
  const normalizedMessage = message
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

  if (!message) {
    return 'Não foi possível concluir a operação no banco de alunos.'
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

  if (error?.code === '23503') {
    return 'Não foi possível concluir a operação por referência inválida entre tabelas.'
  }

  if (normalizedMessage.includes('nao encontrado')) {
    return 'Aluno não encontrado no banco.'
  }

  return message
}

export async function listStudents() {
  await ensureFreshSession()

  const { data, error } = await euras
    .from('alunos_com_saldo')
    .select('id, nome_completo, telefone, email, campus, curso, data_entrada, ativo, saldo_euras')
    .eq('ativo', true)
    .order('nome_completo', { ascending: true })

  if (error) {
    if (isMissingRelationError(error)) {
      return listStudentsFromLegacyTables()
    }

    throw error
  }

  return (data ?? []).map(mapStudent)
}

export async function getStudentById(studentId) {
  await ensureFreshSession()

  const { data, error } = await euras
    .from('alunos_com_saldo')
    .select('id, nome_completo, telefone, email, campus, curso, data_entrada, ativo, saldo_euras')
    .eq('id', studentId)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (error) {
    if (isMissingRelationError(error)) {
      return getStudentFromLegacyTables(studentId)
    }

    throw error
  }

  return data ? mapStudent(data) : null
}

export async function createStudent(student) {
  await ensureFreshSession()

  const name = normalizeUpper(student?.name)
  const campus = normalizeUpper(student?.campus)
  const course = normalizeUpper(student?.course)
  const entryDate = parseDateBr(student?.entryDate?.trim() ?? '')

  if (!name || !campus || !course || !entryDate) {
    throw new Error('Preencha nome, campus, curso e uma data valida no formato dd/mm/aaaa.')
  }

  const payload = {
    nome_completo: name,
    papel: 'aluno',
    telefone: student?.phone?.trim() ?? '',
    email: student?.email?.trim() ?? '',
    campus,
    curso: course,
    data_entrada: entryDate,
    ativo: true,
  }

  const { data: profile, error } = await euras
    .from('perfis')
    .insert(payload)
    .select('id')
    .single()

  if (error) {
    throw error
  }

  await upsertLegacyStudentIfPresent(profile.id, payload)
}

export async function updateStudent(studentId, updates) {
  await ensureFreshSession()

  const nextName = normalizeUpper(updates?.name)
  const nextCourse = normalizeUpper(updates?.course)
  const nextCampus = normalizeUpper(updates?.campus)

  let parsedDate = null
  if (typeof updates?.entryDate === 'string' && updates.entryDate.trim()) {
    parsedDate = parseDateBr(updates.entryDate.trim())
    if (!parsedDate) {
      throw new Error('Preencha nome, campus, curso e uma data valida no formato dd/mm/aaaa.')
    }
  }

  const updatePayload = {
    nome_completo: nextName || undefined,
    curso: nextCourse || undefined,
    campus: nextCampus || undefined,
    telefone: updates?.phone?.trim() ?? '',
    email: updates?.email?.trim() ?? '',
    data_entrada: parsedDate ?? undefined,
  }

  const { data: updatedProfile, error } = await euras
    .from('perfis')
    .update(updatePayload)
    .eq('id', studentId)
    .eq('papel', 'aluno')
    .eq('ativo', true)
    .select('id, nome_completo, telefone, email, campus, curso, data_entrada, ativo')
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!updatedProfile) {
    throw new Error('Aluno não encontrado.')
  }

  await upsertLegacyStudentIfPresent(studentId, updatedProfile)

  const refreshedStudent = await getStudentById(studentId)
  if (!refreshedStudent) {
    throw new Error('Aluno não encontrado.')
  }

  return refreshedStudent
}

export async function removeStudent(studentId) {
  await ensureFreshSession()

  const { data, error } = await euras
    .from('perfis')
    .update({ ativo: false })
    .eq('id', studentId)
    .eq('papel', 'aluno')
    .eq('ativo', true)
    .select('id')
    .maybeSingle()

  if (error) {
    throw error
  }

  if (!data) {
    throw new Error('Aluno não encontrado.')
  }

  await setLegacyStudentActiveIfPresent(studentId, false)
}

export async function addStudentCredit({ studentId, amountInEuras, amountInCents, createdBy, note }) {
  await ensureFreshSession()

  const value = Number(amountInEuras ?? amountInCents)
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Informe um valor válido para transferencia.')
  }

  const student = await getStudentById(studentId)
  if (!student) {
    throw new Error('Aluno não encontrado.')
  }

  const createdByProfileId = await resolveCreatorProfileId(createdBy)

  const { error: walletError } = await euras
    .from('razao_carteira')
    .insert({
      aluno_id: studentId,
      tipo_entrada: 'credito',
      valor: ensureInteger(value),
      criado_por: createdByProfileId,
      observacao: note ?? 'Deposito de Euras pelo painel administrativo.',
    })

  const wroteWallet = !walletError

  if (walletError && !isMissingRelationError(walletError)) {
    throw walletError
  }

  const wroteLegacy = await insertLegacyCreditIfPresent({
    studentId,
    amountInCents: ensureInteger(value),
    createdByProfileId,
    note: note ?? 'Deposito de Euras pelo painel administrativo.',
  })

  if (!wroteWallet && !wroteLegacy) {
    throw new Error('Não foi possível registrar o deposito: tabelas de lancamento não foram encontradas.')
  }

  const refreshedStudent = await getStudentById(studentId)
  return refreshedStudent ?? student
}
