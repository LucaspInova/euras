import { centsToBalance } from './studentFormatters'

const MOCK_LATENCY_MS = 80

const initialStudents = [
  {
    id: 'student-1',
    name: 'ALANA SILVA MOURA',
    course: 'ENGENHARIA CIVIL',
    campus: 'MARACANAU',
    phone: '(85)99876-1001',
    entryDate: '12/02/2024',
    email: 'alana.moura@ceeds.com',
    balanceInCents: 15250,
  },
  {
    id: 'student-2',
    name: 'BRUNO MARTINS RIBEIRO',
    course: 'DIREITO',
    campus: 'REDENCAO',
    phone: '(85)99876-1002',
    entryDate: '05/03/2024',
    email: 'bruno.ribeiro@ceeds.com',
    balanceInCents: 8300,
  },
  {
    id: 'student-3',
    name: 'CAMILA ALMEIDA SOUZA',
    course: 'ENFERMAGEM',
    campus: 'PENTECOSTES',
    phone: '(85)99876-1003',
    entryDate: '22/01/2024',
    email: 'camila.souza@ceeds.com',
    balanceInCents: 2030,
  },
  {
    id: 'student-4',
    name: 'DANIEL OLIVEIRA COSTA',
    course: 'MEDICINA',
    campus: 'MARACANAU',
    phone: '(85)99876-1004',
    entryDate: '10/08/2023',
    email: 'daniel.costa@ceeds.com',
    balanceInCents: 41200,
  },
  {
    id: 'student-5',
    name: 'ESTER LIMA FREITAS',
    course: 'PSICOLOGIA',
    campus: 'REDENCAO',
    phone: '(85)99876-1005',
    entryDate: '30/07/2024',
    email: 'ester.freitas@ceeds.com',
    balanceInCents: 9900,
  },
  {
    id: 'student-6',
    name: 'FABIO HENRIQUE ROCHA',
    course: 'ADMINISTRACAO',
    campus: 'MARACANAU',
    phone: '(85)99876-1006',
    entryDate: '15/02/2024',
    email: 'fabio.rocha@ceeds.com',
    balanceInCents: 13500,
  },
  {
    id: 'student-7',
    name: 'GABRIELA NUNES PEREIRA',
    course: 'ANALISE E DESENVOLVIMENTO DE SISTEMAS',
    campus: 'REDENCAO',
    phone: '(85)99876-1007',
    entryDate: '02/04/2024',
    email: 'gabriela.pereira@ceeds.com',
    balanceInCents: 24800,
  },
  {
    id: 'student-8',
    name: 'HELENA BARROS DE LIMA',
    course: 'ENFERMAGEM',
    campus: 'PENTECOSTES',
    phone: '(85)99876-1008',
    entryDate: '19/03/2024',
    email: 'helena.lima@ceeds.com',
    balanceInCents: 7800,
  },
  {
    id: 'student-9',
    name: 'IGOR MOURA FREIRE',
    course: 'ENGENHARIA DE SOFTWARE',
    campus: 'MARACANAU',
    phone: '(85)99876-1009',
    entryDate: '05/08/2023',
    email: 'igor.freire@ceeds.com',
    balanceInCents: 30100,
  },
  {
    id: 'student-10',
    name: 'JOANA CRISTINA ALVES',
    course: 'MEDICINA',
    campus: 'MARACANAU',
    phone: '(85)99876-1010',
    entryDate: '11/01/2024',
    email: 'joana.alves@ceeds.com',
    balanceInCents: 4200,
  },
  {
    id: 'student-11',
    name: 'KAIQUE TELES MACEDO',
    course: 'DIREITO',
    campus: 'REDENCAO',
    phone: '(85)99876-1011',
    entryDate: '27/02/2024',
    email: 'kaique.macedo@ceeds.com',
    balanceInCents: 16200,
  },
  {
    id: 'student-12',
    name: 'LARISSA TEIXEIRA ARAUJO',
    course: 'PSICOLOGIA',
    campus: 'PENTECOSTES',
    phone: '(85)99876-1012',
    entryDate: '08/04/2024',
    email: 'larissa.araujo@ceeds.com',
    balanceInCents: 5500,
  },
  {
    id: 'student-13',
    name: 'MARCOS VINICIUS NOBRE',
    course: 'CIENCIAS CONTABEIS',
    campus: 'REDENCAO',
    phone: '(85)99876-1013',
    entryDate: '21/05/2024',
    email: 'marcos.nobre@ceeds.com',
    balanceInCents: 11900,
  },
  {
    id: 'student-14',
    name: 'NATHALIA PRADO FERREIRA',
    course: 'BIOMEDICINA',
    campus: 'MARACANAU',
    phone: '(85)99876-1014',
    entryDate: '09/09/2023',
    email: 'nathalia.ferreira@ceeds.com',
    balanceInCents: 27100,
  },
  {
    id: 'student-15',
    name: 'OTAVIO LOPES CAMPOS',
    course: 'ARQUITETURA',
    campus: 'PENTECOSTES',
    phone: '(85)99876-1015',
    entryDate: '12/02/2024',
    email: 'otavio.campos@ceeds.com',
    balanceInCents: 8800,
  },
]

