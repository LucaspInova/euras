import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import SidebarLayout from '../components/SidebarLayout'
import {
  balanceToCents,
  formatBalanceInput,
} from '../lib/studentFormatters'
import { useAuth } from '../context/AuthContext'
import { addStudentCredit, getStudentApiErrorMessage, getStudentById } from '../lib/studentsApi'

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
  const { user } = useAuth()
  const [student, setStudent] = useState(null)
  const [loadingStudent, setLoadingStudent] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [amount, setAmount] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    let active = true

    async function loadStudent() {
      setLoadingStudent(true)
      setLoadError('')

      try {
        const nextStudent = await getStudentById(studentId)

        if (!active) {
          return
        }

        setStudent(nextStudent)
      } catch (error) {
        if (!active) {
          return
        }

        console.info('Nao foi possivel carregar o aluno para transferencia.', error)
        setLoadError(getStudentApiErrorMessage(error))
      } finally {
        if (active) {
          setLoadingStudent(false)
        }
      }
    }

    loadStudent()

    return () => {
      active = false
    }
  }, [studentId])

  if (!loadingStudent && !loadError && !student) {
    return <Navigate to="/alunos" replace />
  }

  const handleConfirm = async () => {
    const transferAmount = balanceToCents(amount)

    if (!transferAmount) {
      setSubmitError('Informe um valor valido para a transferencia.')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      await addStudentCredit({
        studentId: student.id,
        amountInCents: transferAmount,
        createdBy: user?.id,
        note: 'Deposito de Euras realizado pelo painel administrativo.',
      })

      navigate('/alunos', {
        replace: true,
        state: {
          transferSuccess: {
            studentName: student.name,
            amount,
          },
        },
      })
    } catch (error) {
      console.info('Nao foi possivel registrar o deposito no Supabase.', error)
      setSubmitError(getStudentApiErrorMessage(error))
      setIsSubmitting(false)
    }
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
            onClick={() => navigate(student ? `/alunos/${student.id}` : '/alunos')}
          >
            <BackIcon />
          </button>
        </div>

        {loadingStudent ? <p className="form-message">Carregando aluno...</p> : null}
        {loadError ? <p className="form-message form-message-error">{loadError}</p> : null}
        {submitError ? <p className="form-message form-message-error">{submitError}</p> : null}

        {!loadingStudent && !loadError && student ? (
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

          <button
            type="button"
            className="student-submit-button student-transfer-button"
            onClick={handleConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Confirmando...' : 'Confirmar'}
          </button>
          </section>
        ) : null}
      </section>
    </SidebarLayout>
  )
}
