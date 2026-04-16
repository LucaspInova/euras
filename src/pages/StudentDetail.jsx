import { useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import SidebarLayout from '../components/SidebarLayout'
import { formatDateInput, formatPhoneInput } from '../lib/studentFormatters'
import { getStoredStudentById, removeStoredStudent, updateStoredStudent } from '../lib/studentsStorage'

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

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function RemoveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 8l8 8M16 8l-8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function StudentDetail() {
  const navigate = useNavigate()
  const { studentId } = useParams()
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const student = useMemo(() => getStoredStudentById(studentId), [studentId])
  const [form, setForm] = useState(() => getStoredStudentById(studentId))

  if (!student || !form) {
    return <Navigate to="/alunos" replace />
  }

  const handleChange = (field) => (event) => {
    let nextValue = event.target.value

    if (field === 'phone') {
      nextValue = formatPhoneInput(nextValue)
    }

    if (field === 'entryDate') {
      nextValue = formatDateInput(nextValue)
    }

    const nextForm = { ...form, [field]: nextValue }
    setForm(nextForm)
    updateStoredStudent(student.id, nextForm)
  }

  const handleRemoveStudent = () => {
    removeStoredStudent(student.id)
    navigate('/alunos', { replace: true })
  }

  return (
    <SidebarLayout>
      <section className="student-create-page">
        <div className="student-create-header">
          <h1 className="students-heading">Controle aluno</h1>

          <button
            type="button"
            className="student-back-button"
            aria-label="Voltar para a lista de alunos"
            onClick={() => navigate('/alunos')}
          >
            <BackIcon />
          </button>
        </div>

        <section className="student-create-card student-detail-card">
          <div className="student-create-grid">
            <div className="student-create-column">
              <div className="student-field student-detail-field">
                <span>Nome:</span>
                <p>{form.name}</p>
              </div>

              <div className="student-field student-detail-field">
                <span>Numero:</span>
                <input
                  type="text"
                  value={form.phone}
                  onChange={handleChange('phone')}
                  placeholder="(xx)xxxxx-xxxx"
                />
              </div>

              <div className="student-field student-detail-field">
                <span>Data de Entrada:</span>
                <input
                  type="text"
                  value={form.entryDate}
                  onChange={handleChange('entryDate')}
                  placeholder="dd/mm/aaaa"
                />
              </div>

              <div className="student-balance-block">
                <span>Saldo:</span>
                <strong>{`< ${form.balance}`}</strong>
              </div>
            </div>

            <div className="student-create-column">
              <label className="student-field student-field-select">
                <span>Sede:</span>
                <select value={form.campus} onChange={handleChange('campus')}>
                  <option value="MARACANAU">MARACANAU</option>
                  <option value="REDENCAO">REDENCAO</option>
                  <option value="PENTECOSTES">PENTECOSTES</option>
                </select>
              </label>

              <label className="student-field student-field-select">
                <span>Curso:</span>
                <select value={form.course} onChange={handleChange('course')}>
                  <option value="ENGENHARIA CIVIL">ENGENHARIA CIVIL</option>
                  <option value="ENFERMAGEM">ENFERMAGEM</option>
                  <option value="DIREITO">DIREITO</option>
                  <option value="MEDICINA">MEDICINA</option>
                  <option value="ARQUITETURA">ARQUITETURA</option>
                  <option value="PSICOLOGIA">PSICOLOGIA</option>
                </select>
              </label>

              <label className="student-field student-detail-field">
                <span>E-mail:</span>
                <input type="email" value={form.email} onChange={handleChange('email')} />
              </label>
            </div>
          </div>
        </section>

        <div className="student-detail-actions">
          <button
            type="button"
            className="student-submit-button"
            onClick={() => navigate(`/alunos/${student.id}/transferir`)}
          >
            Depositar Euras
          </button>

          <button
            type="button"
            className="student-remove-button"
            onClick={() => setShowDeleteModal(true)}
          >
            <span>Remover aluno</span>
            <span className="student-remove-icon">
              <RemoveIcon />
            </span>
          </button>
        </div>

        {showDeleteModal ? (
          <div className="student-modal-backdrop" role="presentation">
            <div className="student-remove-modal" role="dialog" aria-modal="true" aria-label="Remover aluno">
              <button
                type="button"
                className="student-modal-close"
                aria-label="Fechar aviso de remocao"
                onClick={() => setShowDeleteModal(false)}
              >
                <CloseIcon />
              </button>

              <p>Tem certeza de que deseja remover este aluno?</p>

              <button type="button" className="student-modal-confirm" onClick={handleRemoveStudent}>
                Remover
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </SidebarLayout>
  )
}
