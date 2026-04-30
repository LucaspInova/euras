import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import PartnerPortalLayout from '../components/PartnerPortalLayout'
import {
  atualizarPerfil,
  fetchParceiro,
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

export default function PartnerPortalProfile() {
  const navigate = useNavigate()
  const { user, signOut, resetPasswordForEmail } = useAuth()
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [parceiroId, setParceiroId] = useState(null)
  const [nameValue, setNameValue] = useState('')
  const [emailValue, setEmailValue] = useState('')
  const [phoneValue, setPhoneValue] = useState('')
  const [campusValue, setCampusValue] = useState('')
  const [profileSaveError, setProfileSaveError] = useState('')
  const [profileSaveSuccess, setProfileSaveSuccess] = useState('')
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [resetPasswordError, setResetPasswordError] = useState('')
  const [resetPasswordSuccess, setResetPasswordSuccess] = useState('')
  const [isSendingResetPassword, setIsSendingResetPassword] = useState(false)

  useEffect(() => {
    let active = true

    async function loadProfile() {
      setLoadingProfile(true)
      setLoadError('')

      try {
        const { data, error } = await fetchParceiro(supabase)
        if (error) throw error

        if (!active) return

        setParceiroId(data?.id ?? null)
        setNameValue(data?.usuario_responsavel_nome ?? '')
        setEmailValue(data?.email ?? user?.email ?? '')
        setPhoneValue(data?.telefone ?? '')
        setCampusValue(data?.campus ?? '')
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

  const handleResetPassword = async () => {
    if (isSendingResetPassword) {
      return
    }

    setIsSendingResetPassword(true)
    setResetPasswordError('')
    setResetPasswordSuccess('')

    try {
      const { error } = await resetPasswordForEmail(emailValue)
      if (error) throw error

      setResetPasswordSuccess(`E-mail de redefinição enviado para ${emailValue}.`)
    } catch (error) {
      setResetPasswordError(getParceiroDataErrorMessage(error))
    } finally {
      setIsSendingResetPassword(false)
    }
  }

  const handleSaveProfile = async () => {
    if (isSavingProfile) {
      return
    }

    if (!parceiroId) {
      setProfileSaveError('Perfil do parceiro não encontrado. Faça login novamente.')
      return
    }

    setIsSavingProfile(true)
    setProfileSaveError('')
    setProfileSaveSuccess('')

    try {
      const { data, error } = await atualizarPerfil(supabase, parceiroId, {
        usuario_responsavel_nome: nameValue,
        telefone: phoneValue,
        campus: campusValue,
      })
      if (error) throw error

      setNameValue(data?.usuario_responsavel_nome ?? '')
      setPhoneValue(data?.telefone ?? '')
      setCampusValue(data?.campus ?? '')
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
                <button
                  type="button"
                  className="portal-profile-secondary-button"
                  onClick={handleResetPassword}
                  disabled={isSendingResetPassword}
                >
                  {isSendingResetPassword ? 'Enviando...' : 'Alterar senha'}
                </button>
                {resetPasswordSuccess ? <p className="form-message">{resetPasswordSuccess}</p> : null}
                {resetPasswordError ? <p className="form-message form-message-error">{resetPasswordError}</p> : null}
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
