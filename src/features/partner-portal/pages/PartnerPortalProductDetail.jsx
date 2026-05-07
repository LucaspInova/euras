import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { buildOptimizedImageDataUrl } from '../../../lib/imageUpload'
import { supabase } from '../../../lib/supabase'
import PartnerPortalLayout from '../components/PartnerPortalLayout'
import {
  atualizarProduto,
  fetchParceiro,
  fetchProdutos,
  getParceiroDataErrorMessage,
} from '../hooks/useParceiroData'

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M19 12H6M11.5 6.5 6 12l5.5 5.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ProductPhotoIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5" width="13.5" height="11" rx="1.8" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <circle cx="8.8" cy="9" r="1.5" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="m5.6 14.8 3.8-3.7 2.6 2.3 3.4-3.2 1.6 1.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="M20 14.2v5.2M17.4 16.8h5.2" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
    </svg>
  )
}

function RemoveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="m8.6 8.6 6.8 6.8M15.4 8.6l-6.8 6.8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  )
}

function formatPrice(value) {
  const numeric = Number(value)
  if (!Number.isFinite(numeric)) return ''
  return numeric.toFixed(2).replace('.', ',')
}

function parseEurasValue(value) {
  if (typeof value === 'number') {
    return value
  }

  const raw = String(value ?? '').trim().replace(/\s+/g, '')
  if (!raw) return Number.NaN

  let normalized = raw

  if (raw.includes(',') && raw.includes('.')) {
    normalized = raw.replace(/\./g, '').replace(',', '.')
  } else if (raw.includes(',')) {
    normalized = raw.replace(',', '.')
  }

  return Number(normalized)
}

function mapProduto(row, institution) {
  return {
    id: row.id,
    title: row.titulo ?? '',
    description: row.descricao ?? '',
    priceEuras: Number(row.preco_euras ?? 0),
    imageUrl: row.url_imagem ?? '',
    active: row.ativo ?? true,
    institution,
  }
}

function mapProductToForm(product) {
  return {
    name: product.title ?? '',
    institution: product.institution ?? '',
    value: formatPrice(product.priceEuras),
    description: product.description ?? '',
    imageUrl: product.imageUrl ?? '',
  }
}

