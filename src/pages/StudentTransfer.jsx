import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import SidebarLayout from '../components/SidebarLayout'
import {
  balanceToCents,
  centsToBalance,
  formatBalanceInput,
} from '../lib/studentFormatters'
import { getStoredStudentById, updateStoredStudent } from '../lib/studentsStorage'

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20 12H6.5M11.5 6 5 12l6.5 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function StudentTransfer() {
  const navigate = useNavigate()
  const { studentId } = useParams()
  const student = useMemo(() => getStoredStudentById(studentId), [studentId])
  const [amount, setAmount] = useState('')

  if (!student) {
    return <Navigate to="/alunos" replace />
  }

  const handleConfirm = () => {
    const currentBalance = balanceToCents(student.balance)
    const transferAmount = balanceToCents(amount)

    if (!transferAmount) {
      return
    }

    const nextBalance = centsToBalance(currentBalance + transferAmount)

    updateStoredStudent(student.id, { balance: nextBalance })

    navigate('/alunos', {
      replace: true,
      state: {
        transferSuccess: {
          studentName: student.name,
          amount,
        },
      },
    })
  }

  return (
    <SidebarLayout>
      <section className="student-transfer-page">
        <div className="student-create-header">
          <h1 className="students-heading">Transferir Euras</h1>

          <button
            type="button"
            className="student-back-button"
            aria-label="Voltar para o controle do aluno"
            onClick={() => navigate(`/alunos/${student.id}`)}
          >
            <BackIcon />
          </button>
        </div>

        <section className="student-create-card student-transfer-card">
          <p className="student-transfer-text">Voce deseja transferir</p>

          <label className="student-transfer-amount">
            <span>{'<'}</span>
            <input
              type="text"
              value={amount}
              onChange={(event) => setAmount(formatBalanceInput(event.target.value))}
              aria-label="Valor a transferir"
              placeholder="300,00"
            />
          </label>

          <p className="student-transfer-text">para:</p>
          <strong className="student-transfer-name">{student.name}</strong>

          <button type="button" className="student-submit-button student-transfer-button" onClick={handleConfirm}>
            Confirmar
          </button>
        </section>
      </section>
    </SidebarLayout>
  )
}
