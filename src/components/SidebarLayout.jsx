import { useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const menuItems = [
  { to: '/dashboard', label: 'Tela inicial', icon: 'home', end: true },
  { to: '/alunos', label: 'Alunos', icon: 'alunos' },
  { to: '/parceiros', label: 'Parceiros', icon: 'parceiros' },
  { to: '/produtos', label: 'Produtos', icon: 'produtos' },
  { to: '/atividades', label: 'Atividades', icon: 'atividades' },
  { to: '/perfil', label: 'Meu perfil', icon: 'perfil' },
]

function MenuIcon({ type }) {
  if (type === 'home') {
    return (
      <svg viewBox="0 0 24 24" className="nav-icon-svg" aria-hidden="true">
        <path d="M3.5 10.8 12 3.8l8.5 7V21a1 1 0 0 1-1 1h-5.2v-6.7H9.7V22H4.5a1 1 0 0 1-1-1v-10.2Z" />
      </svg>
    )
  }

  if (type === 'alunos') {
    return (
      <svg viewBox="0 0 24 24" className="nav-icon-svg" aria-hidden="true">
        <path d="M2 8.3 12 3l10 5.3L12 13.5 2 8.3Z" />
        <path d="M6.4 10.9v3.8c0 1.4 2.5 3.3 5.6 3.3s5.6-1.9 5.6-3.3v-3.8L12 14.2l-5.6-3.3Z" />
      </svg>
    )
  }

  if (type === 'parceiros') {
    return (
      <svg viewBox="0 0 24 24" className="nav-icon-svg" aria-hidden="true">
        <path d="M3.8 8.6h16.4L18.9 5H5.1L3.8 8.6Z" />
        <path d="M5 9.8v9.7h14V9.8H5Zm4.2 9v-4.9h5.6v4.9H9.2Z" />
      </svg>
    )
  }

  if (type === 'produtos') {
    return (
      <svg viewBox="0 0 24 24" className="nav-icon-svg" aria-hidden="true">
        <path d="M11 3.2H5A2.8 2.8 0 0 0 2.2 6v6l9.8 9.8 9.8-9.8L12 3.2ZM7.6 9.1a1.3 1.3 0 1 1 0-2.6 1.3 1.3 0 0 1 0 2.6Z" />
      </svg>
    )
  }

  if (type === 'atividades') {
    return (
      <svg viewBox="0 0 24 24" className="nav-icon-svg" aria-hidden="true">
        <path d="M12 3 2.8 8 12 13 21.2 8 12 3Z" />
        <path d="m2.8 12 9.2 5 9.2-5-2.1-1.2-7.1 3.8-7.1-3.8L2.8 12Z" />
        <path d="m2.8 16 9.2 5 9.2-5-2.1-1.2-7.1 3.8-7.1-3.8L2.8 16Z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" className="nav-icon-svg" aria-hidden="true">
      <circle cx="12" cy="8.2" r="3.1" />
      <path d="M5 20a7 7 0 0 1 14 0H5Z" />
    </svg>
  )
}

export default function SidebarLayout({ title, children, showSidebarSignOut = true }) {
  const navigate = useNavigate()
  const { user, profile, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [signOutError, setSignOutError] = useState('')
  const profileName =
    profile?.nome_completo?.trim() ||
    user?.user_metadata?.full_name?.trim() ||
    user?.user_metadata?.name?.trim() ||
    'Eula Paula'
  const profileEmail = profile?.email?.trim() || user?.email || 'Sem e-mail'

  const handleSignOut = async () => {
    setSigningOut(true)
    setSignOutError('')

    try {
      const { error } = await signOut()

      if (error) {
        console.error('Falha ao encerrar sessão no Supabase.', {
          message: error.message,
          status: error.status,
          code: error.code,
          name: error.name,
        })
        setSignOutError('Não foi possível encerrar a sessão agora. Tente novamente.')
        return
      }

      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Erro inesperado ao encerrar sessão.', error)
      setSignOutError('Não foi possível encerrar a sessão agora. Tente novamente.')
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <main className="home-page">
      <section className="home-shell">
        <aside className="side-menu">
          <div className="side-menu-main">
            <div className="coin-logo" aria-hidden="true" />

            <div className="profile-block">
              <h2>{profileName}</h2>
              <p>{profileEmail}</p>
            </div>

            <nav className="nav-list" aria-label="Menu principal">
              {menuItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    isActive ? 'nav-item nav-item-active' : 'nav-item'
                  }
                >
                  <span className="nav-icon" aria-hidden="true">
                    <MenuIcon type={item.icon} />
                  </span>
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {showSidebarSignOut ? (
            <div className="side-menu-footer">
              <button type="button" className="signout-button" onClick={handleSignOut}>
                {signingOut ? 'Encerrando...' : 'Encerrar sessão'}
              </button>
              {signOutError ? <p className="form-message form-message-error">{signOutError}</p> : null}
            </div>
          ) : null}
        </aside>

        <section className="content-panel">
          {title ? <h1 className="content-title">{title}</h1> : null}
          {children}
        </section>
      </section>
    </main>
  )
}
