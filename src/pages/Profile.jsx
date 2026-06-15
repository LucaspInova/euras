import { useEffect, useState } from 'react'
import SidebarLayout from '../components/SidebarLayout'
import { useAuth } from '../context/AuthContext'

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M2.5 12s3.6-5.4 9.5-5.4S21.5 12 21.5 12s-3.6 5.4-9.5 5.4S2.5 12 2.5 12Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <circle cx="12" cy="12" r="2.8" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="m4 4 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

export default function Profile() {
  const { user, profile, updateProfile } = useAuth()
  const [nameValue, setNameValue] = useState('')
  const [phoneValue, setPhoneValue] = useState('')
  const [saveError, setSaveError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  const userEmail = profile?.email?.trim() || user?.email || 'admin123@test.com'

  useEffect(() => {
    const defaultName =
      profile?.nome_completo?.trim() ||
      user?.user_metadata?.full_name?.trim() ||
      user?.user_metadata?.name?.trim() ||
      user?.user_metadata?.display_name?.trim() ||
      'Eula Paula Rocha'
    const defaultPhone = profile?.telefone?.trim() || user?.phone || '(00) 00000-0000'

    setNameValue(defaultName)
    setPhoneValue(defaultPhone)
  }, [profile, user])

  const handleSaveProfile = async () => {
    if (isSavingProfile) {
      return
    }

    setSaveError('')
    setSaveSuccess('')

    if (!nameValue.trim()) {
      setSaveError('Informe o nome de usuário.')
      return
    }

    setIsSavingProfile(true)

    try {
      const updatedProfile = await updateProfile({
        name: nameValue.trim(),
        phone: phoneValue,
      })

      setNameValue(updatedProfile?.nome_completo?.trim() || nameValue.trim())
      setPhoneValue(updatedProfile?.telefone?.trim() || '')
      setSaveSuccess('Perfil atualizado com sucesso.')
    } catch (error) {
      setSaveError(error?.message ?? 'Não foi possível atualizar seu perfil.')
    } finally {
      setIsSavingProfile(false)
    }
  }

  return (
    <SidebarLayout title="Meu perfil">
      <section className="profile-page">
        <article className="profile-card">
          <div className="profile-card-coin" aria-hidden="true" />

          <div className="profile-fields">
            <label className="profile-field">
              <span>Nome de usuário:</span>
              <input type="text" value={nameValue} onChange={(event) => setNameValue(event.target.value)} />
            </label>

            <div className="profile-field">
              <span>E-mail:</span>
              <p>{userEmail}</p>
            </div>

            <div className="profile-field">
              <span>Senha:</span>
              <div className="profile-password-row">
                <p className="profile-password-value">********</p>
                <span className="profile-password-icon" aria-hidden="true">
                  <EyeOffIcon />
                </span>
              </div>
            </div>

            <label className="profile-field">
              <span>Número:</span>
              <input type="text" value={phoneValue} onChange={(event) => setPhoneValue(event.target.value)} />
            </label>
          </div>

          <div className="profile-actions">
            <button
              type="button"
              className="profile-save-button"
              onClick={handleSaveProfile}
              disabled={isSavingProfile}
            >
              {isSavingProfile ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>

          {saveSuccess ? <p className="form-message">{saveSuccess}</p> : null}
          {saveError ? <p className="form-message form-message-error">{saveError}</p> : null}
        </article>
      </section>
    </SidebarLayout>
  )
}
