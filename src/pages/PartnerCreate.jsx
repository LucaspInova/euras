import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SidebarLayout from '../components/SidebarLayout'
import { createPartner, getPartnerApiErrorMessage } from '../lib/partnersApi'

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

function AddPhotoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5" width="13.5" height="11" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="8.8" cy="9" r="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="m5.6 14.8 3.8-3.7 2.6 2.3 3.4-3.2 1.6 1.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M20 14.2v5.2M17.4 16.8h5.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
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

export default function PartnerCreate() {
  const navigate = useNavigate()
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    institution: 'Ceeds Maracanau',
    user: 'Eula Paula Rocha',
    phone: '(00) 00000-0000',
    email: 'admin123@test.com',
    campus: 'MARACANAU',
  })
  const [schedule, setSchedule] = useState({
    week: { open: true, openHour: '06', openMinute: '00', closeHour: '18', closeMinute: '00' },
    saturday: { open: true, openHour: '06', openMinute: '00', closeHour: '12', closeMinute: '00' },
    sunday: { open: false, openHour: '00', openMinute: '00', closeHour: '00', closeMinute: '00' },
  })

  const handleOpenState = (key, isOpen) => {
    setSchedule((current) => ({
      ...current,
      [key]: { ...current[key], open: isOpen },
    }))
  }

  const handleTimeChange = (key, field, value) => {
    setSchedule((current) => ({
      ...current,
      [key]: { ...current[key], [field]: value },
    }))
  }

  const handleFieldChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleSubmit = async () => {
    setFormError('')

    if (!form.institution.trim()) {
      setFormError('Informe o nome da instituicao.')
      return
    }

    setIsSaving(true)

    try {
      const partnerId = await createPartner({
        name: form.institution.trim(),
        user: form.user.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        campus: form.campus.trim(),
        schedule,
      })

      navigate(`/parceiros/${partnerId}`)
    } catch (error) {
      console.info('Falha ao criar parceiro na base mockada.', error)
      setFormError(getPartnerApiErrorMessage(error))
      setIsSaving(false)
    }
  }

  const rows = [
    { key: 'week', label: 'SEG - SEX' },
    { key: 'saturday', label: 'SAB' },
    { key: 'sunday', label: 'DOM' },
  ]

  return (
    <SidebarLayout>
      <section className="partner-create-page">
        <div className="student-create-header">
          <h1 className="partners-heading">Adicionar parceiro</h1>

          <button
            type="button"
            className="student-back-button"
            aria-label="Voltar para parceiros"
            onClick={() => navigate('/parceiros')}
          >
            <BackIcon />
          </button>
        </div>

        <section className="partner-create-card">
          <div className="partner-create-grid">
            <div className="partner-create-column">
              <label className="partner-field">
                <span>Nome da instituicao:</span>
                <input type="text" value={form.institution} onChange={handleFieldChange('institution')} />
              </label>

              <label className="partner-field">
                <span>Usuario:</span>
                <input type="text" value={form.user} onChange={handleFieldChange('user')} />
              </label>

              <label className="partner-field">
                <span>Numero:</span>
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
                <button type="button" className="partner-photo-button" aria-label="Adicionar foto do parceiro">
                  <AddPhotoIcon />
                </button>
              </div>

              <div className="partner-hours-box">
                <h2>Horario de funcionamento:</h2>

                {rows.map((row) => {
                  const item = schedule[row.key]

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
        </section>

        {formError ? <p className="form-message form-message-error">{formError}</p> : null}

        <div className="partner-create-submit-row">
          <button type="button" className="student-submit-button" onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Adicionar parceiro'}
          </button>
        </div>
      </section>
    </SidebarLayout>
  )
}
