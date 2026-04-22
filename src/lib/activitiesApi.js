const MOCK_LATENCY_MS = 90

const initialActivities = [
  { id: 'activity-1', studentName: 'Ana Maria de Souza Azevedo', description: 'Maior nota da turma', amountEuras: 100, date: '2026-02-05', time: '18:59' },
  { id: 'activity-2', studentName: 'Anderson Silva Santos', description: 'Sem faltas no semestre', amountEuras: 65, date: '2026-02-05', time: '17:01' },
  { id: 'activity-3', studentName: 'Eduardo Silva Peixe', description: 'Semestre concluido', amountEuras: 50, date: '2026-02-04', time: '13:22' },
  { id: 'activity-4', studentName: 'Luan Victor Pires Filho', description: 'Rematricula', amountEuras: 80, date: '2026-02-02', time: '15:00' },
  { id: 'activity-5', studentName: 'Vanessa Alencar Carvalho', description: 'Rematricula', amountEuras: 80, date: '2026-02-02', time: '14:57' },
  { id: 'activity-6', studentName: 'Livia Moreira Mota', description: 'Indicacao aprovada', amountEuras: 35, date: '2026-02-01', time: '11:12' },
  { id: 'activity-7', studentName: 'Bruno Martins Ribeiro', description: 'Participacao no evento academico', amountEuras: 20, date: '2026-01-31', time: '10:45' },
  { id: 'activity-8', studentName: 'Camila Almeida Souza', description: 'Projeto de extensao entregue', amountEuras: 70, date: '2026-01-30', time: '19:40' },
  { id: 'activity-9', studentName: 'Daniel Oliveira Costa', description: 'Monitoria finalizada', amountEuras: 55, date: '2026-01-29', time: '16:08' },
  { id: 'activity-10', studentName: 'Ester Lima Freitas', description: 'Sem faltas no mes', amountEuras: 40, date: '2026-01-28', time: '18:00' },
  { id: 'activity-11', studentName: 'Fabio Henrique Rocha', description: 'Participacao em olimpiada', amountEuras: 75, date: '2026-01-27', time: '08:33' },
  { id: 'activity-12', studentName: 'Gabriela Nunes Pereira', description: 'Rematricula', amountEuras: 80, date: '2026-01-26', time: '14:31' },
  { id: 'activity-13', studentName: 'Helena Barros de Lima', description: 'Prova com nota maxima', amountEuras: 95, date: '2026-01-25', time: '20:11' },
  { id: 'activity-14', studentName: 'Igor Moura Freire', description: 'Sem atrasos no trimestre', amountEuras: 32, date: '2026-01-24', time: '09:18' },
  { id: 'activity-15', studentName: 'Joana Cristina Alves', description: 'Projeto interdisciplinar aprovado', amountEuras: 60, date: '2026-01-23', time: '12:50' },
  { id: 'activity-16', studentName: 'Kaique Teles Macedo', description: 'Participacao em oficina', amountEuras: 18, date: '2026-01-22', time: '17:26' },
  { id: 'activity-17', studentName: 'Larissa Teixeira Araujo', description: 'Sem faltas no semestre', amountEuras: 65, date: '2026-01-21', time: '18:58' },
  { id: 'activity-18', studentName: 'Marcos Vinicius Nobre', description: 'Rematricula', amountEuras: 80, date: '2026-01-20', time: '16:02' },
  { id: 'activity-19', studentName: 'Nathalia Prado Ferreira', description: 'Desafio academico concluido', amountEuras: 45, date: '2026-01-19', time: '10:06' },
  { id: 'activity-20', studentName: 'Otavio Lopes Campos', description: 'Monitoria concluida', amountEuras: 55, date: '2026-01-18', time: '11:55' },
  { id: 'activity-21', studentName: 'Paula Raquel Almeida', description: 'Maior media da disciplina', amountEuras: 88, date: '2026-01-17', time: '13:37' },
  { id: 'activity-22', studentName: 'Rafael Gomes Siqueira', description: 'Sem ocorrencias no periodo', amountEuras: 27, date: '2026-01-16', time: '14:09' },
  { id: 'activity-23', studentName: 'Sara Menezes Costa', description: 'Participacao em palestra', amountEuras: 14, date: '2026-01-15', time: '08:41' },
  { id: 'activity-24', studentName: 'Tiago Lucas Fernandes', description: 'Rematricula', amountEuras: 80, date: '2026-01-14', time: '15:15' },
]

let activities = initialActivities.map((activity) => ({ ...activity }))

function sleep() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, MOCK_LATENCY_MS)
  })
}

function compareActivitiesDesc(a, b) {
  if (a.date !== b.date) {
    return b.date.localeCompare(a.date)
  }

  return b.time.localeCompare(a.time)
}

export function getActivitiesApiErrorMessage(error) {
  const message = error?.message ?? ''

  if (!message) {
    return 'Nao foi possivel carregar as atividades mockadas.'
  }

  return message
}

export async function listActivities() {
  await sleep()

  return activities
    .slice()
    .sort(compareActivitiesDesc)
    .map((activity) => ({ ...activity }))
}
