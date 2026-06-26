import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js'
import { centsToBalance } from './studentFormatters'
import { ensureFreshSession, supabase } from './supabase'

const euras = supabase.schema('euras')
const STUDENT_CREATE_FUNCTION_NAME = 'criar-aluno'
const STUDENT_REMOVE_FUNCTION_NAME = 'remover-aluno'
const STUDENT_CREATE_TIMEOUT_MS = 22000
const STUDENT_REMOVE_TIMEOUT_MS = 22000

function normalizeUpper(value) {
  return value?.trim().toUpperCase() ?? ''
}

function normalizeId(value) {
  return String(value ?? '').trim()
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

function isMissingColumnError(error, columnName) {
  const joined = [
    String(error?.message ?? ''),
    String(error?.details ?? ''),
    String(error?.hint ?? ''),
  ]
    .join(' ')
    .toLowerCase()

  return joined.includes(String(columnName ?? '').toLowerCase()) && joined.includes('column')
}

function isMissingAcademicColumnError(error) {
  return isMissingColumnError(error, 'sede_id') || isMissingColumnError(error, 'curso_id')
}

function isEmailAlreadyExistsError(error) {
  const message = String(error?.message ?? '').toLowerCase()
  return (
    message.includes('already') ||
    message.includes('exists') ||
    error?.code === 'email_exists' ||
    Number(error?.status) === 422
  )
}

function createStudentFunctionTimeout() {
  const error = new Error('Tempo limite ao criar o aluno com seguranca no servidor.')
  error.code = 'student_create_timeout'
  return error
}

async function parseFunctionHttpError(error) {
  const status = Number(error?.context?.status ?? 0) || 0
  let payload = null

  try {
    payload = await error.context.json()
  } catch {
    payload = null
  }

  const payloadError = payload?.error ?? {}
  const message =
    payloadError?.message ??
    payload?.message ??
    (status === 404
      ? 'Funcao segura de cadastro de aluno nao encontrada.'
      : 'Falha ao criar aluno pelo endpoint seguro.')

  const wrappedError = new Error(message)
  wrappedError.code =
    payloadError?.code ??
    payload?.code ??
    error?.name ??
    'edge_function_http_error'
  wrappedError.details = payloadError?.details ?? payload?.details
  wrappedError.hint = payloadError?.hint ?? payload?.hint
  wrappedError.status = status || payload?.status
  wrappedError.cause = error

  return wrappedError
}

async function normalizeStudentCreateFunctionError(error) {
  if (error instanceof FunctionsHttpError) {
    return parseFunctionHttpError(error)
  }

  if (error instanceof FunctionsRelayError) {
    const wrappedError = new Error(
      'Falha ao encaminhar o cadastro seguro para o Supabase Functions.',
    )
    wrappedError.code = 'edge_function_relay_error'
    wrappedError.cause = error
    return wrappedError
  }

  if (error instanceof FunctionsFetchError) {
    const wrappedError = new Error(
      'Nao foi possivel conectar ao endpoint seguro de cadastro de aluno.',
    )
    wrappedError.code = 'edge_function_fetch_error'
    wrappedError.cause = error
    return wrappedError
  }

  return error instanceof Error
    ? error
    : new Error('Falha inesperada ao criar aluno no servidor.')
}

async function normalizeStudentRemoveFunctionError(error) {
  if (error instanceof FunctionsHttpError) {
    const status = Number(error?.context?.status ?? 0) || 0
    let payload = null

    try {
      payload = await error.context.json()
    } catch {
      payload = null
    }

    const payloadError = payload?.error ?? {}
    const message =
      payloadError?.message ??
      payload?.message ??
      (status === 404
        ? 'Funcao segura de remocao de aluno nao encontrada.'
        : 'Falha ao remover aluno pelo endpoint seguro.')

    const wrappedError = new Error(message)
    wrappedError.code =
      payloadError?.code ??
      payload?.code ??
      error?.name ??
      'edge_function_http_error'
    wrappedError.details = payloadError?.details ?? payload?.details
    wrappedError.hint = payloadError?.hint ?? payload?.hint
    wrappedError.status = status || payload?.status
    wrappedError.cause = error

    return wrappedError
  }

  if (error instanceof FunctionsRelayError) {
    const wrappedError = new Error(
      'Falha ao encaminhar a remocao segura para o Supabase Functions.',
    )
    wrappedError.code = 'edge_function_relay_error'
    wrappedError.cause = error
    return wrappedError
  }

  if (error instanceof FunctionsFetchError) {
    const wrappedError = new Error(
      'Nao foi possivel conectar ao endpoint seguro de remocao de aluno.',
    )
    wrappedError.code = 'edge_function_fetch_error'
    wrappedError.cause = error
    return wrappedError
  }

  return error instanceof Error
    ? error
    : new Error('Falha inesperada ao remover aluno no servidor.')
}

async function invokeSecureStudentCreate(payload, session) {
  let timeoutId = null
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(createStudentFunctionTimeout()),
      STUDENT_CREATE_TIMEOUT_MS,
    )
  })

  try {
    return await Promise.race([
      supabase.functions.invoke(STUDENT_CREATE_FUNCTION_NAME, {
        body: payload,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }),
      timeoutPromise,
    ])
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
  }
}

