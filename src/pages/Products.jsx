import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import SidebarLayout from '../components/SidebarLayout'
import { getPartnerApiErrorMessage, listProducts } from '../lib/partnersApi'
import { runWithRetries, withRequestTimeout } from '../lib/requestGuards'

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="5.8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="m15.2 15.2 4.3 4.3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function FilterIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 6.5h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 12h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4 17.5h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="8.4" cy="6.5" r="1.9" fill="#f5f5f5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="15.7" cy="12" r="1.9" fill="#f5f5f5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="11.3" cy="17.5" r="1.9" fill="#f5f5f5" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function AddProductIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M2.8 9.8 7.4 5h7.7l6.1 6.1-7.8 7.8-10.6-9.1Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M7.4 7.5h.01" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      <path d="M17.6 9v5.6M14.8 11.8h5.6" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

function ProductCardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5" width="13.5" height="11" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="8.8" cy="9" r="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="m5.6 14.8 3.8-3.7 2.6 2.3 3.4-3.2 1.6 1.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M20 14.2v5.2M17.4 16.8h5.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

function normalize(text) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase()
}

function buildPreviewProducts(sourceProducts) {
  if (!Array.isArray(sourceProducts)) {
    return []
  }

  return sourceProducts
}

export default function Products() {
  const navigate = useNavigate()
  const location = useLocation()
  const filterRef = useRef(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [selectedInstitution, setSelectedInstitution] = useState('TODAS')
  const [products, setProducts] = useState([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadNonce, setReloadNonce] = useState(0)

  useEffect(() => {
    let active = true

    async function load() {
      setLoadingProducts(true)
      setLoadError('')

      try {
        const nextProducts = await runWithRetries(
          () =>
            withRequestTimeout(listProducts(), {
              message: 'Tempo limite ao carregar produtos. Tente novamente.',
            }),
          { attempts: 2 },
        )
        if (!active) return
        setProducts(nextProducts)
      } catch (error) {
        if (!active) return
        setLoadError(getPartnerApiErrorMessage(error))
      } finally {
        if (active) {
          setLoadingProducts(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [reloadNonce])

  useEffect(() => {
    if (!location.state?.resetFilters) {
      return
    }

    setSearchTerm('')
    setSelectedInstitution('TODAS')
    setShowFilters(false)
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.pathname, location.state, navigate])

  useEffect(() => {
    if (!showFilters) {
      return undefined
    }

    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowFilters(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showFilters])

  const previewProducts = useMemo(() => buildPreviewProducts(products), [products])

  const institutionOptions = useMemo(
    () => ['TODAS', ...new Set(previewProducts.map((product) => product.institution))],
    [previewProducts],
  )

  const filteredProducts = useMemo(() => {
    const search = normalize(searchTerm.trim())

    return previewProducts.filter((product) => {
      const matchesSearch =
        !search ||
        normalize(product.name).includes(search) ||
        normalize(product.institution).includes(search)

      const matchesInstitution =
        selectedInstitution === 'TODAS' || product.institution === selectedInstitution

      return matchesSearch && matchesInstitution
    })
  }, [previewProducts, searchTerm, selectedInstitution])

  const hasActiveFilters = searchTerm.trim() || selectedInstitution !== 'TODAS'

  return (
    <SidebarLayout>
      <section className="products-page">
        <div className="products-topbar">
          <h1 className="products-heading">Produtos</h1>

          <div className="products-actions" ref={filterRef}>
            <label className="products-search" aria-label="Pesquisar produto">
              <span className="products-search-icon">
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            <button
              type="button"
              className="products-filter-button"
              onClick={() => setShowFilters((current) => !current)}
            >
              <span className="products-button-icon">
                <FilterIcon />
              </span>
              <span>Filtros</span>
            </button>

            {showFilters ? (
              <div className="products-filter-popover">
                <label className="products-filter-row">
                  <span>Parceiro:</span>
                  <select
                    value={selectedInstitution}
                    onChange={(event) => setSelectedInstitution(event.target.value)}
                  >
                    {institutionOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : null}

            <button type="button" className="products-add-button" onClick={() => navigate('/produtos/novo')}>
              <span className="products-button-icon">
                <AddProductIcon />
              </span>
              <span>Adicionar produto</span>
            </button>
          </div>
        </div>

        <section className="products-highlights">
          <h2>Produtos em alta</h2>

          {loadingProducts ? <p className="products-empty-state">Carregando produtos...</p> : null}
          {loadError && !loadingProducts ? (
            <div className="products-empty-state products-empty-state-with-action">
              <p>{loadError}</p>
              <button type="button" className="data-retry-button" onClick={() => setReloadNonce((current) => current + 1)}>
                Tentar novamente
              </button>
            </div>
          ) : null}

          {!loadingProducts && !loadError ? (
            <div className="products-grid">
              {filteredProducts.map((product) => (
                <article key={product.id} className="products-card">
                  <button
                    type="button"
                    className="products-card-logo products-card-link"
                    onClick={() => {
                      if (!product.previewOnly) {
                        navigate(`/produtos/${product.sourceId ?? product.id}`)
                      }
                    }}
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="products-card-image"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <ProductCardIcon />
                    )}
                  </button>
                  <strong>{product.name}</strong>
                  <p>{product.institution}</p>
                </article>
              ))}
            </div>
          ) : null}

          {!loadingProducts && !loadError && filteredProducts.length === 0 ? (
            <p className="products-empty-state">
              {hasActiveFilters
                ? 'Nenhum produto encontrado com os filtros atuais.'
                : 'Nenhum produto cadastrado ainda.'}
            </p>
          ) : null}
        </section>
      </section>
    </SidebarLayout>
  )
}

