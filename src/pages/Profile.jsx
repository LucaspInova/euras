import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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

export default function Profile() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [showSignOutModal, setShowSignOutModal] = useState(false)
  const [isSigningOut, setIsSigningOut] = useState(false)

  const userName =
    user?.user_metadata?.full_name?.trim() ||
    user?.user_metadata?.name?.trim() ||
    user?.user_metadata?.display_name?.trim() ||
    'Eula Paula Rocha'
  const userEmail = user?.email ?? 'admin123@test.com'
  const userPhone = user?.phone || '(00) 00000-0000'

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
        console.error('Falha ao encerrar sessao no Supabase.', {
          message: error.message,
          status: error.status,
          code: error.code,
          name: error.name,
        })
      }
    } catch (error) {
      console.error('Erro inesperado ao encerrar sessao.', error)
    }
  }

  return (
    <SidebarLayout title="Meu perfil" showSidebarSignOut={false}>
      <section className="profile-page">
        <article className="profile-card">
          <div className="profile-card-coin" aria-hidden="true" />

          <div className="profile-fields">
            <div className="profile-field">
              <span>Nome do usuario:</span>
              <p>{userName}</p>
            </div>

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

            <div className="profile-field">
              <span>Numero:</span>
              <p>{userPhone}</p>
            </div>
          </div>

          <div className="profile-actions">
            <button type="button" className="profile-disconnect-button" onClick={openSignOutModal}>
              Desconectar
            </button>
          </div>
        </article>

        {showSignOutModal ? (
          <div className="profile-signout-backdrop" role="presentation">
            <div className="profile-signout-modal" role="dialog" aria-modal="true" aria-label="Confirmar saida">
              <button
                type="button"
                className="profile-signout-close"
                aria-label="Fechar confirmacao de saida"
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
    </SidebarLayout>
  )
}
