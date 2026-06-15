import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { useModalDismiss } from '../../../hooks/useModalDismiss'
import {
  getStudentCatalog,
  getStudentHome,
  getStudentStatement,
  mapStudentProfile,
  requestProductRedemption,
  uploadStudentAvatar,
} from '../../../lib/studentPortalApi'

const coinSrc = '/euras-coin.png'

function HomeIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 11.2 12 4l8 7.2v8.3a1.5 1.5 0 0 1-1.5 1.5H15v-5.5H9V21H5.5A1.5 1.5 0 0 1 4 19.5v-8.3Z"
        fill="currentColor"
      />
    </svg>
  )
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10.8 4a6.8 6.8 0 1 0 0 13.6 6.8 6.8 0 0 0 0-13.6Zm0 2a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6Z"
        fill="currentColor"
      />
      <path
        d="m15.7 16.9 3.4 3.4a1 1 0 0 0 1.4-1.4l-3.4-3.4a1 1 0 1 0-1.4 1.4Z"
        fill="currentColor"
      />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 12.5a4.4 4.4 0 1 0 0-8.8 4.4 4.4 0 0 0 0 8.8Zm0 2c-4.1 0-7.4 2.2-7.4 4.8 0 .6.5 1 1 1h12.8c.6 0 1-.4 1-1 0-2.6-3.3-4.8-7.4-4.8Z"
        fill="currentColor"
      />
    </svg>
  )
}

function CameraIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M8.6 5.5 7.3 7H5.5A2.5 2.5 0 0 0 3 9.5v7A2.5 2.5 0 0 0 5.5 19h13a2.5 2.5 0 0 0 2.5-2.5v-7A2.5 2.5 0 0 0 18.5 7h-1.8l-1.3-1.5H8.6Zm3.4 4A3.8 3.8 0 1 1 12 17a3.8 3.8 0 0 1 0-7.5Zm0 2A1.8 1.8 0 1 0 12 15a1.8 1.8 0 0 0 0-3.5Z"
        fill="currentColor"
      />
    </svg>
  )
}

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M14.7 5.3a1 1 0 0 1 0 1.4L9.4 12l5.3 5.3a1 1 0 0 1-1.4 1.4l-6-6a1 1 0 0 1 0-1.4l6-6a1 1 0 0 1 1.4 0Z"
        fill="currentColor"
      />
    </svg>
  )
}

function SignOutIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M10 7V5.5A2.5 2.5 0 0 1 12.5 3H18v18h-5.5A2.5 2.5 0 0 1 10 18.5V17"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M4 12h10m-3.5-3.5L14 12l-3.5 3.5"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function normalizeAuthProfile(profile, user) {
  const mapped = mapStudentProfile(profile)

  if (mapped) {
    return {
      ...mapped,
      email: mapped.email || user?.email || '',
      full_name:
        mapped.full_name ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        'Aluno',
    }
  }

  if (!user) return null

  return {
    id: null,
    full_name: user.user_metadata?.full_name || user.user_metadata?.name || 'Aluno',
    email: user.email || '',
    avatar_url: '',
    telefone: '',
    campus: '',
    curso: '',
    role: 'aluno',
    ativo: true,
  }
}

function getInitial(name) {
  return String(name || 'A').trim().charAt(0).toUpperCase() || 'A'
}

function formatEuras(value, { decimals = 2, suffix = false } = {}) {
  const numeric = Number(value)
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(numeric) ? numeric : 0)

  return suffix ? `${formatted} Euras` : formatted
}

function formatDate(value) {
  if (!value) return ''

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return ''

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  }).format(parsed)
}

function getErrorMessage(error, fallback = 'Nao foi possivel carregar.') {
  return error?.message || fallback
}