export default function PartnerPortalProductDetail() {
  const navigate = useNavigate()
  const { productId } = useParams()
  const { profile } = useAuth()
  const fileInputRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [form, setForm] = useState(null)
  const [initialForm, setInitialForm] = useState(null)

  const partnerProfileId = profile?.id ?? null

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setLoadError('')

      try {
        const [produtosResponse, parceiroResponse] = await Promise.all([
          fetchProdutos(supabase),
          fetchParceiro(supabase),
        ])

        if (produtosResponse.error) throw produtosResponse.error
        if (parceiroResponse.error) throw parceiroResponse.error

        const institution = parceiroResponse.data?.nome_instituicao?.trim() || 'Parceiro'
        const productRow = (produtosResponse.data ?? []).find(
          (item) => item.id === productId && item.ativo !== false,
        )

        if (!active) return

        if (!productRow) {
          setForm(null)
          setInitialForm(null)
          return
        }

        const product = mapProduto(productRow, institution)
        const mapped = mapProductToForm(product)
        setForm(mapped)
        setInitialForm(mapped)
      } catch (error) {
        if (!active) return
        setLoadError(getParceiroDataErrorMessage(error))
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
  }, [partnerProfileId, productId])

  const handleFieldChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleChooseImage = () => {
    fileInputRef.current?.click()
  }

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setFormError('Selecione um arquivo de imagem válido.')
      return
    }

    try {
      const optimizedImageDataUrl = await buildOptimizedImageDataUrl(file)
      setForm((current) => ({ ...current, imageUrl: optimizedImageDataUrl }))
      setFormError('')
    } catch (error) {
      setFormError(error?.message ?? 'NÃ£o foi possÃ­vel carregar essa imagem.')
    }
  }

  const hasChanges = useMemo(() => {
    if (!form || !initialForm) {
      return false
    }

    return (
      form.name.trim() !== initialForm.name.trim() ||
      form.value.trim() !== initialForm.value.trim() ||
      form.description.trim() !== initialForm.description.trim() ||
      form.imageUrl !== initialForm.imageUrl
    )
  }, [form, initialForm])

  if (!loading && !loadError && !form) {
    return <Navigate to="/portal-parceiro/produtos" replace />
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form || !hasChanges) return

    setFormError('')

    if (!form.name.trim()) {
      setFormError('Informe o nome do produto.')
      return
    }

    if (!form.value.trim()) {
      setFormError('Informe o valor do produto.')
      return
    }

    setIsSaving(true)

    try {
      const parsedPrice = parseEurasValue(form.value.trim())
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        throw new Error('Informe um valor válido para o produto.')
      }

      const { error } = await atualizarProduto(supabase, productId, {
        titulo: form.name.trim(),
        descricao: form.description.trim(),
        preco_euras: parsedPrice,
        url_imagem: form.imageUrl,
      })
      if (error) throw error

      const [produtosResponse, parceiroResponse] = await Promise.all([
        fetchProdutos(supabase),
        fetchParceiro(supabase),
      ])

      if (produtosResponse.error) throw produtosResponse.error
      if (parceiroResponse.error) throw parceiroResponse.error

      const institution = parceiroResponse.data?.nome_instituicao?.trim() || 'Parceiro'
      const refreshedRow = (produtosResponse.data ?? []).find(
        (item) => item.id === productId && item.ativo !== false,
      )
      const refreshed = refreshedRow ? mapProduto(refreshedRow, institution) : null

      if (!refreshed) {
        navigate('/portal-parceiro/produtos', { replace: true })
        return
      }

      const mapped = mapProductToForm(refreshed)
      setForm(mapped)
      setInitialForm(mapped)
    } catch (error) {
      setFormError(getParceiroDataErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemove = async () => {
    setFormError('')
    setIsRemoving(true)

    try {
      const { error } = await atualizarProduto(supabase, productId, { ativo: false })
      if (error) throw error

      navigate('/portal-parceiro/produtos', { replace: true })
    } catch (error) {
      setFormError(getParceiroDataErrorMessage(error))
      setIsRemoving(false)
      setShowRemoveModal(false)
    }
  }

  return (
    <PartnerPortalLayout>
      <section className="portal-product-editor-page">
        <div className="portal-product-editor-header">
          <h1>Controle produto</h1>

          <button
            type="button"
            className="portal-product-back-button"
            aria-label="Voltar para produtos"
            onClick={() => navigate('/portal-parceiro/produtos')}
          >
            <BackIcon />
          </button>
        </div>

        {loading ? <p className="form-message">Carregando produto...</p> : null}
        {loadError ? <p className="form-message form-message-error">{loadError}</p> : null}
        {formError ? <p className="form-message form-message-error">{formError}</p> : null}

        {!loading && !loadError && form ? (
          <form className="portal-product-editor-form" onSubmit={handleSubmit}>
            <article className="portal-product-editor-card">
              <div className="portal-product-editor-grid">
                <div className="portal-product-editor-main">
                  <label className="portal-product-field">
                    <span>Produto:</span>
                    <input type="text" value={form.name} onChange={handleFieldChange('name')} />
                  </label>

                  <label className="portal-product-field">
                    <span>Instituição:</span>
                    <input type="text" value={form.institution} disabled />
                  </label>

                  <div className="portal-product-value-block">
                    <span>Valor:</span>
                    <label className="portal-product-value-row">
                      <strong className="portal-product-value-symbol">&lt;</strong>
                      <input type="text" value={form.value} onChange={handleFieldChange('value')} />
                    </label>
                  </div>
                </div>

                <div className="portal-product-editor-side">
                  <div className="portal-product-photo-box">
                    <span>Adicionar foto:</span>
                    <button type="button" className="portal-product-photo-button" onClick={handleChooseImage}>
                      {form.imageUrl ? (
                        <img src={form.imageUrl} alt="Preview do produto" className="portal-product-photo-preview" />
                      ) : (
                        <ProductPhotoIcon />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="portal-product-photo-input"
                      onChange={handleImageChange}
                    />
                  </div>

                  <label className="portal-product-textarea-field">
                    <span>Descrição (opcional):</span>
                    <textarea value={form.description} onChange={handleFieldChange('description')} />
                  </label>
                </div>
              </div>
            </article>

            <div className="portal-product-editor-actions portal-product-editor-actions-split">
              {hasChanges ? (
                <button
                  type="submit"
                  className="portal-product-primary-button portal-product-confirm-button"
                  disabled={isSaving || isRemoving}
                >
                  {isSaving ? 'Salvando...' : 'Confirmar alterações'}
                </button>
              ) : (
                <span className="portal-product-actions-spacer" aria-hidden="true"></span>
              )}

              <button
                type="button"
                className="portal-product-remove-button"
                onClick={() => setShowRemoveModal(true)}
                disabled={isRemoving || isSaving}
              >
                <span>Remover produto</span>
                <span className="portal-product-remove-icon">
                  <RemoveIcon />
                </span>
              </button>
            </div>
          </form>
        ) : null}

        {showRemoveModal ? (
          <div className="portal-product-remove-backdrop" role="presentation">
            <div className="portal-product-remove-modal" role="dialog" aria-modal="true" aria-label="Remover produto">
              <button
                type="button"
                className="portal-product-remove-close"
                aria-label="Fechar modal de remoção"
                onClick={() => setShowRemoveModal(false)}
              >
                <CloseIcon />
              </button>

              <p>Tem certeza de que deseja remover este produto?</p>

              <button
                type="button"
                className="portal-product-remove-confirm"
                onClick={handleRemove}
                disabled={isRemoving}
              >
                {isRemoving ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </PartnerPortalLayout>
  )
}
