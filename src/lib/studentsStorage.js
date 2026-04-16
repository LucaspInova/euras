const STORAGE_KEY = 'ceeds-students'

export const defaultStudents = [
  {
    id: 'student-1',
    name: 'ANA MARIA DE SOUZA AZEVEDO',
    course: 'ENFERMAGEM',
    campus: 'REDENCAO',
    phone: '(85) 99123-1001',
    entryDate: '12/02/2025',
    email: 'ana.maria@test.com',
    balance: '300,00',
  },
  {
    id: 'student-2',
    name: 'ANDERSON SILVA SANTOS',
    course: 'DIREITO',
    campus: 'MARACANAU',
    phone: '(85) 99123-1002',
    entryDate: '18/01/2025',
    email: 'anderson.santos@test.com',
    balance: '300,00',
  },
  {
    id: 'student-3',
    name: 'EDUARDO SILVA PEIXE',
    course: 'MEDICINA',
    campus: 'PENTECOSTES',
    phone: '(85) 99123-1003',
    entryDate: '07/03/2025',
    email: 'eduardo.peixe@test.com',
    balance: '300,00',
  },
  {
    id: 'student-4',
    name: 'GUSTAVO MACIEL DE LIMA GONCALVES',
    course: 'ENGENHARIA CIVIL',
    campus: 'MARACANAU',
    phone: '(85) 99123-1004',
    entryDate: '22/12/2025',
    email: 'aluno123@test.com',
    balance: '300,00',
  },
  {
    id: 'student-5',
    name: 'LUAN VICTOR PIRES FILHO',
    course: 'ARQUITETURA',
    campus: 'MARACANAU',
    phone: '(85) 99123-1005',
    entryDate: '10/02/2025',
    email: 'luan.victor@test.com',
    balance: '300,00',
  },
  {
    id: 'student-6',
    name: 'VANESSA ALENCAR TAVARES',
    course: 'PSICOLOGIA',
    campus: 'MARACANAU',
    phone: '(85) 99123-1006',
    entryDate: '28/01/2025',
    email: 'vanessa.tavares@test.com',
    balance: '300,00',
  },
  {
    id: 'student-7',
    name: 'BEATRIZ NOGUEIRA LIMA',
    course: 'ENFERMAGEM',
    campus: 'REDENCAO',
    phone: '(85) 99123-1007',
    entryDate: '05/02/2025',
    email: 'beatriz.lima@test.com',
    balance: '300,00',
  },
  {
    id: 'student-8',
    name: 'CARLOS EDUARDO MEDEIROS',
    course: 'DIREITO',
    campus: 'MARACANAU',
    phone: '(85) 99123-1008',
    entryDate: '09/02/2025',
    email: 'carlos.medeiros@test.com',
    balance: '300,00',
  },
  {
    id: 'student-9',
    name: 'DANIELA CRISTINA ROCHA',
    course: 'MEDICINA',
    campus: 'PENTECOSTES',
    phone: '(85) 99123-1009',
    entryDate: '11/02/2025',
    email: 'daniela.rocha@test.com',
    balance: '300,00',
  },
  {
    id: 'student-10',
    name: 'ERICK MATHEUS COSTA',
    course: 'ENGENHARIA CIVIL',
    campus: 'MARACANAU',
    phone: '(85) 99123-1010',
    entryDate: '13/02/2025',
    email: 'erick.costa@test.com',
    balance: '300,00',
  },
  {
    id: 'student-11',
    name: 'FERNANDA OLIVEIRA BRITO',
    course: 'ARQUITETURA',
    campus: 'MARACANAU',
    phone: '(85) 99123-1011',
    entryDate: '14/02/2025',
    email: 'fernanda.brito@test.com',
    balance: '300,00',
  },
  {
    id: 'student-12',
    name: 'GABRIEL HENRIQUE PEREIRA',
    course: 'PSICOLOGIA',
    campus: 'REDENCAO',
    phone: '(85) 99123-1012',
    entryDate: '17/02/2025',
    email: 'gabriel.pereira@test.com',
    balance: '300,00',
  },
  {
    id: 'student-13',
    name: 'HELENA SOARES MARTINS',
    course: 'ENFERMAGEM',
    campus: 'PENTECOSTES',
    phone: '(85) 99123-1013',
    entryDate: '18/02/2025',
    email: 'helena.martins@test.com',
    balance: '300,00',
  },
  {
    id: 'student-14',
    name: 'IGOR ALENCAR FREITAS',
    course: 'DIREITO',
    campus: 'MARACANAU',
    phone: '(85) 99123-1014',
    entryDate: '19/02/2025',
    email: 'igor.freitas@test.com',
    balance: '300,00',
  },
  {
    id: 'student-15',
    name: 'JULIANA BARBOSA SILVA',
    course: 'MEDICINA',
    campus: 'REDENCAO',
    phone: '(85) 99123-1015',
    entryDate: '20/02/2025',
    email: 'juliana.silva@test.com',
    balance: '300,00',
  },
  {
    id: 'student-16',
    name: 'KAIO VINICIUS ARAUJO',
    course: 'ENGENHARIA CIVIL',
    campus: 'PENTECOSTES',
    phone: '(85) 99123-1016',
    entryDate: '21/02/2025',
    email: 'kaio.araujo@test.com',
    balance: '300,00',
  },
  {
    id: 'student-17',
    name: 'LARISSA MOURA CARVALHO',
    course: 'ARQUITETURA',
    campus: 'MARACANAU',
    phone: '(85) 99123-1017',
    entryDate: '24/02/2025',
    email: 'larissa.carvalho@test.com',
    balance: '300,00',
  },
  {
    id: 'student-18',
    name: 'MARCOS VINICIUS DIAS',
    course: 'PSICOLOGIA',
    campus: 'REDENCAO',
    phone: '(85) 99123-1018',
    entryDate: '25/02/2025',
    email: 'marcos.dias@test.com',
    balance: '300,00',
  },
  {
    id: 'student-19',
    name: 'NATALIA CUNHA TEIXEIRA',
    course: 'ENFERMAGEM',
    campus: 'PENTECOSTES',
    phone: '(85) 99123-1019',
    entryDate: '26/02/2025',
    email: 'natalia.teixeira@test.com',
    balance: '300,00',
  },
  {
    id: 'student-20',
    name: 'OTAVIO LUCAS RIBEIRO',
    course: 'DIREITO',
    campus: 'MARACANAU',
    phone: '(85) 99123-1020',
    entryDate: '27/02/2025',
    email: 'otavio.ribeiro@test.com',
    balance: '300,00',
  },
  {
    id: 'student-21',
    name: 'PRISCILA FARIAS ALMEIDA',
    course: 'MEDICINA',
    campus: 'REDENCAO',
    phone: '(85) 99123-1021',
    entryDate: '28/02/2025',
    email: 'priscila.almeida@test.com',
    balance: '300,00',
  },
  {
    id: 'student-22',
    name: 'RAFAEL MONTEIRO CUNHA',
    course: 'ENGENHARIA CIVIL',
    campus: 'PENTECOSTES',
    phone: '(85) 99123-1022',
    entryDate: '03/03/2025',
    email: 'rafael.cunha@test.com',
    balance: '300,00',
  },
  {
    id: 'student-23',
    name: 'SAMARA GOMES FERREIRA',
    course: 'ARQUITETURA',
    campus: 'MARACANAU',
    phone: '(85) 99123-1023',
    entryDate: '04/03/2025',
    email: 'samara.ferreira@test.com',
    balance: '300,00',
  },
  {
    id: 'student-24',
    name: 'THIAGO HUGO BATISTA',
    course: 'PSICOLOGIA',
    campus: 'REDENCAO',
    phone: '(85) 99123-1024',
    entryDate: '05/03/2025',
    email: 'thiago.batista@test.com',
    balance: '300,00',
  },
  {
    id: 'student-25',
    name: 'URSULA MENDES SOUZA',
    course: 'ENFERMAGEM',
    campus: 'PENTECOSTES',
    phone: '(85) 99123-1025',
    entryDate: '06/03/2025',
    email: 'ursula.souza@test.com',
    balance: '300,00',
  },
  {
    id: 'student-26',
    name: 'VICTOR SALES CORDEIRO',
    course: 'DIREITO',
    campus: 'MARACANAU',
    phone: '(85) 99123-1026',
    entryDate: '07/03/2025',
    email: 'victor.cordeiro@test.com',
    balance: '300,00',
  },
  {
    id: 'student-27',
    name: 'WALLACE PINHO MORAIS',
    course: 'MEDICINA',
    campus: 'REDENCAO',
    phone: '(85) 99123-1027',
    entryDate: '10/03/2025',
    email: 'wallace.morais@test.com',
    balance: '300,00',
  },
  {
    id: 'student-28',
    name: 'YASMIN LOPES ALEXANDRE',
    course: 'ENGENHARIA CIVIL',
    campus: 'PENTECOSTES',
    phone: '(85) 99123-1028',
    entryDate: '11/03/2025',
    email: 'yasmin.alexandre@test.com',
    balance: '300,00',
  },
]