function StudentHeader({ name, initial, avatarUrl, showGreeting = true, showAvatar = true }) {
  return (
    <header className="student-app-header">
      {showAvatar ? (
        <div className="student-header-avatar">
          {avatarUrl ? <img src={avatarUrl} alt="" /> : <span>{initial}</span>}
        </div>
      ) : (
        <div className="student-header-avatar-spacer" />
      )}

      <strong className="student-header-title">
        {showGreeting ? 'Ola, ' : ''}
        {name || 'Aluno'}
      </strong>

      <div className="student-header-avatar-spacer" />
    </header>
  )
}

function StudentBackHeader({ title, onBack }) {
  return (
    <header className="student-back-header">
      <button type="button" onClick={onBack} title="Voltar" aria-label="Voltar">
        <BackIcon />
      </button>
      <strong>{title}</strong>
      <span />
    </header>
  )
}

function StudentScreen({ children, className = '' }) {
  return <section className={`student-screen ${className}`}>{children}</section>
}

function StudentBalanceCard({ value, loading, error }) {
  const [intPart, decimalPart] = String(value || '0,00').split(',')

  return (
    <div className="student-balance-card">
      <div className="student-balance-icon">
        <img src={coinSrc} alt="" />
      </div>
      <div className="student-balance-value" aria-live="polite">
        {loading ? (
          <span className="student-muted">Carregando...</span>
        ) : error ? (
          <span className="student-error">Nao foi possivel carregar</span>
        ) : (
          <>
            <strong>{intPart}</strong>
            {decimalPart ? <span>,{decimalPart}</span> : null}
          </>
        )}
      </div>
    </div>
  )
}

function StudentSectionHeader({ title, actionLabel, onAction }) {
  return (
    <div className="student-section-header">
      <h2>{title}</h2>
      {onAction ? (
        <button type="button" onClick={onAction}>
          {actionLabel || 'Ver todos'}
        </button>
      ) : null}
    </div>
  )
}

function StudentListRow({ title, subtitle, amount, amountClassName = '' }) {
  return (
    <div className="student-list-row">
      <div className="student-list-copy">
        <strong>{title}</strong>
        {subtitle ? <span>{subtitle}</span> : null}
      </div>
      <div className={`student-list-amount ${amountClassName}`}>
        <img src={coinSrc} alt="" />
        <strong>{amount}</strong>
      </div>
    </div>
  )
}

function StudentProductCard({ product, price, onPress }) {
  const imageUrl = product.image_url || product.partner?.avatar_url || ''
  const partnerName = product.partner?.full_name || 'Parceiro'

  return (
    <button className="student-product-card" type="button" onClick={onPress}>
      <span className="student-product-media">
        {imageUrl ? <img src={imageUrl} alt="" /> : <img src={coinSrc} alt="" />}
      </span>
      <strong>{product.title || 'Produto'}</strong>
      <span className="student-product-price">
        <img src={coinSrc} alt="" />
        {price}
      </span>
      <span className="student-product-partner">{partnerName}</span>
    </button>
  )
}

function StudentPartnerCard({ partner, onPress }) {
  const initial = getInitial(partner.name)

  return (
    <button className="student-partner-card" type="button" onClick={onPress}>
      <span className="student-partner-logo">
        {partner.avatarUrl ? <img src={partner.avatarUrl} alt="" /> : <strong>{initial}</strong>}
      </span>
      <span>{partner.name || 'Parceiro'}</span>
    </button>
  )
}

function StudentModal({ visible, tone = 'success', title, children, actionLabel, onConfirm }) {
  useModalDismiss(visible, onConfirm)

  if (!visible) return null

  return (
    <div
      className="student-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onConfirm()
      }}
    >
      <div
        className="student-modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="student-modal-close" aria-label="Fechar" onClick={onConfirm}>
          <CloseIcon />
        </button>
        <div className={`student-modal-icon student-modal-icon-${tone}`}>
          {tone === 'success' ? '✓' : '×'}
        </div>
        <h3>{title}</h3>
        {children}
        <button className="student-primary-button" type="button" onClick={onConfirm}>
          {actionLabel || 'Continuar'}
        </button>
      </div>
    </div>
  )
}

