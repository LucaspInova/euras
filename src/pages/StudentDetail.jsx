import { useEffect, useState } from 'react'
import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom'
import SidebarLayout from '../components/SidebarLayout'
import { useModalDismiss } from '../hooks/useModalDismiss'
import { listarCursosPorSede, listarSedes } from '../lib/academicApi'
import { formatDateInput, formatPhoneInput } from '../lib/studentFormatters'
import { getStudentApiErrorMessage, getStudentById, removeStudent, updateStudent } from '../lib/studentsApi'

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
  const location = useLocation()
  const { studentId } = useParams()
  const studentPreview = location.state?.studentPreview ?? null
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [student, setStudent] = useState(studentPreview)
  const [form, setForm] = useState(studentPreview)
  const [loadingStudent, setLoadingStudent] = useState(!studentPreview)
  const [sedes, setSedes] = useState([])
  const [cursos, setCursos] = useState([])
  const [loadingSedes, setLoadingSedes] = useState(true)
  const [loadingCursos, setLoadingCursos] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [isRemoving, setIsRemoving] = useState(false)
  const formCampus = form?.campus ?? ''
  const formCampusId = form?.campusId ?? ''
  const formCourse = form?.course ?? ''
  const formCourseId = form?.courseId ?? ''

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
        setForm(nextStudent)
      } catch (error) {
        if (!active) {
          return
        }

        console.info('Não foi possível carregar o aluno na base mockada.', error)
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

  useEffect(() => {
    let active = true

    async function loadSedes() {
      setLoadingSedes(true)

      try {
        const nextSedes = await listarSedes({ somenteAtivas: false })

        if (!active) {
          return
        }

        setSedes(nextSedes)
      } catch (error) {
        if (!active) {
          return
        }

        console.info('Nao foi possivel carregar sedes no detalhe do aluno.', error)
        setSaveError('Nao foi possivel carregar as sedes cadastradas.')
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
    if ((!formCampus && !formCampusId) || sedes.length === 0) {
      return
    }

    if (!formCampusId && formCampus) {
      const matchingSede = sedes.find((sede) => sede.nome === formCampus)
      if (matchingSede) {
        setForm((current) => current ? { ...current, campusId: matchingSede.id } : current)
      }
      return
    }

    const selectedSede = sedes.find((sede) => sede.id === formCampusId)
    if (selectedSede && selectedSede.nome !== formCampus) {
      setForm((current) => current ? { ...current, campus: selectedSede.nome } : current)
    }
  }, [formCampus, formCampusId, sedes])

  useEffect(() => {
    if (formCourseId || !formCourse || cursos.length === 0) {
      return
    }

    const matchingCurso = cursos.find((curso) => curso.nome === formCourse)
    if (matchingCurso) {
      setForm((current) => current ? { ...current, courseId: matchingCurso.id } : current)
    }
  }, [cursos, formCourse, formCourseId])

  useEffect(() => {
    let active = true

    async function loadCursos() {
      if (!form?.campusId) {
        setCursos([])
        return
      }

      setLoadingCursos(true)

      try {
        const nextCursos = await listarCursosPorSede(form.campusId, { somenteAtivos: false })

        if (!active) {
          return
        }

        setCursos(nextCursos)
      } catch (error) {
        if (!active) {
          return
        }

        console.info('Nao foi possivel carregar cursos no detalhe do aluno.', error)
        setCursos([])
        setSaveError('Nao foi possivel carregar os cursos da sede selecionada.')
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
  }, [form?.campusId])

  const closeDeleteModal = () => {
    if (isRemoving) return
    setShowDeleteModal(false)
  }

  useModalDismiss(showDeleteModal, closeDeleteModal, isRemoving)

  if (!loadingStudent && !loadError && (!student || !form)) {
    return <Navigate to="/alunos" replace />
  }

  const handleChange = (field) => async (event) => {
    let nextValue = event.target.value

    if (field === 'phone') {
      nextValue = formatPhoneInput(nextValue)
    }

    if (field === 'entryDate') {
      nextValue = formatDateInput(nextValue)
    }

    const nextForm = { ...form, [field]: nextValue }
    setForm(nextForm)
    setSaveError('')

    try {
      const updatedStudent = await updateStudent(student.id, nextForm)
      setStudent(updatedStudent)
      setForm(updatedStudent)
    } catch (error) {
      console.info('Não foi possível atualizar o aluno na base mockada.', error)
      setSaveError(getStudentApiErrorMessage(error))
    }
  }

  const handleSedeChange = (event) => {
    const campusId = event.target.value
    const selectedSede = sedes.find((sede) => sede.id === campusId)

    setForm((current) => ({
      ...current,
      campusId,
      campus: selectedSede?.nome ?? '',
      courseId: '',
      course: '',
    }))
    setCursos([])
    setSaveError('')
  }

  const handleCursoChange = async (event) => {
    const courseId = event.target.value
    const selectedCourse = cursos.find((curso) => curso.id === courseId)
    const nextForm = {
      ...form,
      courseId,
      course: selectedCourse?.nome ?? '',
    }

    setForm(nextForm)
    setSaveError('')

    if (!nextForm.campusId || !nextForm.courseId) {
      setSaveError('Selecione sede e curso para atualizar o aluno.')
      return
    }

    try {
      const updatedStudent = await updateStudent(student?.id ?? studentId, nextForm)
      setStudent(updatedStudent)
      setForm(updatedStudent)
    } catch (error) {
      console.info('Nao foi possivel atualizar sede/curso do aluno.', error)
      setSaveError(getStudentApiErrorMessage(error))
    }
  }

  const handleRemoveStudent = async () => {
    setIsRemoving(true)

    try {
      await removeStudent(student.id)
      navigate('/alunos', { replace: true })
    } catch (error) {
      console.info('Não foi possível remover o aluno da base mockada.', error)
      setSaveError(getStudentApiErrorMessage(error))
      setIsRemoving(false)
    }
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

        {loadingStudent && !form ? <p className="form-message">Carregando aluno...</p> : null}
        {loadError ? <p className="form-message form-message-error">{loadError}</p> : null}
        {saveError ? <p className="form-message form-message-error">{saveError}</p> : null}

        {!loadError && form ? (
          <>
        <section className="student-create-card student-detail-card">
          <div className="student-create-grid">
            <div className="student-create-column">
              <div className="student-field student-detail-field">
                <span>Nome:</span>
                <p>{form.name}</p>
              </div>

              <div className="student-field student-detail-field">
                <span>Número:</span>
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
                <strong className="euras-inline-value">
                  <span className="euras-inline-coin" aria-hidden="true" />
                  {form.balance}
                </strong>
              </div>
            </div>

            <div className="student-create-column">
              <label className="student-field student-field-select">
                <span>Sede:</span>
                <select value={form.campusId ?? ''} onChange={handleSedeChange} disabled={loadingSedes}>
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
                  value={form.courseId ?? ''}
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
            disabled={isRemoving}
            onClick={() => setShowDeleteModal(true)}
          >
            <span>Remover aluno</span>
            <span className="student-remove-icon">
              <RemoveIcon />
            </span>
          </button>
        </div>

        {showDeleteModal ? (
          <div
            className="student-modal-backdrop"
            role="presentation"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) closeDeleteModal()
            }}
          >
            <div
              className="student-remove-modal"
              role="dialog"
              aria-modal="true"
              aria-label="Remover aluno"
              onMouseDown={(event) => event.stopPropagation()}
            >
              <button
                type="button"
                className="student-modal-close"
                aria-label="Fechar aviso de remoção"
                onClick={closeDeleteModal}
              >
                <CloseIcon />
              </button>

              <p>Tem certeza de que deseja remover este aluno?</p>

              <button type="button" className="student-modal-confirm" onClick={handleRemoveStudent}>
                {isRemoving ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        ) : null}
          </>
        ) : null}
      </section>
    </SidebarLayout>
  )
}
