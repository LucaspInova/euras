import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SidebarLayout from '../components/SidebarLayout'
import { formatDateInput, formatPhoneInput } from '../lib/studentFormatters'
import { createStudent, getStudentApiErrorMessage } from '../lib/studentsApi'

const campusOptions = ['MARACANAU', 'REDENCAO', 'PENTECOSTES']
const courseOptions = ['ENGENHARIA CIVIL', 'ENFERMAGEM', 'DIREITO', 'MEDICINA', 'ARQUITETURA', 'PSICOLOGIA']

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

export default function StudentCreate() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    phone: '',
    entryDate: '',
    campus: 'MARACANAU',
    course: 'ENGENHARIA CIVIL',
    email: '',
    password: '',
  })

  const handleChange = (field) => (event) => {
    let nextValue = event.target.value

    if (field === 'phone') {
      nextValue = formatPhoneInput(nextValue)
    }

    if (field === 'entryDate') {
      nextValue = formatDateInput(nextValue)
    }

    setForm((current) => ({ ...current, [field]: nextValue }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!form.name.trim() || !form.entryDate.trim()) {
      setFormError('Preencha obrigatoriamente Nome e Data de Entrada para adicionar o aluno.')
      return
    }

    if (!form.email.trim() || !form.password.trim()) {
      setFormError('Preencha obrigatoriamente E-mail e Senha para adicionar o aluno.')
      return
    }

    if (form.password.trim().length < 6) {
      setFormError('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    setIsSaving(true)

    try {
      await createStudent({
        name: form.name,
        course: form.course,
        campus: form.campus,
        phone: form.phone,
        entryDate: form.entryDate,
        email: form.email,
        password: form.password,
      })

      navigate('/alunos')
    } catch (error) {
      console.info('Não foi possível cadastrar o aluno na base mockada.', error)
      setFormError(getStudentApiErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SidebarLayout>
      <section className="student-create-page">
        <div className="student-create-header">
          <h1 className="students-heading">Adicionar aluno</h1>

          <button
            type="button"
            className="student-back-button"
            aria-label="Voltar para a lista de alunos"
            onClick={() => navigate('/alunos')}
          >
            <BackIcon />
          </button>
        </div>

        <form className="student-create-form" onSubmit={handleSubmit}>
          <section className="student-create-card">
            <div className="student-create-grid">
              <div className="student-create-column">
                <label className="student-field">
                  <span>Nome:</span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={handleChange('name')}
                    placeholder="Gustavo Maciel de Lima Goncalves"
                    required
                  />
                </label>

                <label className="student-field">
                  <span>Número:</span>
                  <input
                    type="text"
                    value={form.phone}
                    onChange={handleChange('phone')}
                    placeholder="(xx)xxxxx-xxxx"
                  />
                </label>

                <label className="student-field">
                  <span>Data de Entrada:</span>
                  <input
                    type="text"
                    value={form.entryDate}
                    onChange={handleChange('entryDate')}
                    placeholder="dd/mm/aaaa"
                    required
                  />
                </label>
              </div>

              <div className="student-create-column">
                <label className="student-field student-field-select">
                  <span>Sede:</span>
                  <select value={form.campus} onChange={handleChange('campus')}>
                    {campusOptions.map((campus) => (
                      <option key={campus} value={campus}>
                        {campus}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="student-field student-field-select">
                  <span>Curso:</span>
                  <select value={form.course} onChange={handleChange('course')}>
                    {courseOptions.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="student-field">
                  <span>E-mail:</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={handleChange('email')}
                    placeholder="aluno123@test.com"
                    required
                  />
                </label>

                <label className="student-field">
                  <span>Senha:</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    value={form.password}
                    onChange={handleChange('password')}
                    placeholder="Digite a senha"
                    minLength={6}
                    required
                  />
                </label>
              </div>
            </div>
          </section>

          {formError ? <p className="form-message form-message-error">{formError}</p> : null}

          <div className="student-create-submit-row">
            <button type="submit" className="student-submit-button">
              {isSaving ? 'Salvando...' : 'Adicionar aluno'}
            </button>
          </div>
        </form>
      </section>
    </SidebarLayout>
  )
}