function StudentHomeScreen({ profile, refreshKey, onProfileLoaded, navigation }) {
  const [summary, setSummary] = useState(null)
  const [ledger, setLedger] = useState([])
  const [summaryError, setSummaryError] = useState('')
  const [ledgerError, setLedgerError] = useState('')
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [loadingLedger, setLoadingLedger] = useState(true)
  const [pendingRedemptions, setPendingRedemptions] = useState([])
  const [loadingRedemptions, setLoadingRedemptions] = useState(true)
  const [redemptionsError, setRedemptionsError] = useState('')
  const [products, setProducts] = useState([])
  const [productsError, setProductsError] = useState('')
  const [loadingProducts, setLoadingProducts] = useState(true)

  const displayName = profile?.full_name || 'Aluno'
  const initial = getInitial(displayName)

  const fetchHomeData = useCallback(async () => {
    setSummaryError('')
    setRedemptionsError('')
    setProductsError('')
    setLoadingSummary(true)
    setLoadingRedemptions(true)
    setLoadingProducts(true)

    try {
      const home = await getStudentHome()
      setSummary(home.summary)
      setPendingRedemptions(home.pendingRedemptions || [])
      setProducts(home.products || [])
      if (home.profile) onProfileLoaded(home.profile)
    } catch (error) {
      const message = getErrorMessage(error)
      setSummaryError(message)
      setRedemptionsError(message)
      setProductsError('Nao foi possivel carregar os produtos.')
      setSummary(null)
      setPendingRedemptions([])
      setProducts([])
    } finally {
      setLoadingSummary(false)
      setLoadingRedemptions(false)
      setLoadingProducts(false)
    }
  }, [onProfileLoaded])

  const fetchLedger = useCallback(async () => {
    setLedgerError('')
    setLoadingLedger(true)

    try {
      const statement = await getStudentStatement({ limit: 5 })
      setLedger(statement.items || [])
    } catch (error) {
      setLedgerError(getErrorMessage(error))
      setLedger([])
    } finally {
      setLoadingLedger(false)
    }
  }, [])

  useEffect(() => {
    fetchHomeData()
    fetchLedger()
  }, [fetchHomeData, fetchLedger, profile?.id, refreshKey])

  return (
    <>
      <StudentHeader
        name={displayName}
        initial={initial}
        avatarUrl={profile?.avatar_url}
        showAvatar={false}
      />

      <StudentScreen className="student-home-screen">
        <div className="student-balance-section">
          <h1>Saldo Atual</h1>
          <StudentBalanceCard
            value={formatEuras(summary?.available ?? 0)}
            loading={loadingSummary}
            error={summaryError}
          />
        </div>

        <section className="student-content-section">
          <StudentSectionHeader title="Produtos" onAction={() => navigation.navigate('search')} />
          {loadingProducts ? (
            <p className="student-muted">Carregando...</p>
          ) : productsError ? (
            <p className="student-error">{productsError}</p>
          ) : products.length === 0 ? (
            <p className="student-muted">Nenhum produto disponivel no momento.</p>
          ) : (
            <div className="student-horizontal-list">
              {products.map((product) => (
                <StudentProductCard
                  key={product.id}
                  product={product}
                  price={formatEuras(product.price_euras, { decimals: 2 })}
                  onPress={() => navigation.navigate('product', { productId: product.id })}
                />
              ))}
            </div>
          )}
        </section>

        <section className="student-content-section">
          <StudentSectionHeader title="Resgates pendentes" />
          {loadingRedemptions ? (
            <p className="student-muted">Carregando...</p>
          ) : redemptionsError ? (
            <p className="student-error">{redemptionsError}</p>
          ) : pendingRedemptions.length === 0 ? (
            <p className="student-muted">Nenhum resgate pendente.</p>
          ) : (
            pendingRedemptions.map((item) => (
              <StudentListRow
                key={item.id}
                title={item.product_title || 'Resgate pendente'}
                subtitle={`Aguardando confirmacao - ${formatDate(item.created_at)}`}
                amount={`-${formatEuras(item.amount_euras)}`}
              />
            ))
          )}
          {pendingRedemptions.length > 0 && !loadingRedemptions && !redemptionsError ? (
            <button className="student-link-button" type="button" onClick={fetchHomeData}>
              Atualizar resgates <span>{'>'}</span>
            </button>
          ) : null}
        </section>

        <section className="student-content-section">
          <StudentSectionHeader title="Atividades" />
          {loadingLedger ? (
            <p className="student-muted">Carregando...</p>
          ) : ledgerError ? (
            <p className="student-error">Nao foi possivel carregar</p>
          ) : ledger.length === 0 ? (
            <p className="student-muted">Nenhuma movimentacao ainda.</p>
          ) : (
            ledger.map((item) => {
              const isCredit = item.entry_type === 'credit'
              const title = item.note?.trim()
                ? item.note
                : isCredit
                  ? 'Credito'
                  : 'Resgate confirmado'
              const subtitle = `${isCredit ? 'Credito' : 'Debito'} - ${formatDate(
                item.created_at,
              )}`
              const amount = `${isCredit ? '+' : '-'}${formatEuras(Math.abs(item.amount || 0))}`

              return (
                <StudentListRow
                  key={item.id}
                  title={title}
                  subtitle={subtitle}
                  amount={amount}
                  amountClassName={isCredit ? 'student-list-amount-credit' : ''}
                />
              )
            })
          )}
          {ledger.length > 0 && !loadingLedger && !ledgerError ? (
            <button className="student-link-button" type="button" onClick={fetchLedger}>
              Atualizar atividades <span>{'>'}</span>
            </button>
          ) : null}
        </section>
      </StudentScreen>
    </>
  )
}

