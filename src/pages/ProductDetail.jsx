import { useEffect, useMemo, useRef, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import SidebarLayout from '../components/SidebarLayout'
import {
  getPartnerApiErrorMessage,
  getProductById,
  removeProduct,
  updateProduct,
} from '../lib/partnersApi'

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

function mapProductToForm(product) {
  return {
    name: product.name ?? '',
    institution: product.institution ?? '',
    value: formatPrice(product.priceEuras),
    description: product.description ?? '',
    imageUrl: product.imageUrl ?? '',
  }
}

export default function ProductDetail() {
  const navigate = useNavigate()
  const { productId } = useParams()
  const fileInputRef = useRef(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [form, setForm] = useState(null)
  const [initialForm, setInitialForm] = useState(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setLoadError('')

      try {
        const product = await getProductById(productId)
        if (!active) return

        if (!product) {
          setForm(null)
          setInitialForm(null)
          return
        }

        const mapped = mapProductToForm(product)
        setForm(mapped)
        setInitialForm(mapped)
      } catch (error) {
        if (!active) return
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
  }, [productId])

  if (!loading && !loadError && !form) {
    return <Navigate to="/produtos" replace />
  }

  const handleFieldChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleChooseImage = () => {
    fileInputRef.current?.click()
  }

  const handleImageChange = (event) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setFormError('Selecione um arquivo de imagem valido.')
      event.target.value = ''
      return
    }

    const reader = new FileReader()

    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      setForm((current) => ({ ...current, imageUrl: result }))
      setFormError('')
    }

    reader.onerror = () => {
      setFormError('Nao foi possivel carregar essa imagem.')
    }

    reader.readAsDataURL(file)
    event.target.value = ''
  }

  const hasChanges = useMemo(() => {
    if (!form || !initialForm) {
      return false
    }

    return (
      form.name.trim() !== initialForm.name.trim() ||
      form.institution.trim() !== initialForm.institution.trim() ||
      form.value.trim() !== initialForm.value.trim() ||
      form.description.trim() !== initialForm.description.trim() ||
      form.imageUrl !== initialForm.imageUrl
    )
  }, [form, initialForm])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form || !hasChanges) return

    setFormError('')

    if (!form.name.trim()) {
      setFormError('Informe o nome do produto.')
      return
    }

    if (!form.institution.trim()) {
      setFormError('Informe a instituicao do produto.')
      return
    }

    if (!form.value.trim()) {
      setFormError('Informe o valor do produto.')
      return
    }

    setIsSaving(true)

    try {
      await updateProduct(productId, {
        name: form.name.trim(),
        institution: form.institution.trim(),
        description: form.description.trim(),
        priceEuras: form.value.trim(),
        imageUrl: form.imageUrl,
      })

      const refreshed = await getProductById(productId)
      if (!refreshed) {
        navigate('/produtos', { replace: true, state: { resetFilters: true } })
        return
      }

      const mapped = mapProductToForm(refreshed)
      setForm(mapped)
      setInitialForm(mapped)
    } catch (error) {
      setFormError(getPartnerApiErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemove = async () => {
    setFormError('')
    setIsRemoving(true)

    try {
      await removeProduct(productId)
      navigate('/produtos', { replace: true, state: { resetFilters: true } })
    } catch (error) {
      setFormError(getPartnerApiErrorMessage(error))
      setIsRemoving(false)
      setShowRemoveModal(false)
    }
  }

  return (
    <SidebarLayout>
      <section className="product-create-page product-control-page">
        <div className="student-create-header">
          <h1 className="partners-heading">Controle produto</h1>

          <button
            type="button"
            className="student-back-button product-create-back"
            aria-label="Voltar para produtos"
            onClick={() => navigate('/produtos')}
          >
            <BackIcon />
          </button>
        </div>

        {loading ? <p className="form-message">Carregando produto...</p> : null}
        {loadError ? <p className="form-message form-message-error">{loadError}</p> : null}
        {formError ? <p className="form-message form-message-error">{formError}</p> : null}

        {!loading && !loadError && form ? (
          <form className="product-create-form" onSubmit={handleSubmit}>
            <section className="product-create-card">
              <div className="product-create-grid">
                <div className="product-create-column">
                  <label className="product-create-field">
                    <span>Produto:</span>
                    <input type="text" value={form.name} onChange={handleFieldChange('name')} />
                  </label>

                  <label className="product-create-field">
                    <span>Instituicao:</span>
                    <input type="text" value={form.institution} onChange={handleFieldChange('institution')} />
                  </label>

                  <div className="product-create-value-block">
                    <span>Valor:</span>
                    <label className="product-create-value-row">
                      <strong className="product-create-symbol">&lt;</strong>
                      <input type="text" value={form.value} onChange={handleFieldChange('value')} />
                    </label>
                  </div>
                </div>

                <div className="product-create-column product-create-column-side">
                  <div className="product-photo-box">
                    <span>Adicionar foto:</span>
                    <button type="button" className="product-photo-button" onClick={handleChooseImage}>
                      {form.imageUrl ? (
                        <img src={form.imageUrl} alt="Preview do produto" className="product-photo-preview" />
                      ) : (
                        <ProductPhotoIcon />
                      )}
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="product-photo-input"
                      onChange={handleImageChange}
                    />
                  </div>

                  <label className="product-create-textarea-field">
                    <span>Descricao (opcional):</span>
                    <textarea value={form.description} onChange={handleFieldChange('description')} />
                  </label>
                </div>
              </div>
            </section>

            <div className="product-control-actions">
              {hasChanges ? (
                <button
                  type="submit"
                  className="product-create-submit-button product-control-confirm-button"
                  disabled={isSaving || isRemoving}
                >
                  {isSaving ? 'Salvando...' : 'Confirmar alteracoes'}
                </button>
              ) : (
                <span className="product-control-actions-spacer" aria-hidden="true"></span>
              )}

              <button
                type="button"
                className="product-control-remove-button"
                onClick={() => setShowRemoveModal(true)}
                disabled={isRemoving || isSaving}
              >
                <span>Remover produto</span>
                <span className="product-control-remove-icon">
                  <RemoveIcon />
                </span>
              </button>
            </div>
          </form>
        ) : null}

        {showRemoveModal ? (
          <div className="product-remove-modal-backdrop" role="presentation">
            <div className="product-remove-modal" role="dialog" aria-modal="true" aria-label="Remover produto">
              <button
                type="button"
                className="product-remove-modal-close"
                aria-label="Fechar modal de remocao"
                onClick={() => setShowRemoveModal(false)}
              >
                <CloseIcon />
              </button>

              <p>Tem certeza de que deseja remover este produto?</p>

              <button
                type="button"
                className="product-remove-modal-confirm"
                onClick={handleRemove}
                disabled={isRemoving}
              >
                {isRemoving ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </SidebarLayout>
  )
}
