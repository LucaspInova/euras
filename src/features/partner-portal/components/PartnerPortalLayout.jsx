import { useEffect, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { supabase } from '../../../lib/supabase'
import { fetchParceiro } from '../hooks/useParceiroData'

const portalMenuItems = [
  { to: '/portal-parceiro', label: 'Tela inicial', icon: 'home', end: true },
  { to: '/portal-parceiro/atividades', label: 'Atividades', icon: 'activity' },
  { to: '/portal-parceiro/produtos', label: 'Produtos', icon: 'tag' },
  { to: '/portal-parceiro/meu-perfil', label: 'Meu perfil', icon: 'profile' },
]

function PortalMenuIcon({ type }) {
  if (type === 'home') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.8 10.6 12 3.8l8.2 6.8v9.6a1 1 0 0 1-1 1h-5.1v-6.4H9.9v6.4H4.8a1 1 0 0 1-1-1v-9.6Z" />
      </svg>
    )
  }

  if (type === 'tag') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M11.2 3.1H5.1A2.9 2.9 0 0 0 2.2 6v6L12 21.8l9.8-9.8-10.6-8.9ZM7.5 9a1.4 1.4 0 1 1 0-2.8 1.4 1.4 0 0 1 0 2.8Z" />
      </svg>
    )
  }

  if (type === 'activity') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="7.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M12 8.4v4.1l2.8 1.7" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0H4.8Z" />
    </svg>
  )
}

export default function PartnerPortalLayout({ title, children, showSidebarSignOut = false }) {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const [parceiro, setParceiro] = useState(null)

  useEffect(() => {
    let active = true

    async function loadParceiro() {
      const { data } = await fetchParceiro(supabase)

      if (!active) return
      setParceiro(data ?? null)
    }

    loadParceiro()

    return () => {
      active = false
    }
  }, [])

  const partnerName =
    parceiro?.nome_instituicao?.trim() ||
    profile?.nome_completo?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.user_metadata?.name?.trim() ||
    'Parceiro'
  const partnerEmail = parceiro?.email?.trim() || profile?.email?.trim() || user?.email || 'Sem e-mail cadastrado'

  const handleSignOut = async () => {
    setSigningOut(true)
    setSignOutError('')
    navigate('/login', { replace: true })

    try {
      const { error } = await signOut()

      if (error) {
        console.error('Falha ao encerrar sessão no portal parceiro.', error)
      }
    } catch (error) {
      console.error('Erro ao encerrar sessão.', error)
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <main className="partner-portal-page">
      <section className="partner-portal-shell">
        <aside className="partner-portal-sidebar">
          <div className="partner-portal-sidebar-main">
            <img src="/euras-coin.png" alt="" aria-hidden="true" className="partner-portal-coin" />

            <div className="partner-portal-profile-block">
              <h2>{partnerName}</h2>
              <p>{partnerEmail}</p>
            </div>

            <nav className="partner-portal-nav" aria-label="Menu parceiro">
              {portalMenuItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    isActive
                      ? 'partner-portal-nav-item partner-portal-nav-item-active'
                      : 'partner-portal-nav-item'
                  }
                >
                  <span className="partner-portal-nav-icon" aria-hidden="true">
                    <PortalMenuIcon type={item.icon} />
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {showSidebarSignOut ? (
            <div className="partner-portal-sidebar-footer">
              <button type="button" className="partner-portal-signout-button" onClick={handleSignOut}>
                {signingOut ? 'Encerrando...' : 'Encerrar sessão'}
              </button>
              {signOutError ? <p className="form-message form-message-error">{signOutError}</p> : null}
            </div>
          ) : null}
        </aside>

        <section className="partner-portal-content">
          {title ? <h1 className="partner-portal-title">{title}</h1> : null}
          {children}
        </section>
      </section>
    </main>
  )
}