function StudentSearchScreen({ navigation }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    setError('')
    setLoading(true)

    try {
      const data = await getStudentCatalog()
      setProducts(Array.isArray(data) ? data : [])
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Nao foi possivel carregar os produtos agora.'))
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return products

    return products.filter((item) => {
      const titleMatch = (item.title || '').toLowerCase().includes(term)
      const partnerMatch = (item.partner?.full_name || '').toLowerCase().includes(term)
      return titleMatch || partnerMatch
    })
  }, [products, searchTerm])

  const partners = useMemo(() => {
    const source = searchTerm.trim() ? filteredProducts : products
    const map = new Map()

    source.forEach((product) => {
      if (!product.partner_profile_id || map.has(product.partner_profile_id)) return

      map.set(product.partner_profile_id, {
        id: product.partner_profile_id,
        name: product.partner?.full_name || 'Parceiro',
        avatarUrl: product.partner?.avatar_url || '',
      })
    })

    return Array.from(map.values())
  }, [filteredProducts, products, searchTerm])

  const showEmptySearch = searchTerm.trim().length > 0 && filteredProducts.length === 0

  return (
    <>
      <StudentHeader name="Pesquisar" initial="P" showGreeting={false} showAvatar={false} />

      <div className="student-search-bar-wrap">
        <label className="student-search-bar">
          <span>
            <SearchIcon />
          </span>
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Pesquisar produtos ou lojas"
          />
        </label>
      </div>

      <StudentScreen className="student-search-screen">
        <section className="student-content-section">
          <StudentSectionHeader title="Lojas Parceiras" />
          {loading ? (
            <p className="student-muted">Carregando...</p>
          ) : error ? (
            <p className="student-error">{error}</p>
          ) : partners.length === 0 ? (
            <p className="student-muted">Nenhuma loja encontrada.</p>
          ) : (
            <div className="student-partner-list">
              {partners.map((partner) => (
                <StudentPartnerCard
                  key={partner.id}
                  partner={partner}
                  onPress={() =>
                    navigation.navigate('partner', {
                      partnerId: partner.id,
                      partnerName: partner.name,
                      partnerAvatarUrl: partner.avatarUrl,
                    })
                  }
                />
              ))}
            </div>
          )}
        </section>

        <section className="student-content-section">
          <StudentSectionHeader title="Produtos" />
          {loading ? (
            <p className="student-muted">Carregando...</p>
          ) : error ? (
            <p className="student-error">{error}</p>
          ) : showEmptySearch ? (
            <p className="student-muted">Nenhum produto encontrado.</p>
          ) : filteredProducts.length === 0 ? (
            <p className="student-muted">Nenhum produto disponivel no momento.</p>
          ) : (
            <div className="student-product-grid">
              {filteredProducts.map((product) => (
                <StudentProductCard
                  key={product.id}
                  product={product}
                  price={formatEuras(product.price_euras, { decimals: 0, suffix: true })}
                  onPress={() => navigation.navigate('product', { productId: product.id })}
                />
              ))}
            </div>
          )}
        </section>
      </StudentScreen>
    </>
  )
}