async function invokeSecureStudentRemove(payload, session) {
  let timeoutId = null
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      const error = new Error('Tempo limite ao remover o aluno com seguranca no servidor.')
      error.code = 'student_remove_timeout'
      reject(error)
    }, STUDENT_REMOVE_TIMEOUT_MS)
  })

  try {
    return await Promise.race([
      supabase.functions.invoke(STUDENT_REMOVE_FUNCTION_NAME, {
        body: payload,
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      }),
      timeoutPromise,
    ])
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
  }
}

async function createStudentFromSecureServer(payload, session) {
  const { data, error } = await invokeSecureStudentCreate(payload, session)

  if (error) {
    throw await normalizeStudentCreateFunctionError(error)
  }

  const studentId = data?.studentId ?? data?.aluno_id ?? data?.profileId ?? data?.perfil_id ?? null

  if (!studentId) {
    throw new Error('Cadastro criado sem identificador de aluno retornado pelo servidor.')
  }

  return {
    studentId,
    profileId: data?.profileId ?? null,
  }
}

function mapStudent(row) {
  return {
    id: row.id,
    name: row.nome_completo ?? '',
    course: row.curso_nome ?? row.curso ?? '',
    campus: row.sede_nome ?? row.campus ?? row.sede ?? '',
    courseId: row.curso_id ?? null,
    campusId: row.sede_id ?? null,
    phone: row.telefone ?? '',
    entryDate: isoToBrDate(row.data_entrada),
    email: row.email ?? '',
    balance: centsToBalance(ensureInteger(row.saldo_euras)),
  }
}

