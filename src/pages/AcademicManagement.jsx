import { useEffect, useMemo, useState } from 'react'
import SidebarLayout from '../components/SidebarLayout'
import {
  apagarCurso,
  apagarSede,
  atualizarCurso,
  atualizarSede,
  criarCurso,
  criarSede,
  desativarCurso,
  desativarSede,
  listarCursosPorSede,
  listarSedes,
} from '../lib/academicApi'

function getAcademicErrorMessage(error) {
  const message = String(error?.message ?? '')
  const normalizedMessage = message.toLowerCase()

  if (error?.code === '23505' || normalizedMessage.includes('duplicate')) {
    return 'Ja existe um registro com esse nome.'
  }

  if (error?.code === '23503' || normalizedMessage.includes('foreign key')) {
    return 'Nao foi possivel apagar porque este registro ainda esta vinculado a alunos, cursos ou historico.'
  }

  if (normalizedMessage.includes('row-level security')) {
    return 'Operacao bloqueada por permissao. Verifique se seu usuario e admin.'
  }

  return message || 'Nao foi possivel concluir a operacao.'
}

function StatusPill({ active }) {
  return (
    <span className={active ? 'academic-status academic-status-active' : 'academic-status'}>
      {active ? 'Ativo' : 'Inativo'}
    </span>
  )
}