function StudentPartnerStoreScreen({ navigation, routeParams = {} }) {
  const partnerId = routeParams.partnerId || routeParams.partner_profile_id
  const initialName = routeParams.partnerName || 'Loja Parceira'
  const initialLogo = routeParams.partnerAvatarUrl || ''

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [partnerName, setPartnerName] = useState(initialName)
  const [partnerLogo, setPartnerLogo] = useState(initialLogo)

  const loadProducts = useCallback(async () => {
    if (!partnerId) {
      setError('Loja nao encontrada.')
      setLoading(false)
      return
    }

    setError('')
    setLoading(true)

    try {
      const data = await getStudentCatalog()
      const items = Array.isArray(data)
        ? data.filter((item) => item.partner_profile_id === partnerId)
        : []

      setProducts(items)

      const partnerProfile = items?.[0]?.partner
      if (partnerProfile?.full_name) setPartnerName(partnerProfile.full_name)
      if (partnerProfile?.avatar_url) setPartnerLogo(partnerProfile.avatar_url)
    } catch (loadError) {
      setError(getErrorMessage(loadError, 'Nao foi possivel carregar os produtos desta loja.'))
      setProducts([])
    } finally {
      setLoading(false)
    }
  }, [partnerId])

  useEffect(() => {
    loadProducts()
  }, [loadProducts])

  return (
    <>
      <StudentBackHeader title="Loja" onBack={navigation.goBack} />

      <StudentScreen className="student-store-screen">
        <div className="student-store-hero">
          {partnerLogo ? <img src={partnerLogo} alt="" /> : <img src={coinSrc} alt="" />}
        </div>

        <div className="student-store-info">
          <h1>{partnerName}</h1>
          <div className="student-store-stat">
            <span>Produtos ofertados</span>
            <strong>{products.length}</strong>
          </div>
        </div>

        <section className="student-content-section">
          <StudentSectionHeader title="Produtos disponiveis" />
          {loading ? (
            <p className="student-muted">Carregando...</p>
          ) : error ? (
            <p className="student-error">{error}</p>
          ) : products.length === 0 ? (
            <p className="student-muted">Nenhum produto ativo para esta loja.</p>
          ) : (
            <div className="student-product-grid">
              {products.map((product) => (
                <StudentProductCard
                  key={product.id}
                  product={product}
                  price={formatEuras(product.price_euras, { decimals: 0, suffix: true })}
                  onPress={() => navigation.navigate('product', { productId: product.id })}
                />
              ))}
            </div>
          )}
        </section>
      </StudentScreen>
    </>
  )
}