let students = initialStudents.map((student) => ({ ...student }))
let nextStudentNumber = initialStudents.length + 1

function sleep() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_LATENCY_MS)
  })
}

function normalizeUpper(value) {
  return value?.trim().toUpperCase() ?? ''
}

function isValidDate(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value ?? '')
  if (!match) return false

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  const candidate = new Date(year, month - 1, day)

  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  )
}

function findStudentIndex(studentId) {
  return students.findIndex((student) => String(student.id) === String(studentId))
}

function mapStudent(student) {
  return {
    id: student.id,
    name: student.name ?? '',
    course: student.course ?? '',
    campus: student.campus ?? '',
    phone: student.phone ?? '',
    entryDate: student.entryDate ?? '',
    email: student.email ?? '',
    balance: centsToBalance(student.balanceInCents ?? 0),
  }
}

export function getStudentApiErrorMessage(error) {
  const message = error?.message ?? ''

  if (!message) {
    return 'Nao foi possivel concluir a operacao com os dados mockados de alunos.'
  }

  if (message.toLowerCase().includes('nao encontrado')) {
    return 'Aluno nao encontrado na base mockada.'
  }

  return message
}

export async function listStudents() {
  await sleep()

  return students
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(mapStudent)
}

export async function getStudentById(studentId) {
  await sleep()

  const student = students.find((item) => String(item.id) === String(studentId))
  return student ? mapStudent(student) : null
}

export async function createStudent(student) {
  await sleep()

  const name = normalizeUpper(student?.name)
  const campus = normalizeUpper(student?.campus)
  const course = normalizeUpper(student?.course)
  const entryDate = student?.entryDate?.trim() ?? ''

  if (!name || !campus || !course || !isValidDate(entryDate)) {
    throw new Error('Preencha nome, campus, curso e uma data valida no formato dd/mm/aaaa.')
  }

  students.push({
    id: `student-${nextStudentNumber}`,
    name,
    course,
    campus,
    phone: student?.phone?.trim() ?? '',
    entryDate,
    email: student?.email?.trim() ?? '',
    balanceInCents: 0,
  })

  nextStudentNumber += 1
}

export async function updateStudent(studentId, updates) {
  await sleep()

  const index = findStudentIndex(studentId)
  if (index < 0) {
    throw new Error('Aluno nao encontrado.')
  }

  const current = students[index]
  const nextStudent = {
    ...current,
    name: normalizeUpper(updates?.name) || current.name,
    course: normalizeUpper(updates?.course) || current.course,
    campus: normalizeUpper(updates?.campus) || current.campus,
    phone: updates?.phone?.trim() ?? '',
    entryDate: updates?.entryDate?.trim() ?? '',
    email: updates?.email?.trim() ?? '',
  }

  students[index] = nextStudent
  return mapStudent(nextStudent)
}

export async function removeStudent(studentId) {
  await sleep()

  const index = findStudentIndex(studentId)
  if (index < 0) {
    throw new Error('Aluno nao encontrado.')
  }

  students.splice(index, 1)
}

export async function addStudentCredit({ studentId, amountInCents }) {
  await sleep()

  const value = Number(amountInCents)
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Informe um valor valido para transferencia.')
  }

  const index = findStudentIndex(studentId)
  if (index < 0) {
    throw new Error('Aluno nao encontrado.')
  }

  students[index] = {
    ...students[index],
    balanceInCents: (students[index].balanceInCents ?? 0) + Math.round(value),
  }

  return mapStudent(students[index])
}
