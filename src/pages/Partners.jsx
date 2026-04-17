import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SidebarLayout from '../components/SidebarLayout'
import { getPartnerApiErrorMessage, listPartners } from '../lib/partnersApi'

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="5.8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="m15.2 15.2 4.3 4.3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function AddPartnerIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.8 8.4h16.4L18.9 5H5.1L3.8 8.4Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 9.6v9.4h14V9.6H5Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 12v5M9.5 14.5h5" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
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

function normalize(text) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase()
}

export default function Partners() {
  const navigate = useNavigate()
  const [partners, setPartners] = useState([])
  const [loadingPartners, setLoadingPartners] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setLoadingPartners(true)
      setLoadError('')

      try {
        const nextPartners = await listPartners()

        if (!active) return
        setPartners(nextPartners)
      } catch (error) {
        if (!active) return
        console.info('Falha ao carregar parceiros no Supabase.', error)
        setLoadError(getPartnerApiErrorMessage(error))
      } finally {
        if (active) {
          setLoadingPartners(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [])

  const filteredCeeds = useMemo(() => {
    const ceedsPartners = partners.filter((partner) => partner.group === 'ceeds')
    const search = normalize(searchTerm.trim())

    if (!search) {
      return ceedsPartners
    }

    return ceedsPartners.filter((partner) => normalize(`${partner.name} ${partner.campus}`).includes(search))
  }, [partners, searchTerm])

  const filteredExternal = useMemo(() => {
    const externalPartners = partners.filter((partner) => partner.group === 'external')
    const search = normalize(searchTerm.trim())

    if (!search) {
      return externalPartners
    }

    return externalPartners.filter((partner) => normalize(`${partner.name} ${partner.campus}`).includes(search))
  }, [partners, searchTerm])

  return (
    <SidebarLayout>
      <section className="partners-page">
        <div className="partners-topbar">
          <h1 className="partners-heading">Parceiros</h1>

          <div className="partners-actions">
            <label className="partners-search" aria-label="Pesquisar parceiro">
              <span className="partners-search-icon">
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            <button type="button" className="partners-add-button" onClick={() => navigate('/parceiros/novo')}>
              <span className="partners-add-icon">
                <AddPartnerIcon />
              </span>
              <span>Adicionar parceiro</span>
            </button>
          </div>
        </div>

        <section className="partners-group" aria-label="Grupo Ceeds">
          <h2>Grupo Ceeds</h2>

          {loadingPartners ? <div className="students-empty-state">Carregando parceiros...</div> : null}
          {loadError && !loadingPartners ? <div className="students-empty-state">{loadError}</div> : null}

          <div className="partners-grid partners-grid-ceeds">
            {!loadingPartners && !loadError
              ? filteredCeeds.map((partner) => (
              <article key={partner.id} className="partner-card">
                <button
                  type="button"
                  className="partner-card-logo partner-card-link"
                  onClick={() => navigate(`/parceiros/${partner.id}`)}
                >
                  <PartnerLogo label="CEEDS" variant="light" />
                  <p>{partner.campus}</p>
                </button>
                <strong>{partner.name}</strong>
              </article>
                ))
              : null}
          </div>
        </section>

        <section className="partners-group" aria-label="Parceiros externos">
          <h2>Parceiros externos</h2>

          <div className="partners-grid">
            {!loadingPartners && !loadError
              ? filteredExternal.map((partner) => (
              <article key={partner.id} className="partner-card">
                <button
                  type="button"
                  className="partner-card-logo partner-card-link"
                  onClick={() => navigate(`/parceiros/${partner.id}`)}
                >
                  <PartnerLogo label={partner.logo} variant={partner.variant} />
                  <p>{partner.campus}</p>
                </button>
                <strong>{partner.name}</strong>
              </article>
                ))
              : null}
          </div>
        </section>
      </section>
    </SidebarLayout>
  )
}