function StudentProductScreen({ navigation, routeParams = {}, onRedemptionSuccess }) {
  const productId = routeParams.productId

  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [productError, setProductError] = useState('')
  const [redeemError, setRedeemError] = useState('')
  const [redeeming, setRedeeming] = useState(false)
  const [successVisible, setSuccessVisible] = useState(false)
  const [insufficientVisible, setInsufficientVisible] = useState(false)
  const [walletBalance, setWalletBalance] = useState(0)

  const loadProduct = useCallback(async () => {
    if (!productId) {
      setProductError('Produto nao encontrado.')
      setLoading(false)
      return
    }

    setProductError('')
    setLoading(true)

    try {
      const products = await getStudentCatalog()
      const data = products.find((item) => item.id === productId)

      if (!data) {
        setProductError('Nao foi possivel carregar o produto.')
        setProduct(null)
        return
      }

      setProduct(data)
    } catch (error) {
      setProductError(getErrorMessage(error, 'Nao foi possivel carregar o produto.'))
      setProduct(null)
    } finally {
      setLoading(false)
    }
  }, [productId])

  useEffect(() => {
    loadProduct()
  }, [loadProduct])

  const loadBalance = async () => {
    try {
      const home = await getStudentHome()
      setWalletBalance(Number(home?.summary?.available) || 0)
    } catch {
      setWalletBalance(0)
    }
  }

  const handleRedeem = async () => {
    if (!productId || !product) {
      setRedeemError('Produto indisponivel para resgate.')
      return
    }

    setRedeeming(true)
    setRedeemError('')

    try {
      await requestProductRedemption(productId)
      setSuccessVisible(true)
    } catch (error) {
      const message = String(error?.message || '').toLowerCase()
      if (message.includes('insufficient balance') || message.includes('saldo insuficiente')) {
        await loadBalance()
        setInsufficientVisible(true)
        return
      }

      setRedeemError(getErrorMessage(error, 'Nao foi possivel concluir o resgate.'))
    } finally {
      setRedeeming(false)
    }
  }

  const productImage = product?.image_url || product?.partner?.avatar_url || ''
  const partnerName = product?.partner?.full_name || ''

  return (
    <>
      <StudentBackHeader title="Produto" onBack={navigation.goBack} />

      <StudentScreen className="student-product-detail-screen">
        {loading ? (
          <p className="student-muted">Carregando...</p>
        ) : productError ? (
          <p className="student-error">{productError}</p>
        ) : !product ? (
          <p className="student-error">Produto nao encontrado.</p>
        ) : (
          <>
            <div className="student-product-detail-image">
              {productImage ? <img src={productImage} alt="" /> : <img src={coinSrc} alt="" />}
            </div>

            <div className="student-product-detail-content">
              <h1>{product.title}</h1>
              {partnerName ? <p>{partnerName}</p> : null}

              <div className="student-product-detail-price">
                <img src={coinSrc} alt="" />
                <strong>{formatEuras(product.price_euras, { decimals: 0, suffix: true })}</strong>
              </div>

              <button
                className="student-primary-button student-redeem-button"
                type="button"
                disabled={redeeming}
                onClick={handleRedeem}
              >
                {redeeming ? 'Processando...' : 'Resgatar'}
              </button>

              {product.description ? (
                <p className="student-product-description">{product.description}</p>
              ) : null}
              {redeemError ? <p className="student-error">{redeemError}</p> : null}
            </div>
          </>
        )}
      </StudentScreen>

      <StudentModal
        visible={successVisible}
        title="Sua operacao foi confirmada."
        onConfirm={() => {
          setSuccessVisible(false)
          onRedemptionSuccess()
        }}
      />

      <StudentModal
        visible={insufficientVisible}
        tone="error"
        title="Saldo insuficiente"
        actionLabel="Ok"
        onConfirm={() => setInsufficientVisible(false)}
      >
        <strong className="student-modal-balance">{formatEuras(walletBalance)} Euras</strong>
      </StudentModal>
    </>
  )
}

