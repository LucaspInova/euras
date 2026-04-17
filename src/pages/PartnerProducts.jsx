import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import SidebarLayout from '../components/SidebarLayout'
import { getPartnerApiErrorMessage, listPartnerProducts } from '../lib/partnersApi'

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="5.8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="m15.2 15.2 4.3 4.3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function ProductIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5" width="13.5" height="11" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="8.8" cy="9" r="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="m5.6 14.8 3.8-3.7 2.6 2.3 3.4-3.2 1.6 1.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M20 14.2v5.2M17.4 16.8h5.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
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

function normalize(text) {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase()
}

export default function PartnerProducts() {
  const navigate = useNavigate()
  const { partnerId } = useParams()
  const [searchTerm, setSearchTerm] = useState('')
  const [partner, setPartner] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setLoadError('')

      try {
        const { partner: partnerData, products: productData } = await listPartnerProducts(partnerId)
        if (!active) return

        setPartner(partnerData)
        setProducts(productData)
      } catch (error) {
        if (!active) return
        console.info('Falha ao carregar produtos do parceiro.', error)
        setLoadError(getPartnerApiErrorMessage(error))
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    load()

    return () => {
      active = false
    }
  }, [partnerId])

  const filteredProducts = useMemo(() => {
    const search = normalize(searchTerm.trim())

    if (!search) {
      return products
    }

    return products.filter((product) => normalize(product.name).includes(search))
  }, [products, searchTerm])

  if (!loading && !loadError && !partner) {
    return <Navigate to="/parceiros" replace />
  }

  return (
    <SidebarLayout>
      <section className="partner-products-page">
        <div className="partners-topbar">
          <div className="partners-actions">
            <label className="partners-search" aria-label="Pesquisar produto">
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

            <button type="button" className="partners-add-button" onClick={() => navigate(`/parceiros/${partnerId}/produtos/novo`)}>
              <span className="partners-add-icon">
                <AddProductIcon />
              </span>
              <span>Adicionar produto</span>
            </button>
          </div>
        </div>

        {loading ? <div className="students-empty-state">Carregando produtos...</div> : null}
        {loadError ? <div className="students-empty-state">{loadError}</div> : null}

        {!loading && !loadError && partner ? (
          <section className="partners-group">
            <h2>{`${partner.name} (${filteredProducts.length})`}</h2>

            <div className="product-grid">
              {filteredProducts.map((product) => (
                <article key={product.id} className="product-card">
                  <button
                    type="button"
                    className="product-card-logo product-card-link"
                    onClick={() => navigate(`/parceiros/${partnerId}/produtos/${product.id}`)}
                  >
                    <ProductIcon />
                  </button>
                  <strong>{product.name}</strong>
                  <p>{partner.name}</p>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {partner ? (
          <button
            type="button"
            className="student-back-button partner-products-back"
            onClick={() => navigate(`/parceiros/${partner.id}`)}
          >
            Voltar
          </button>
        ) : null}
      </section>
    </SidebarLayout>
  )
}