async function listStudentsFromLegacyTables() {
  let query = euras
    .from('alunos')
    .select('*')
    .eq('ativo', true)
    .not('curso', 'is', null)
    .not('campus', 'is', null)
    .neq('curso', '')
    .neq('campus', '')
    .order('nome_completo', { ascending: true })

  let { data: students, error: studentError } = await query

  if (studentError && isMissingColumnError(studentError, 'campus')) {
    query = euras
      .from('alunos')
      .select('*')
      .eq('ativo', true)
      .not('curso', 'is', null)
      .not('sede', 'is', null)
      .neq('curso', '')
      .neq('sede', '')
      .order('nome_completo', { ascending: true })

    const fallbackResponse = await query
    students = fallbackResponse.data
    studentError = fallbackResponse.error
  }

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
        sede_id: profileData.sede_id ?? null,
        curso_id: profileData.curso_id ?? null,
        data_entrada: profileData.data_entrada,
        ativo: profileData.ativo,
      },
      { onConflict: 'id' },
    )

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

  if (profileByAuth?.id) {
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

  if (isEmailAlreadyExistsError(error)) {
    return 'Este e-mail já possui uma conta no sistema. Verifique se o aluno já existe ou use outro e-mail.'
  }

  if (
    normalizedMessage.includes('criar-aluno') ||
    normalizedMessage.includes('remover-aluno') ||
    normalizedMessage.includes('cadastro de aluno nao encontrada') ||
    normalizedMessage.includes('remocao de aluno nao encontrada')
  ) {
    return normalizedMessage.includes('remover-aluno') ||
      normalizedMessage.includes('remocao de aluno nao encontrada')
      ? 'Funcao segura de remocao nao encontrada. Faca o deploy da edge function remover-aluno.'
      : 'Funcao segura de cadastro nao encontrada. Faca o deploy da edge function criar-aluno.'
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

  let query = euras
    .from('alunos_com_saldo')
    .select('id, nome_completo, telefone, email, campus, curso, data_entrada, ativo, saldo_euras, sede_id, sede_nome, curso_id, curso_nome')
    .eq('ativo', true)
    .not('curso', 'is', null)
    .not('campus', 'is', null)
    .neq('curso', '')
    .neq('campus', '')
    .order('nome_completo', { ascending: true })

  let { data, error } = await query

  if (error && isMissingAcademicColumnError(error)) {
    query = euras
      .from('alunos_com_saldo')
      .select('id, nome_completo, telefone, email, campus, curso, data_entrada, ativo, saldo_euras')
      .eq('ativo', true)
      .not('curso', 'is', null)
      .not('campus', 'is', null)
      .neq('curso', '')
      .neq('campus', '')
      .order('nome_completo', { ascending: true })

    const fallbackResponse = await query
    data = fallbackResponse.data
    error = fallbackResponse.error
  }

  if (error && isMissingColumnError(error, 'campus')) {
    query = euras
      .from('alunos_com_saldo')
      .select('id, nome_completo, telefone, email, sede, curso, data_entrada, ativo, saldo_euras')
      .eq('ativo', true)
      .not('curso', 'is', null)
      .not('sede', 'is', null)
      .neq('curso', '')
      .neq('sede', '')
      .order('nome_completo', { ascending: true })

    const fallbackResponse = await query
    data = fallbackResponse.data
    error = fallbackResponse.error
  }

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

  let { data, error } = await euras
    .from('alunos_com_saldo')
    .select('id, nome_completo, telefone, email, campus, curso, data_entrada, ativo, saldo_euras, sede_id, sede_nome, curso_id, curso_nome')
    .eq('id', studentId)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  if (error && isMissingAcademicColumnError(error)) {
    const fallbackResponse = await euras
      .from('alunos_com_saldo')
      .select('id, nome_completo, telefone, email, campus, curso, data_entrada, ativo, saldo_euras')
      .eq('id', studentId)
      .eq('ativo', true)
      .limit(1)
      .maybeSingle()

    data = fallbackResponse.data
    error = fallbackResponse.error
  }

  if (error) {
    if (isMissingRelationError(error)) {
      return getStudentFromLegacyTables(studentId)
    }

    throw error
  }

  return data ? mapStudent(data) : null
}

export async function createStudent(student) {
  const session = await ensureFreshSession()

  const name = normalizeUpper(student?.name)
  const campus = normalizeUpper(student?.campus)
  const course = normalizeUpper(student?.course)
  const sedeId = normalizeId(student?.campusId ?? student?.sedeId ?? student?.sede_id)
  const cursoId = normalizeId(student?.courseId ?? student?.cursoId ?? student?.curso_id)
  const email = student?.email?.trim().toLowerCase() ?? ''
  const password = student?.password?.trim() ?? ''
  const entryDate = parseDateBr(student?.entryDate?.trim() ?? '')

  if (!name || !campus || !course || !sedeId || !cursoId || !email || !password || !entryDate) {
    throw new Error('Preencha nome, sede, curso, e-mail, senha e uma data valida no formato dd/mm/aaaa.')
  }

  if (password.length < 6) {
    throw new Error('A senha deve ter no minimo 6 caracteres.')
  }

  const payload = {
    nome_completo: name,
    telefone: student?.phone?.trim() ?? '',
    email,
    senha: password,
    sede_id: sedeId,
    curso_id: cursoId,
    campus,
    curso: course,
    data_entrada: entryDate,
  }

  await createStudentFromSecureServer(payload, session)
}

export async function criarAluno(student) {
  return createStudent(student)
}

export async function updateStudent(studentId, updates) {
  await ensureFreshSession()

  const nextName = normalizeUpper(updates?.name)
  const nextCourse = normalizeUpper(updates?.course)
  const nextCampus = normalizeUpper(updates?.campus)
  const nextCourseId = normalizeId(updates?.courseId ?? updates?.cursoId ?? updates?.curso_id)
  const nextCampusId = normalizeId(updates?.campusId ?? updates?.sedeId ?? updates?.sede_id)

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
    curso_id: nextCourseId || undefined,
    sede_id: nextCampusId || undefined,
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
    .select('id, nome_completo, telefone, email, campus, curso, sede_id, curso_id, data_entrada, ativo')
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
  const session = await ensureFreshSession()

  const { error } = await invokeSecureStudentRemove({ studentId }, session)
  if (error) {
    throw await normalizeStudentRemoveFunctionError(error)
  }
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