function StudentUserScreen({ profile, userEmail, onLogout, onAvatarUpdated }) {
  const displayName = profile?.full_name?.trim() || 'Aluno Euras'
  const initial = getInitial(displayName)
  const fileInputRef = useRef(null)

  const [openItem, setOpenItem] = useState(null)
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError, setAvatarError] = useState('')

  useEffect(() => {
    setAvatarUrl(profile?.avatar_url || '')
  }, [profile?.avatar_url])

  const accordionItems = useMemo(
    () => [
      {
        id: 'about',
        title: 'O que sao Euras?',
        content: 'Moeda de recompensa que voce acumula e troca por beneficios.',
      },
      {
        id: 'earn',
        title: 'Como ganhar Euras?',
        content: 'Participe das atividades, conclua desafios e acompanhe metas no app.',
      },
      {
        id: 'report',
        title: 'Relatar um problema',
        content: 'Envie seu relato pelo suporte para que possamos resolver rapido.',
      },
      {
        id: 'logout',
        title: 'Desconectar',
        content: 'Tem certeza que deseja sair da sua conta?',
        destructive: true,
        actionLabel: 'Sair agora',
      },
    ],
    [],
  )

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingAvatar(true)
    setAvatarError('')

    try {
      const publicUrl = await uploadStudentAvatar(profile?.id, file)
      setAvatarUrl(publicUrl)
      onAvatarUpdated(publicUrl)
    } catch (error) {
      setAvatarError(getErrorMessage(error, 'Nao foi possivel enviar a foto.'))
    } finally {
      setUploadingAvatar(false)
      event.target.value = ''
    }
  }

  return (
    <>
      <StudentHeader name="Meu Perfil" initial={initial} showGreeting={false} showAvatar={false} />

      <StudentScreen className="student-user-screen">
        <section className="student-profile-card">
          <button
            className="student-profile-avatar-button"
            type="button"
            disabled={uploadingAvatar}
            onClick={() => fileInputRef.current?.click()}
            title="Alterar foto"
            aria-label="Alterar foto"
          >
            <span className="student-profile-avatar">
              {avatarUrl ? <img src={avatarUrl} alt="" /> : <strong>{initial}</strong>}
            </span>
            <span className="student-profile-camera">
              {uploadingAvatar ? <span className="student-upload-dot" /> : <CameraIcon />}
            </span>
          </button>
          <input
            ref={fileInputRef}
            className="student-avatar-input"
            type="file"
            accept="image/*"
            onChange={handleFileChange}
          />
          {avatarError ? <p className="student-error">{avatarError}</p> : null}

          <div className="student-profile-info">
            <div className="student-profile-info-row">
              <span>N</span>
              <div>
                <strong>Nome:</strong>
                <p>{displayName}</p>
              </div>
            </div>

            <div className="student-profile-info-row">
              <span>E</span>
              <div>
                <strong>E-mail:</strong>
                <p>{profile?.email || userEmail || 'Email nao informado'}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="student-accordion">
          {accordionItems.map((item) => {
            const isOpen = openItem === item.id

            return (
              <div
                className={`student-accordion-item ${
                  item.destructive ? 'student-accordion-danger' : ''
                }`}
                key={item.id}
              >
                <button
                  type="button"
                  className="student-accordion-header"
                  onClick={() => setOpenItem(isOpen ? null : item.id)}
                >
                  <span className={isOpen ? 'student-chevron-open' : ''}>{'>'}</span>
                  <strong>{item.title}</strong>
                </button>
                {isOpen ? (
                  <div className="student-accordion-body">
                    <p>{item.content}</p>
                    {item.id === 'logout' ? (
                      <button className="student-danger-button" type="button" onClick={onLogout}>
                        <SignOutIcon />
                        {item.actionLabel}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          })}
        </section>
      </StudentScreen>
    </>
  )
}

function StudentBottomNav({ activeTab, onNavigate }) {
  const items = [
    { id: 'home', label: 'Inicio', icon: <HomeIcon /> },
    { id: 'search', label: 'Pesquisar', icon: <SearchIcon /> },
    { id: 'user', label: 'Perfil', icon: <UserIcon /> },
  ]

  return (
    <nav className="student-bottom-nav" aria-label="Menu do aluno">
      {items.map(({ id, label, icon }) => (
        <button
          key={id}
          type="button"
          className={activeTab === id ? 'active' : ''}
          onClick={() => onNavigate(id)}
          title={label}
          aria-label={label}
        >
          {icon}
        </button>
      ))}
    </nav>
  )
}

export default function StudentPortalHome() {
  const navigate = useNavigate()
  const { profile: authProfile, user, signOut, refreshProfile } = useAuth()
  const initialProfile = useMemo(
    () => normalizeAuthProfile(authProfile, user),
    [authProfile, user],
  )

  const [studentProfile, setStudentProfile] = useState(initialProfile)
  const [rootTab, setRootTab] = useState('home')
  const [stack, setStack] = useState([{ name: 'home' }])
  const [homeRefreshKey, setHomeRefreshKey] = useState(0)

  useEffect(() => {
    setStudentProfile(initialProfile)
  }, [initialProfile])

  const goBack = useCallback(() => {
    setStack((currentStack) => {
      if (!currentStack || currentStack.length <= 1) {
        return [{ name: rootTab }]
      }

      return currentStack.slice(0, -1)
    })
  }, [rootTab])

  const resetToHome = useCallback(() => {
    setHomeRefreshKey((current) => current + 1)
    setRootTab('home')
    setStack([{ name: 'home' }])
  }, [])

  const navigateInside = useCallback((target, params = {}) => {
    const name = String(target || '').toLowerCase()
    if (!name) return

    if (name === 'home' || name === 'search' || name === 'user') {
      setRootTab(name)
      setStack([{ name, params }])
      return
    }

    if (name === 'partner' || name === 'product') {
      setStack((currentStack) => [...(currentStack || []), { name, params }])
    }
  }, [])

  const navigation = useMemo(
    () => ({
      navigate: navigateInside,
      goBack,
      resetToHome,
    }),
    [goBack, navigateInside, resetToHome],
  )

  const handleLogout = async () => {
    await signOut()
    navigate('/login', { replace: true })
  }

  const handleProfileLoaded = useCallback((nextProfile) => {
    setStudentProfile(nextProfile)
  }, [])

  const handleAvatarUpdated = async (avatarUrl) => {
    setStudentProfile((current) => ({ ...(current || {}), avatar_url: avatarUrl }))

    try {
      await refreshProfile()
    } catch {
      // A foto ja foi salva; o proximo refresh da pagina sincroniza o contexto.
    }
  }

  const current = stack[stack.length - 1] || { name: 'home' }

  const renderScreen = () => {
    if (current.name === 'home') {
      return (
        <StudentHomeScreen
          profile={studentProfile}
          refreshKey={homeRefreshKey}
          onProfileLoaded={handleProfileLoaded}
          navigation={navigation}
        />
      )
    }

    if (current.name === 'search') {
      return <StudentSearchScreen navigation={navigation} />
    }

    if (current.name === 'user') {
      return (
        <StudentUserScreen
          profile={studentProfile}
          userEmail={user?.email}
          onLogout={handleLogout}
          onAvatarUpdated={handleAvatarUpdated}
        />
      )
    }

    if (current.name === 'partner') {
      return (
        <StudentPartnerStoreScreen
          navigation={navigation}
          routeParams={current.params || {}}
        />
      )
    }

    if (current.name === 'product') {
      return (
        <StudentProductScreen
          navigation={navigation}
          routeParams={current.params || {}}
          onRedemptionSuccess={resetToHome}
        />
      )
    }

    return (
      <StudentHomeScreen
        profile={studentProfile}
        refreshKey={homeRefreshKey}
        onProfileLoaded={handleProfileLoaded}
        navigation={navigation}
      />
    )
  }

  return (
    <main className="student-portal-page">
      <div className="student-app-shell">
        <div className="student-app-view">{renderScreen()}</div>
        <StudentBottomNav activeTab={rootTab} onNavigate={navigateInside} />
      </div>
    </main>
  )
}
