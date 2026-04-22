import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import SidebarLayout from '../components/SidebarLayout'
import { getStudentApiErrorMessage, listStudents } from '../lib/studentsApi'

function SuccessIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="48" fill="#40c572" />
      <path
        d="M37 62.5 53 78.5 84 47.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="9"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="5.8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="m15.2 15.2 4.3 4.3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 7h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 12h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="9" cy="7" r="2.2" fill="currentColor" />
      <circle cx="15" cy="12" r="2.2" fill="currentColor" />
      <circle cx="11" cy="17" r="2.2" fill="currentColor" />
    </svg>
  )
}

function AddIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M15.5 19v-1.2a3.3 3.3 0 0 0-3.3-3.3H8.3A3.3 3.3 0 0 0 5 17.8V19"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        strokeLinecap="round"
      />
      <circle cx="10.2" cy="8.1" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M18.1 7.1v5.8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M15.2 10h5.8" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

export default function Students() {
  const navigate = useNavigate()
  const location = useLocation()
  const filterRef = useRef(null)
  const [students, setStudents] = useState([])
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedCampus, setSelectedCampus] = useState('TODAS')
  const [selectedCourse, setSelectedCourse] = useState('TODOS')
  const [transferSuccess, setTransferSuccess] = useState(() => location.state?.transferSuccess ?? null)

  useEffect(() => {
    let active = true

    async function loadStudents() {
      setLoadingStudents(true)
      setLoadError('')

      try {
        const nextStudents = await listStudents()

        if (!active) {
          return
        }

        setStudents(nextStudents)
      } catch (error) {
        if (!active) {
          return
        }

        console.info('Nao foi possivel carregar os alunos mockados.', error)
        setLoadError(getStudentApiErrorMessage(error))
      } finally {
        if (active) {
          setLoadingStudents(false)
        }
      }
    }

    loadStudents()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!showFilters) {
      return undefined
    }

    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFilters])

  useEffect(() => {
    if (location.state?.transferSuccess) {
      navigate(location.pathname, { replace: true, state: {} })
    }
  }, [location.pathname, location.state, navigate])

  const campusOptions = useMemo(
    () => ['TODAS', ...new Set(students.map((student) => student.campus))],
    [students],
  )

  const courseOptions = useMemo(
    () => ['TODOS', ...new Set(students.map((student) => student.course))],
    [students],
  )

  const filteredStudents = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toUpperCase()

    return students.filter((student) => {
      const matchesSearch =
        !normalizedSearch ||
        student.name.includes(normalizedSearch) ||
        student.course.includes(normalizedSearch) ||
        student.campus.includes(normalizedSearch)

      const matchesCampus = selectedCampus === 'TODAS' || student.campus === selectedCampus
      const matchesCourse = selectedCourse === 'TODOS' || student.course === selectedCourse

      return matchesSearch && matchesCampus && matchesCourse
    })
  }, [searchTerm, selectedCampus, selectedCourse, students])

  return (
    <SidebarLayout>
      <section className="students-page">
        <div className="students-topbar">
          <h1 className="students-heading">Alunos</h1>

          <div className="students-actions" ref={filterRef}>
            <label className="students-search" aria-label="Pesquisar aluno">
              <span className="students-search-icon">
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            <button
              type="button"
              className="students-filter-button"
              onClick={() => setShowFilters((current) => !current)}
            >
              <span className="students-button-icon">
                <FilterIcon />
              </span>
              <span>Filtros</span>
            </button>

            {showFilters ? (
              <div className="students-filter-popover">
                <label className="students-filter-row">
                  <span>Sede:</span>
                  <select value={selectedCampus} onChange={(event) => setSelectedCampus(event.target.value)}>
                    {campusOptions.map((campus) => (
                      <option key={campus} value={campus}>
                        {campus}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="students-filter-row">
                  <span>Curso:</span>
                  <select value={selectedCourse} onChange={(event) => setSelectedCourse(event.target.value)}>
                    {courseOptions.map((course) => (
                      <option key={course} value={course}>
                        {course}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            <button
              type="button"
              className="students-add-button"
              onClick={() => navigate('/alunos/novo')}
            >
              <span className="students-button-icon">
                <AddIcon />
              </span>
              <span>Adicionar aluno</span>
            </button>
          </div>
        </div>

        <section className="students-table-card" aria-label="Lista de alunos">
          <div className="students-table-header">
            <span>Nome</span>
            <span>Curso</span>
            <span>Sede</span>
          </div>

          <div className="students-table-body">
            {loadingStudents ? <div className="students-empty-state">Carregando alunos...</div> : null}

            {loadError && !loadingStudents ? <div className="students-empty-state">{loadError}</div> : null}

            {!loadingStudents && !loadError
              ? filteredStudents.map((student) => (
              <button
                type="button"
                className="students-row"
                key={student.id}
                onClick={() => navigate(`/alunos/${student.id}`)}
              >
                <span className="students-name">{student.name}</span>
                <span className="students-course">{student.course}</span>
                <span className="students-campus">{student.campus}</span>
              </button>
                ))
              : null}

            {!loadingStudents && !loadError && filteredStudents.length === 0 ? (
              <div className="students-empty-state">Nenhum aluno encontrado com os filtros atuais.</div>
            ) : null}
          </div>
        </section>

        {transferSuccess ? (
          <div className="student-modal-backdrop" role="presentation">
            <div className="student-remove-modal student-success-modal" role="dialog" aria-modal="true">
              <div className="student-success-icon">
                <SuccessIcon />
              </div>

              <p>Transferência concluída!</p>

              <button type="button" className="student-success-button" onClick={() => setTransferSuccess(null)}>
                Continuar
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </SidebarLayout>
  )
}
