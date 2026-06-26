import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SidebarLayout from '../components/SidebarLayout'
import { listarCursosPorSede, listarSedes } from '../lib/academicApi'
import { formatDateInput, formatPhoneInput } from '../lib/studentFormatters'
import { createStudent, getStudentApiErrorMessage } from '../lib/studentsApi'

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
  const [loadError, setLoadError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [loadingSedes, setLoadingSedes] = useState(true)
  const [loadingCursos, setLoadingCursos] = useState(false)
  const [sedes, setSedes] = useState([])
  const [cursos, setCursos] = useState([])
  const [form, setForm] = useState({
    name: '',
    phone: '',
    entryDate: '',
    campusId: '',
    campus: '',
    courseId: '',
    course: '',
    email: '',
    password: '',
  })

  useEffect(() => {
    let active = true

    async function loadSedes() {
      setLoadingSedes(true)
      setLoadError('')

      try {
        const nextSedes = await listarSedes()

        if (!active) {
          return
        }

        setSedes(nextSedes)
      } catch (error) {
        if (!active) {
          return
        }

        console.info('Nao foi possivel carregar sedes ativas.', error)
        setLoadError('Nao foi possivel carregar as sedes ativas.')
      } finally {
        if (active) {
          setLoadingSedes(false)
        }
      }
    }

    loadSedes()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true

    async function loadCursos() {
      if (!form.campusId) {
        setCursos([])
        return
      }

      setLoadingCursos(true)
      setLoadError('')

      try {
        const nextCursos = await listarCursosPorSede(form.campusId)

        if (!active) {
          return
        }

        setCursos(nextCursos)
      } catch (error) {
        if (!active) {
          return
        }

        console.info('Nao foi possivel carregar cursos ativos.', error)
        setCursos([])
        setLoadError('Nao foi possivel carregar os cursos ativos da sede.')
      } finally {
        if (active) {
          setLoadingCursos(false)
        }
      }
    }

    loadCursos()

    return () => {
      active = false
    }
  }, [form.campusId])

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

  const handleSedeChange = (event) => {
    const sedeId = event.target.value
    const selectedSede = sedes.find((sede) => sede.id === sedeId)

    setForm((current) => ({
      ...current,
      campusId: sedeId,
      campus: selectedSede?.nome ?? '',
      courseId: '',
      course: '',
    }))
    setCursos([])
    setFormError('')
  }

  const handleCursoChange = (event) => {
    const courseId = event.target.value
    const selectedCurso = cursos.find((curso) => curso.id === courseId)

    setForm((current) => ({
      ...current,
      courseId,
      course: selectedCurso?.nome ?? '',
    }))
    setFormError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setFormError('')

    if (!form.name.trim() || !form.entryDate.trim()) {
      setFormError('Preencha obrigatoriamente Nome e Data de Entrada para adicionar o aluno.')
      return
    }

    if (!form.campusId || !form.campus.trim()) {
      setFormError('Selecione uma sede para adicionar o aluno.')
      return
    }

    if (!form.courseId || !form.course.trim()) {
      setFormError('Selecione um curso para adicionar o aluno.')
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
        courseId: form.courseId,
        campus: form.campus,
        campusId: form.campusId,
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
                  <select value={form.campusId} onChange={handleSedeChange} disabled={loadingSedes}>
                    <option value="">{loadingSedes ? 'Carregando sedes...' : 'Selecione a sede'}</option>
                    {sedes.map((sede) => (
                      <option key={sede.id} value={sede.id}>
                        {sede.nome}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="student-field student-field-select">
                  <span>Curso:</span>
                  <select
                    value={form.courseId}
                    onChange={handleCursoChange}
                    disabled={!form.campusId || loadingCursos}
                  >
                    <option value="">
                      {!form.campusId
                        ? 'Selecione uma sede primeiro'
                        : loadingCursos
                          ? 'Carregando cursos...'
                          : 'Selecione o curso'}
                    </option>
                    {cursos.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.nome}
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
          {loadError ? <p className="form-message form-message-error">{loadError}</p> : null}

          <div className="student-create-submit-row">
            <button type="submit" className="student-submit-button" disabled={isSaving || loadingSedes || loadingCursos}>
              {isSaving ? 'Salvando...' : 'Adicionar aluno'}
            </button>
          </div>
        </form>
      </section>
    </SidebarLayout>
  )
}