function normalizeStudent(student, index = 0) {
  return {
    id: student.id ?? `student-${index + 1}`,
    name: student.name ?? '',
    course: student.course ?? '',
    campus: student.campus ?? '',
    phone: student.phone ?? '(00) 00000-0000',
    entryDate: student.entryDate ?? '22/12/2025',
    email: student.email ?? 'aluno@test.com',
    balance: student.balance ?? '300,00',
  }
}

function hasWindow() {
  return typeof window !== 'undefined'
}

function mergeDefaultStudents(storedStudents) {
  const existingIds = new Set(storedStudents.map((student) => student.id))
  const missingDefaults = defaultStudents.filter((student) => !existingIds.has(student.id))
  return [...storedStudents, ...missingDefaults].map(normalizeStudent)
}

export function getStoredStudents() {
  if (!hasWindow()) {
    return defaultStudents.map(normalizeStudent)
  }

  const stored = window.localStorage.getItem(STORAGE_KEY)

  if (!stored) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultStudents))
    return defaultStudents.map(normalizeStudent)
  }

  try {
    const parsed = JSON.parse(stored)
    if (Array.isArray(parsed) && parsed.length > 0) {
      const mergedStudents = mergeDefaultStudents(parsed)
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(mergedStudents))
      return mergedStudents
    }

    return defaultStudents.map(normalizeStudent)
  } catch (error) {
    console.info('Nao foi possivel ler a lista local de alunos. Usando dados padrao.', error)
    return defaultStudents.map(normalizeStudent)
  }
}

export function addStoredStudent(student) {
  const currentStudents = getStoredStudents()
  const nextStudents = [normalizeStudent(student), ...currentStudents]

  if (hasWindow()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStudents))
  }

  return nextStudents
}

export function getStoredStudentById(studentId) {
  return getStoredStudents().find((student) => student.id === studentId) ?? null
}

export function removeStoredStudent(studentId) {
  const nextStudents = getStoredStudents().filter((student) => student.id !== studentId)

  if (hasWindow()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStudents))
  }

  return nextStudents
}

export function updateStoredStudent(studentId, updates) {
  const nextStudents = getStoredStudents().map((student) =>
    student.id === studentId ? normalizeStudent({ ...student, ...updates }) : student,
  )

  if (hasWindow()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextStudents))
  }

  return nextStudents.find((student) => student.id === studentId) ?? null
}
