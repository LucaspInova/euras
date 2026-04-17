import { supabase } from './supabase'
import { centsToBalance } from './studentFormatters'

const euras = supabase.schema('euras')
const SUPABASE_TIMEOUT_MS = 15000

function withTimeout(promise, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      window.setTimeout(() => {
        reject(new Error(message))
      }, SUPABASE_TIMEOUT_MS)
    }),
  ])
}

export function getStudentApiErrorMessage(error) {
  const message = error?.message ?? ''

  if (!message) {
    return 'Nao foi possivel concluir a operacao no Supabase.'
  }

  if (message.includes('relation') && message.includes('euras.alunos')) {
    return 'A tabela euras.alunos ainda nao existe no Supabase. Rode o SQL do schema e o SQL de alunos.'
  }

  if (message.toLowerCase().includes('permission denied for schema euras')) {
    return 'O schema euras ainda nao esta liberado para a API autenticada.'
  }

  if (message.toLowerCase().includes('violates row-level security policy')) {
    return 'Seu usuario atual nao passou nas regras de admin do schema euras.'
  }

  if (message.toLowerCase().includes('could not find the table')) {
    return 'A API do Supabase ainda nao esta enxergando o schema euras. Verifique se ele foi exposto nas configuracoes da API.'
  }

  if (message.toLowerCase().includes('tempo limite')) {
    return 'O Supabase demorou demais para responder. Recarregue a pagina e tente novamente.'
  }

  return message
}

function formatDateToView(value) {
  if (!value) return ''

  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return ''

  return `${day}/${month}/${year}`
}

function formatDateToDatabase(value) {
  if (!value) return null

  const [day, month, year] = value.split('/')
  if (!day || !month || !year) return null

  if (day.length !== 2 || month.length !== 2 || year.length !== 4) {
    return null
  }

  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
}

function mapStudentRow(row) {
  return {
    id: row.id,
    name: row.nome_completo ?? '',
    course: row.curso ?? '',
    campus: row.campus ?? '',
    phone: row.telefone ?? '',
    entryDate: formatDateToView(row.data_entrada),
    email: row.email ?? '',
    balance: centsToBalance(row.saldo_euras ?? 0),
  }
}

function mapStudentPayload(student) {
  return {
    nome_completo: student.name?.trim().toUpperCase() ?? '',
    telefone: student.phone?.trim() || null,
    email: student.email?.trim() || null,
    campus: student.campus?.trim().toUpperCase() ?? '',
    curso: student.course?.trim().toUpperCase() ?? '',
    data_entrada: formatDateToDatabase(student.entryDate),
  }
}

async function fetchStudentFromView(studentId) {
  const { data, error } = await withTimeout(
    euras
      .from('alunos_com_saldo')
      .select('*')
      .eq('id', studentId)
      .single(),
    'Tempo limite ao consultar aluno no Supabase.',
  )

  if (error) {
    throw error
  }

  return mapStudentRow(data)
}

export async function listStudents() {
  const { data, error } = await withTimeout(
    euras
      .from('alunos_com_saldo')
      .select('*')
      .eq('ativo', true)
      .order('nome_completo'),
    'Tempo limite ao listar alunos no Supabase.',
  )

  if (error) {
    throw error
  }

  return data.map(mapStudentRow)
}

export async function getStudentById(studentId) {
  try {
    return await fetchStudentFromView(studentId)
  } catch (error) {
    if (error.code === 'PGRST116') {
      return null
    }

    throw error
  }
}

export async function createStudent(student) {
  const payload = mapStudentPayload(student)

  if (!payload.nome_completo || !payload.campus || !payload.curso || !payload.data_entrada) {
    throw new Error('Preencha nome, campus, curso e uma data valida no formato dd/mm/aaaa.')
  }

  const { error } = await withTimeout(
    euras.from('alunos').insert(payload),
    'Tempo limite ao salvar aluno no Supabase.',
  )

  if (error) {
    throw error
  }
}

export async function updateStudent(studentId, updates) {
  const payload = mapStudentPayload(updates)

  const { error } = await withTimeout(
    euras
      .from('alunos')
      .update(payload)
      .eq('id', studentId),
    'Tempo limite ao atualizar aluno no Supabase.',
  )

  if (error) {
    throw error
  }

  return fetchStudentFromView(studentId)
}

export async function removeStudent(studentId) {
  const { error } = await withTimeout(
    euras
      .from('alunos')
      .delete()
      .eq('id', studentId),
    'Tempo limite ao remover aluno no Supabase.',
  )

  if (error) {
    throw error
  }
}

export async function addStudentCredit({ studentId, amountInCents, createdBy, note }) {
  const { error } = await withTimeout(
    euras
      .from('lancamentos_alunos')
      .insert({
        aluno_id: studentId,
        tipo: 'credito',
        valor: amountInCents,
        criado_por: createdBy ?? null,
        observacao: note ?? null,
      }),
    'Tempo limite ao registrar credito no Supabase.',
  )

  if (error) {
    throw error
  }

  return fetchStudentFromView(studentId)
}