export default function AcademicManagement() {
  const [sedes, setSedes] = useState([])
  const [cursos, setCursos] = useState([])
  const [selectedSedeFilter, setSelectedSedeFilter] = useState('TODAS')
  const [newSedeName, setNewSedeName] = useState('')
  const [newCursoName, setNewCursoName] = useState('')
  const [newCursoSedeId, setNewCursoSedeId] = useState('')
  const [editingSedeId, setEditingSedeId] = useState('')
  const [editingSedeName, setEditingSedeName] = useState('')
  const [editingCursoId, setEditingCursoId] = useState('')
  const [editingCursoName, setEditingCursoName] = useState('')
  const [editingCursoSedeId, setEditingCursoSedeId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const sedeById = useMemo(
    () => new Map(sedes.map((sede) => [sede.id, sede])),
    [sedes],
  )

  const filteredCursos = useMemo(() => {
    if (selectedSedeFilter === 'TODAS') {
      return cursos
    }

    return cursos.filter((curso) => curso.sedeId === selectedSedeFilter)
  }, [cursos, selectedSedeFilter])

  const activeSedes = useMemo(
    () => sedes.filter((sede) => sede.ativo),
    [sedes],
  )

  async function loadData() {
    setLoading(true)
    setError('')

    try {
      const [nextSedes, nextCursos] = await Promise.all([
        listarSedes({ somenteAtivas: false }),
        listarCursosPorSede(null, { somenteAtivos: false }),
      ])

      setSedes(nextSedes)
      setCursos(nextCursos)

      if (!newCursoSedeId && nextSedes.length > 0) {
        const firstActiveSede = nextSedes.find((sede) => sede.ativo) ?? nextSedes[0]
        setNewCursoSedeId(firstActiveSede.id)
      }
    } catch (loadError) {
      console.info('Nao foi possivel carregar sedes e cursos.', loadError)
      setError(getAcademicErrorMessage(loadError))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function showSuccess(nextMessage) {
    setMessage(nextMessage)
    setError('')
  }

  function showError(nextError) {
    setMessage('')
    setError(getAcademicErrorMessage(nextError))
  }

  async function handleCreateSede(event) {
    event.preventDefault()
    setSaving(true)

    try {
      await criarSede(newSedeName)
      setNewSedeName('')
      showSuccess('Sede criada com sucesso.')
      await loadData()
    } catch (createError) {
      showError(createError)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveSede(sedeId) {
    setSaving(true)

    try {
      await atualizarSede(sedeId, { nome: editingSedeName })
      setEditingSedeId('')
      setEditingSedeName('')
      showSuccess('Sede atualizada com sucesso.')
      await loadData()
    } catch (saveError) {
      showError(saveError)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleSede(sede) {
    setSaving(true)

    try {
      if (sede.ativo) {
        await desativarSede(sede.id)
      } else {
        await atualizarSede(sede.id, { ativo: true })
      }

      showSuccess(sede.ativo ? 'Sede desativada.' : 'Sede ativada.')
      await loadData()
    } catch (toggleError) {
      showError(toggleError)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteSede(sede) {
    const confirmed = window.confirm(`Apagar a sede ${sede.nome}? Esta acao nao pode ser desfeita.`)
    if (!confirmed) return

    setSaving(true)

    try {
      await apagarSede(sede.id)
      setEditingSedeId('')
      setEditingSedeName('')
      showSuccess('Sede apagada com sucesso.')
      await loadData()
    } catch (deleteError) {
      showError(deleteError)
    } finally {
      setSaving(false)
    }
  }

  async function handleCreateCurso(event) {
    event.preventDefault()
    setSaving(true)

    try {
      await criarCurso({ sedeId: newCursoSedeId, nome: newCursoName })
      setNewCursoName('')
      showSuccess('Curso criado com sucesso.')
      await loadData()
    } catch (createError) {
      showError(createError)
    } finally {
      setSaving(false)
    }
  }

  async function handleSaveCurso(cursoId) {
    setSaving(true)

    try {
      await atualizarCurso(cursoId, {
        nome: editingCursoName,
        sedeId: editingCursoSedeId,
      })
      setEditingCursoId('')
      setEditingCursoName('')
      setEditingCursoSedeId('')
      showSuccess('Curso atualizado com sucesso.')
      await loadData()
    } catch (saveError) {
      showError(saveError)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleCurso(curso) {
    setSaving(true)

    try {
      if (curso.ativo) {
        await desativarCurso(curso.id)
      } else {
        await atualizarCurso(curso.id, { ativo: true })
      }

      showSuccess(curso.ativo ? 'Curso desativado.' : 'Curso ativado.')
      await loadData()
    } catch (toggleError) {
      showError(toggleError)
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteCurso(curso) {
    const confirmed = window.confirm(`Apagar o curso ${curso.nome}? Esta acao nao pode ser desfeita.`)
    if (!confirmed) return

    setSaving(true)

    try {
      await apagarCurso(curso.id)
      setEditingCursoId('')
      setEditingCursoName('')
      setEditingCursoSedeId('')
      showSuccess('Curso apagado com sucesso.')
      await loadData()
    } catch (deleteError) {
      showError(deleteError)
    } finally {
      setSaving(false)
    }
  }

  return (
    <SidebarLayout>
      <section className="academic-page">
        <div className="students-topbar">
          <h1 className="students-heading">Gerenciar sedes e cursos</h1>
        </div>

        {message ? <p className="form-message form-message-success">{message}</p> : null}
        {error ? <p className="form-message form-message-error">{error}</p> : null}

        <section className="academic-grid">
          <div className="academic-panel">
            <div className="academic-panel-header">
              <h2>Sedes</h2>
            </div>

            <form className="academic-create-row" onSubmit={handleCreateSede}>
              <input
                type="text"
                value={newSedeName}
                onChange={(event) => setNewSedeName(event.target.value)}
                placeholder="Nome da sede"
                disabled={saving}
              />
              <button type="submit" className="students-add-button" disabled={saving}>
                Adicionar
              </button>
            </form>

            <div className="academic-list">
              {loading ? <p className="students-empty-state">Carregando sedes...</p> : null}

              {!loading && sedes.length === 0 ? (
                <p className="students-empty-state">Nenhuma sede cadastrada.</p>
              ) : null}

              {sedes.map((sede) => {
                const isEditing = editingSedeId === sede.id

                return (
                  <article className="academic-row" key={sede.id}>
                    <div className="academic-row-main">
                      {isEditing ? (
                        <input
                          type="text"
                          value={editingSedeName}
                          onChange={(event) => setEditingSedeName(event.target.value)}
                          disabled={saving}
                        />
                      ) : (
                        <strong>{sede.nome}</strong>
                      )}
                      <StatusPill active={sede.ativo} />
                    </div>

                    <div className="academic-row-actions">
                      {isEditing ? (
                        <>
                          <button type="button" className="data-retry-button" disabled={saving} onClick={() => handleSaveSede(sede.id)}>
                            Salvar
                          </button>
                          <button
                            type="button"
                            className="academic-danger-button"
                            disabled={saving}
                            onClick={() => handleDeleteSede(sede)}
                          >
                            Apagar
                          </button>
                          <button
                            type="button"
                            className="academic-ghost-button"
                            disabled={saving}
                            onClick={() => {
                              setEditingSedeId('')
                              setEditingSedeName('')
                            }}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="data-retry-button"
                            disabled={saving}
                            onClick={() => {
                              setEditingSedeId(sede.id)
                              setEditingSedeName(sede.nome)
                            }}
                          >
                            Editar
                          </button>
                          <button type="button" className="academic-ghost-button" disabled={saving} onClick={() => handleToggleSede(sede)}>
                            {sede.ativo ? 'Desativar' : 'Ativar'}
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>

          <div className="academic-panel">
            <div className="academic-panel-header">
              <h2>Cursos</h2>
              <label className="academic-filter">
                <span>Filtrar por sede</span>
                <select value={selectedSedeFilter} onChange={(event) => setSelectedSedeFilter(event.target.value)}>
                  <option value="TODAS">Todas</option>
                  {sedes.map((sede) => (
                    <option key={sede.id} value={sede.id}>
                      {sede.nome}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <form className="academic-create-row academic-create-row-courses" onSubmit={handleCreateCurso}>
              <select value={newCursoSedeId} onChange={(event) => setNewCursoSedeId(event.target.value)} disabled={saving || activeSedes.length === 0}>
                <option value="">Selecione a sede</option>
                {activeSedes.map((sede) => (
                  <option key={sede.id} value={sede.id}>
                    {sede.nome}
                  </option>
                ))}
              </select>
              <input
                type="text"
                value={newCursoName}
                onChange={(event) => setNewCursoName(event.target.value)}
                placeholder="Nome do curso"
                disabled={saving}
              />
              <button type="submit" className="students-add-button" disabled={saving || !newCursoSedeId}>
                Adicionar
              </button>
            </form>

            <div className="academic-list">
              {loading ? <p className="students-empty-state">Carregando cursos...</p> : null}

              {!loading && filteredCursos.length === 0 ? (
                <p className="students-empty-state">Nenhum curso cadastrado.</p>
              ) : null}

              {filteredCursos.map((curso) => {
                const isEditing = editingCursoId === curso.id
                const sedeNome = sedeById.get(curso.sedeId)?.nome ?? curso.sedeNome

                return (
                  <article className="academic-row" key={curso.id}>
                    <div className="academic-row-main">
                      {isEditing ? (
                        <div className="academic-edit-grid">
                          <select value={editingCursoSedeId} onChange={(event) => setEditingCursoSedeId(event.target.value)} disabled={saving}>
                            {sedes.map((sede) => (
                              <option key={sede.id} value={sede.id}>
                                {sede.nome}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={editingCursoName}
                            onChange={(event) => setEditingCursoName(event.target.value)}
                            disabled={saving}
                          />
                        </div>
                      ) : (
                        <div className="academic-course-copy">
                          <strong>{curso.nome}</strong>
                          <span>{sedeNome}</span>
                        </div>
                      )}
                      <StatusPill active={curso.ativo} />
                    </div>

                    <div className="academic-row-actions">
                      {isEditing ? (
                        <>
                          <button type="button" className="data-retry-button" disabled={saving} onClick={() => handleSaveCurso(curso.id)}>
                            Salvar
                          </button>
                          <button
                            type="button"
                            className="academic-danger-button"
                            disabled={saving}
                            onClick={() => handleDeleteCurso(curso)}
                          >
                            Apagar
                          </button>
                          <button
                            type="button"
                            className="academic-ghost-button"
                            disabled={saving}
                            onClick={() => {
                              setEditingCursoId('')
                              setEditingCursoName('')
                              setEditingCursoSedeId('')
                            }}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            className="data-retry-button"
                            disabled={saving}
                            onClick={() => {
                              setEditingCursoId(curso.id)
                              setEditingCursoName(curso.nome)
                              setEditingCursoSedeId(curso.sedeId)
                            }}
                          >
                            Editar
                          </button>
                          <button type="button" className="academic-ghost-button" disabled={saving} onClick={() => handleToggleCurso(curso)}>
                            {curso.ativo ? 'Desativar' : 'Ativar'}
                          </button>
                        </>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
          </div>
        </section>
      </section>
    </SidebarLayout>
  )
}
