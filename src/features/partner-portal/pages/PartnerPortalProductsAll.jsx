import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { runWithRetries, withRequestTimeout } from '../../../lib/requestGuards'
import { supabase } from '../../../lib/supabase'
import PartnerPortalLayout from '../components/PartnerPortalLayout'
import { fetchParceiro, fetchProdutos, getParceiroDataErrorMessage } from '../hooks/useParceiroData'

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="5.8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="m15.2 15.2 4.3 4.3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
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
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function mapProduto(row, instituicao) {
  return {
    id: row.id,
    title: row.titulo ?? '',
    description: row.descricao ?? '',
    priceEuras: Number(row.preco_euras ?? 0),
    imageUrl: row.url_imagem ?? '',
    active: row.ativo ?? true,
    institution: instituicao,
  }
}

export default function PartnerPortalProductsAll() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [products, setProducts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadNonce, setReloadNonce] = useState(0)

  const partnerProfileId = profile?.id ?? null

  useEffect(() => {
    let active = true

    async function loadProducts() {
      setLoading(true)
      setLoadError('')

      try {
        const [produtosResponse, parceiroResponse] = await runWithRetries(
          () =>
            withRequestTimeout(
              Promise.all([fetchProdutos(supabase), fetchParceiro(supabase)]),
              {
              message: 'Tempo limite ao carregar todos os produtos. Tente novamente.',
              },
            ),
          { attempts: 2 },
        )

        if (!active) return
        if (produtosResponse.error) throw produtosResponse.error
        if (parceiroResponse.error) throw parceiroResponse.error

        const instituicao = parceiroResponse.data?.nome_instituicao?.trim() || 'Parceiro'
        setProducts(
          (produtosResponse.data ?? [])
            .filter((row) => row?.ativo !== false)
            .map((row) => mapProduto(row, instituicao)),
        )
      } catch (error) {
        if (!active) return
        setLoadError(getParceiroDataErrorMessage(error))
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadProducts()

    return () => {
      active = false
    }
  }, [partnerProfileId, reloadNonce])

  const filteredProducts = useMemo(() => {
    const search = normalize(searchTerm.trim())
    if (!search) return products

    return products.filter((product) => {
      const title = normalize(product.title)
      const description = normalize(product.description)
      const institution = normalize(product.institution)
      return title.includes(search) || description.includes(search) || institution.includes(search)
    })
  }, [products, searchTerm])

  return (
    <PartnerPortalLayout title="Todos os produtos">
      <section className="portal-product-list-page">
        <div className="portal-product-list-header">
          <div className="portal-product-list-actions">
            <label className="portal-product-search" aria-label="Pesquisar produto">
              <span className="portal-product-search-icon">
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>
          </div>

          <button
            type="button"
            className="partner-home-see-all-button"
            onClick={() => navigate('/portal-parceiro/produtos')}
          >
            Voltar para grade 5x4
          </button>
        </div>

        <section className="portal-product-list-section">
          {loading ? <p className="form-message">Carregando produtos...</p> : null}

          {loadError && !loading ? (
            <div className="partner-home-error-box">
              <p>{loadError}</p>
              <button
                type="button"
                className="partner-home-link-button"
                onClick={() => setReloadNonce((current) => current + 1)}
              >
                Tentar novamente
              </button>
            </div>
          ) : null}

          {!loading && !loadError && filteredProducts.length === 0 ? (
            <p className="form-message">Nenhum produto encontrado com os filtros atuais.</p>
          ) : null}

          {!loading && !loadError ? (
            <div className="portal-product-cards-grid portal-product-cards-grid-all">
              {filteredProducts.map((product) => (
                <article key={product.id} className="portal-product-card">
                  <button
                    type="button"
                    className="portal-product-card-media"
                    aria-label={`Abrir controle do produto ${product.title}`}
                    onClick={() => navigate(`/portal-parceiro/produtos/${product.id}`)}
                  >
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.title}
                        className="portal-product-card-image"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <ProductCardIcon />
                    )}
                  </button>
                  <strong>{product.title}</strong>
                  <p>{product.institution || 'Parceiro'}</p>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      </section>
    </PartnerPortalLayout>
  )
}
