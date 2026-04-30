import { useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import SidebarLayout from '../components/SidebarLayout'
import { getPartnerApiErrorMessage, getPartnerById, prefetchPartnerProducts, removePartner, updatePartner } from '../lib/partnersApi'

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

function RemoveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 8l8 8M16 8l-8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ForwardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m13 6 6 6-6 6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function PartnerLogo({ label, variant }) {
  if (variant === 'black') {
    return <div className="partner-logo partner-logo-black">{label}</div>
  }

  if (variant === 'blue') {
    return <div className="partner-logo partner-logo-blue">{label}</div>
  }

  return <div className="partner-logo partner-logo-light">{label}</div>
}

function formatTimeInput(value) {
  return value.replace(/\D/g, '').slice(0, 2)
}

function TimeField({ value, onChange }) {
  return (
    <input
      type="text"
      inputMode="numeric"
      className="partner-time-input"
      value={value}
      onChange={(event) => onChange(formatTimeInput(event.target.value))}
    />
  )
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(new Error('Não foi possível processar a imagem selecionada.'))

    reader.readAsDataURL(file)
  })
}

export default function PartnerDetail() {
  const navigate = useNavigate()
  const { partnerId } = useParams()
  const fileInputRef = useRef(null)
  const [partner, setPartner] = useState(null)
  const [loading, setLoading] = useState(true)
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [form, setForm] = useState(null)

  useEffect(() => {
    let active = true

    async function loadPartner() {
      setLoading(true)
      setFormError('')

      try {
        const data = await getPartnerById(partnerId)
        if (!active) return

        setPartner(data)
        setForm({
          institution: data.name ?? '',
          user: data.user ?? '',
          phone: data.phone ?? '',
          email: data.email ?? '',
          campus: data.campus ?? '',
          imageUrl: data.imageUrl ?? '',
          schedule: data.schedule,
        })
      } catch (error) {
        if (!active) return
        console.info('Falha ao carregar controle do parceiro.', error)
        setFormError(getPartnerApiErrorMessage(error))
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadPartner()

    return () => {
      active = false
    }
  }, [partnerId])

  if (!loading && !formError && !partner) {
    return <Navigate to="/parceiros" replace />
  }

  const rows = [
    { key: 'week', label: 'SEG - SEX' },
    { key: 'saturday', label: 'SAB' },
    { key: 'sunday', label: 'DOM' },
  ]

  const handleFieldChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleOpenState = (key, isOpen) => {
    setForm((current) => ({
      ...current,
      schedule: {
        ...current.schedule,
        [key]: { ...current.schedule[key], open: isOpen },
      },
    }))
  }

  const handleTimeChange = (key, field, value) => {
    setForm((current) => ({
      ...current,
      schedule: {
        ...current.schedule,
        [key]: { ...current.schedule[key], [field]: value },
      },
    }))
  }

  const handleSave = async () => {
    if (!form) return

    setIsSaving(true)
    setFormError('')

    try {
      await updatePartner(partnerId, {
        name: form.institution.trim(),
        user: form.user.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        campus: form.campus.trim(),
        imageUrl: form.imageUrl?.trim() ?? '',
        schedule: form.schedule,
      })

      navigate('/parceiros', { replace: true })
    } catch (error) {
      console.info('Falha ao salvar parceiro.', error)
      setFormError(getPartnerApiErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handlePhotoClick = () => {
    fileInputRef.current?.click()
  }

  const handlePhotoChange = async (event) => {
    const selectedFile = event.target.files?.[0]
    event.target.value = ''

    if (!selectedFile) {
      return
    }

    if (selectedFile.size > 2 * 1024 * 1024) {
      setFormError('A imagem deve ter no maximo 2MB.')
      return
    }

    try {
      const imageDataUrl = await fileToDataUrl(selectedFile)

      setForm((current) => ({
        ...current,
        imageUrl: imageDataUrl,
      }))
    } catch (error) {
      setFormError(error.message)
    }
  }

  const handleRemovePartner = async () => {
    setIsSaving(true)
    setFormError('')

    try {
      await removePartner(partnerId)
      navigate('/parceiros', { replace: true })
    } catch (error) {
      console.info('Falha ao remover parceiro.', error)
      setFormError(getPartnerApiErrorMessage(error))
      setIsSaving(false)
    }
  }

  const handleOpenPartnerProducts = () => {
    navigate(`/parceiros/${partnerId}/produtos`)
  }

  const handlePrefetchPartnerProducts = () => {
    prefetchPartnerProducts(partnerId).catch(() => {})
  }

  return (
    <SidebarLayout>
      <section className="partner-create-page">
        <div className="student-create-header">
          <h1 className="partners-heading">Controle parceiro</h1>

          <button
            type="button"
            className="student-back-button"
            aria-label="Voltar para parceiros"
            onClick={() => navigate('/parceiros')}
          >
            <BackIcon />
          </button>
        </div>

        {loading ? <p className="form-message">Carregando parceiro...</p> : null}
        {formError ? <p className="form-message form-message-error">{formError}</p> : null}

        {!loading && form ? (
          <>
            <section className="partner-create-card">
              <div className="partner-create-grid">
                <div className="partner-create-column">
                  <label className="partner-field">
                    <span>Nome da instituição:</span>
                    <input type="text" value={form.institution} onChange={handleFieldChange('institution')} />
                  </label>

                  <label className="partner-field">
                    <span>Usuário:</span>
                    <input type="text" value={form.user} onChange={handleFieldChange('user')} />
                  </label>

                  <label className="partner-field">
                    <span>Número:</span>
                    <input type="text" value={form.phone} onChange={handleFieldChange('phone')} />
                  </label>

                  <label className="partner-field">
                    <span>E-mail:</span>
                    <input type="email" value={form.email} onChange={handleFieldChange('email')} />
                  </label>
                </div>

                <div className="partner-create-column">
                  <div className="partner-photo-box">
                    <span>Adicionar foto:</span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={handlePhotoChange}
                    />
                    <button type="button" className="partner-photo-button" aria-label="Foto do parceiro" onClick={handlePhotoClick}>
                      {form.imageUrl ? (
                        <img src={form.imageUrl} alt={`Foto de ${form.institution}`} className="partner-photo-preview" />
                      ) : (
                        <PartnerLogo label={partner.logo} variant={partner.variant} />
                      )}
                      <p>{form.campus || partner.campus}</p>
                    </button>
                  </div>

                  <div className="partner-hours-box">
                    <h2>Horário de funcionamento:</h2>

                    {rows.map((row) => {
                      const item = form.schedule[row.key]

                      return (
                        <div key={row.key} className="partner-time-row">
                          <div className="partner-time-header">
                            <span className="partner-day">{row.label}</span>

                            <div className="partner-status-switch">
                              <button
                                type="button"
                                className={item.open ? 'partner-status-button partner-status-button-active' : 'partner-status-button'}
                                onClick={() => handleOpenState(row.key, true)}
                              >
                                ABERTO
                              </button>
                              <button
                                type="button"
                                className={!item.open ? 'partner-status-button partner-status-button-active' : 'partner-status-button'}
                                onClick={() => handleOpenState(row.key, false)}
                              >
                                FECHADO
                              </button>
                            </div>
                          </div>

                          {item.open ? (
                            <div className="partner-time-range">
                              <TimeField value={item.openHour} onChange={(value) => handleTimeChange(row.key, 'openHour', value)} />
                              <TimeField value={item.openMinute} onChange={(value) => handleTimeChange(row.key, 'openMinute', value)} />
                              <span>-</span>
                              <TimeField value={item.closeHour} onChange={(value) => handleTimeChange(row.key, 'closeHour', value)} />
                              <TimeField value={item.closeMinute} onChange={(value) => handleTimeChange(row.key, 'closeMinute', value)} />
                            </div>
                          ) : (
                            <span className="partner-time-pill">FECHADO</span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>

              <div className="partner-card-actions">
                <button
                  type="button"
                  className="partner-products-link"
                  onClick={handleOpenPartnerProducts}
                  onMouseEnter={handlePrefetchPartnerProducts}
                  onFocus={handlePrefetchPartnerProducts}
                  onTouchStart={handlePrefetchPartnerProducts}
                >
                  <span>Ver produtos</span>
                  <span className="partner-products-link-icon" aria-hidden="true">
                    <ForwardIcon />
                  </span>
                </button>
              </div>
            </section>

            <div className="partner-create-submit-row partner-detail-actions-row">
              <button type="button" className="student-submit-button" onClick={handleSave} disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar parceiro'}
              </button>

              <button type="button" className="student-remove-button" onClick={() => setShowDeleteModal(true)} disabled={isSaving}>
                <span>Remover parceiro</span>
                <span className="student-remove-icon">
                  <RemoveIcon />
                </span>
              </button>
            </div>
          </>
        ) : null}

        {showDeleteModal ? (
          <div className="student-modal-backdrop" role="presentation">
            <div className="student-remove-modal" role="dialog" aria-modal="true" aria-label="Remover parceiro">
              <p>Tem certeza de que deseja remover este parceiro?</p>
              <button type="button" className="student-modal-confirm" onClick={handleRemovePartner}>
                Remover
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </SidebarLayout>
  )
}
