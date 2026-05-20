import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import PartnerPortalLayout from '../components/PartnerPortalLayout'
import {
  atualizarPerfil,
  fetchPerfilParceiroAtual,
  getParceiroDataErrorMessage,
} from '../hooks/useParceiroData'

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

function resolvePartnerUsername(row) {
  if (!row) return ''

  const candidates = [
    row.nome_completo,
    row.usuario_responsavel_nome,
    row.nome_usuario,
    row.nome,
    row.username,
  ]

  const firstFilled = candidates.find(
    (value) => typeof value === 'string' && value.trim(),
  )

  return firstFilled?.trim() ?? ''
}

export default function PartnerPortalProfile() {
  const navigate = useNavigate()
  const { user, signOut, updatePassword } = useAuth()
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [nameValue, setNameValue] = useState('')
  const [emailValue, setEmailValue] = useState('')
  const [phoneValue, setPhoneValue] = useState('')
  const [campusValue, setCampusValue] = useState('')
  const [profileSaveError, setProfileSaveError] = useState('')
  const [profileSaveSuccess, setProfileSaveSuccess] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [passwordValue, setPasswordValue] = useState('')
  const [confirmPasswordValue, setConfirmPasswordValue] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [isChangingPassword, setIsChangingPassword] = useState(false)

  const applyProfileData = (data) => {
    setNameValue(resolvePartnerUsername(data))
    setEmailValue(data?.email ?? user?.email ?? '')
    setPhoneValue(data?.telefone ?? '')
    setCampusValue(data?.campus ?? '')
  }

  useEffect(() => {
    let active = true

    async function loadProfile() {
      setLoadingProfile(true)
      setLoadError('')

      try {
        const { data, error } = await fetchPerfilParceiroAtual(supabase)
        if (error) throw error

        if (!active) return

        applyProfileData(data)
      } catch (error) {
        if (!active) return
        setLoadError(getParceiroDataErrorMessage(error))
      } finally {
        if (active) {
          setLoadingProfile(false)
        }
      }
    }

    loadProfile()

    return () => {
      active = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  const openSignOutModal = () => {
    setShowSignOutModal(true)
  }

  const closeSignOutModal = () => {
    if (isSigningOut) {
      return
    }

    setShowSignOutModal(false)
  }

  const handleSignOut = async () => {
    if (isSigningOut) {
      return
    }

    setIsSigningOut(true)
    setShowSignOutModal(false)
    navigate('/login', { replace: true })

    try {
      const { error } = await signOut()

      if (error) {
        console.error('Falha ao encerrar sessão no portal parceiro.', {
          message: error.message,
          status: error.status,
          code: error.code,
          name: error.name,
        })
      }
    } catch (error) {
      console.error('Erro inesperado ao encerrar sessão no portal parceiro.', error)
    }
  }

  const handleChangePassword = async () => {
    if (isChangingPassword) {
      return
    }

    setPasswordError('')
    setPasswordSuccess('')

    const normalizedPassword = passwordValue.trim()
    const normalizedConfirmation = confirmPasswordValue.trim()

    if (normalizedPassword.length < 6) {
      setPasswordError('A nova senha deve ter no minimo 6 caracteres.')
      return
    }

    if (normalizedPassword !== normalizedConfirmation) {
      setPasswordError('As senhas informadas nao conferem.')
      return
    }

    setIsChangingPassword(true)

    try {
      const { error } = await updatePassword(normalizedPassword)
      if (error) throw error

      setPasswordValue('')
      setConfirmPasswordValue('')
      setPasswordSuccess('Senha alterada com sucesso.')
    } catch (error) {
      setPasswordError(getParceiroDataErrorMessage(error))
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleSaveProfile = async () => {
    if (isSavingProfile) {
      return
    }

    setIsSavingProfile(true)
    setProfileSaveError('')
    setProfileSaveSuccess('')

    try {
      const normalizedName = nameValue.trim()
      if (!normalizedName) {
        setProfileSaveError('Informe o nome de usuário.')
        return
      }

      const normalizedPhone = phoneValue.trim()
      const normalizedCampus = campusValue.trim()

      const { error } = await atualizarPerfil(supabase, {
        nome: normalizedName,
        telefone: normalizedPhone,
        campus: normalizedCampus,
      })
      if (error) throw error

      const { data: refreshedProfile, error: refetchError } = await fetchPerfilParceiroAtual(
        supabase,
      )
      if (refetchError) throw refetchError

      applyProfileData(refreshedProfile)
      setCampusValue((refreshedProfile?.campus ?? normalizedCampus) || '')
      setProfileSaveSuccess('Alterações salvas com sucesso.')
    } catch (error) {
      setProfileSaveError(getParceiroDataErrorMessage(error))
    } finally {
      setIsSavingProfile(false)
    }
  }

  return (
    <PartnerPortalLayout title="Meu perfil" showSidebarSignOut={false}>
      <section className="profile-page portal-profile-page">
        <article className="profile-card portal-profile-card">
          <header className="portal-profile-header">
            <div className="profile-card-coin portal-profile-card-coin" aria-hidden="true" />
            <div className="portal-profile-title-wrap">
              <h2>{nameValue || 'Parceiro'}</h2>
              <p>Ajustes básicos da conta do parceiro.</p>
            </div>
          </header>

          {loadingProfile ? <p className="form-message">Carregando perfil...</p> : null}
          {loadError ? <p className="form-message form-message-error">{loadError}</p> : null}

          {!loadingProfile && !loadError ? (
            <div className="profile-fields portal-profile-fields">
              <label className="profile-field">
                <span>Nome de usuário</span>
                <input
                  type="text"
                  value={nameValue}
                  onChange={(event) => setNameValue(event.target.value)}
                  placeholder="Informe o nome de usuário"
                />
              </label>

              <label className="profile-field portal-profile-field-readonly">
                <span>E-mail</span>
                <input type="email" value={emailValue} disabled readOnly />
              </label>

              <label className="profile-field">
                <span>Número</span>
                <input
                  type="text"
                  value={phoneValue}
                  onChange={(event) => setPhoneValue(event.target.value)}
                  placeholder="(00) 00000-0000"
                />
              </label>

              <label className="profile-field">
                <span>Campus</span>
                <input
                  type="text"
                  value={campusValue}
                  onChange={(event) => setCampusValue(event.target.value)}
                  placeholder="Informe o campus"
                />
              </label>

              <div className="profile-field portal-profile-security-field">
                <span>Senha</span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={passwordValue}
                  onChange={(event) => setPasswordValue(event.target.value)}
                  placeholder="Nova senha"
                />
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPasswordValue}
                  onChange={(event) => setConfirmPasswordValue(event.target.value)}
                  placeholder="Confirmar nova senha"
                />
                <button
                  type="button"
                  className="portal-profile-secondary-button"
                  onClick={handleChangePassword}
                  disabled={isChangingPassword}
                >
                  {isChangingPassword ? 'Salvando...' : 'Alterar senha'}
                </button>
                {passwordSuccess ? <p className="form-message">{passwordSuccess}</p> : null}
                {passwordError ? <p className="form-message form-message-error">{passwordError}</p> : null}
              </div>
            </div>
          ) : null}

          <div className="profile-actions portal-profile-actions">
            <button
              type="button"
              className="portal-profile-primary-button"
              onClick={handleSaveProfile}
              disabled={isSavingProfile || isSigningOut || loadingProfile}
            >
              {isSavingProfile ? 'Salvando...' : 'Salvar alterações'}
            </button>
            <button
              type="button"
              className="profile-disconnect-button portal-profile-disconnect-button"
              onClick={openSignOutModal}
              disabled={isSigningOut}
            >
              Desconectar
            </button>
          </div>

          {profileSaveSuccess ? <p className="form-message">{profileSaveSuccess}</p> : null}
          {profileSaveError ? <p className="form-message form-message-error">{profileSaveError}</p> : null}
        </article>

        {showSignOutModal ? (
          <div className="profile-signout-backdrop portal-profile-signout-backdrop" role="presentation">
            <div className="profile-signout-modal portal-profile-signout-modal" role="dialog" aria-modal="true" aria-label="Confirmar saída">
              <button
                type="button"
                className="profile-signout-close"
                aria-label="Fechar confirmação de saída"
                onClick={closeSignOutModal}
              >
                <CloseIcon />
              </button>

              <p>Tem certeza de que deseja desconectar?</p>

              <button
                type="button"
                className="profile-signout-confirm"
                disabled={isSigningOut}
                onClick={handleSignOut}
              >
                {isSigningOut ? 'Saindo...' : 'Sair'}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </PartnerPortalLayout>
  )
}
