import { useEffect, useMemo, useRef, useState } from 'react'
import { useModalDismiss } from '../hooks/useModalDismiss'
import { buildOptimizedImageDataUrl } from '../lib/imageUpload'
import {
  getPartnerApiErrorMessage,
  getProductById,
  removeProduct,
  updateProduct,
} from '../lib/partnersApi'

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

export default function ProductEditModal({ productId, onClose, onSaved, onRemoved }) {
  const fileInputRef = useRef(null)
  const isOpen = Boolean(productId)
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)
  const [form, setForm] = useState(null)
  const [initialForm, setInitialForm] = useState(null)
  const isBusy = isSaving || isRemoving

  const closeModal = () => {
    if (isBusy) return
    onClose()
  }

  useModalDismiss(isOpen, closeModal, isBusy)

  useEffect(() => {
    if (!productId) {
      setForm(null)
      setInitialForm(null)
      setLoadError('')
      setFormError('')
      return undefined
    }

    let active = true

    async function loadProduct() {
      setLoading(true)
      setLoadError('')
      setFormError('')

      try {
        const product = await getProductById(productId)
        if (!active) return

        if (!product) {
          setForm(null)
          setInitialForm(null)
          setLoadError('Produto nao encontrado.')
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

    loadProduct()

    return () => {
      active = false
    }
  }, [productId])

  const hasChanges = useMemo(() => {
    if (!form || !initialForm) return false

    return (
      form.name.trim() !== initialForm.name.trim() ||
      form.institution.trim() !== initialForm.institution.trim() ||
      form.value.trim() !== initialForm.value.trim() ||
      form.description.trim() !== initialForm.description.trim() ||
      form.imageUrl !== initialForm.imageUrl
    )
  }, [form, initialForm])

  if (!isOpen) {
    return null
  }

  const handleFieldChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleChooseImage = () => {
    fileInputRef.current?.click()
  }

  const handleImageChange = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) return

    if (!file.type.startsWith('image/')) {
      setFormError('Selecione um arquivo de imagem valido.')
      return
    }

    try {
      const optimizedImageDataUrl = await buildOptimizedImageDataUrl(file)
      setForm((current) => ({ ...current, imageUrl: optimizedImageDataUrl }))
      setFormError('')
    } catch (error) {
      setFormError(error?.message ?? 'Nao foi possivel carregar essa imagem.')
    }
  }

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

      onSaved?.()
      onClose()
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
      onRemoved?.()
      onClose()
    } catch (error) {
      setFormError(getPartnerApiErrorMessage(error))
    } finally {
      setIsRemoving(false)
    }
  }

  return (
    <div
      className="partner-modal-backdrop product-edit-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeModal()
      }}
    >
      <div
        className="partner-modal product-edit-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Editar produto"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button type="button" className="partner-modal-close" aria-label="Fechar" onClick={closeModal}>
          <CloseIcon />
        </button>

        <div className="partner-modal-header">
          <p className="partner-modal-label">Editar produto</p>
          <h2 className="partner-modal-title">Atualize as informacoes</h2>
        </div>

        {loading ? <p className="form-message">Carregando produto...</p> : null}
        {loadError ? <p className="form-message form-message-error">{loadError}</p> : null}
        {formError ? <p className="form-message form-message-error">{formError}</p> : null}

        {!loading && !loadError && form ? (
          <form className="product-create-form product-edit-modal-form" onSubmit={handleSubmit}>
            <section className="product-create-card product-edit-modal-card">
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
                      <span className="product-create-symbol" aria-hidden="true" />
                      <input type="text" value={form.value} onChange={handleFieldChange('value')} />
                    </label>
                  </div>
                </div>

                <div className="product-create-column product-create-column-side">
                  <div className="product-photo-box">
                    <span>Foto:</span>
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

            <div className="partner-modal-actions partner-modal-actions-split product-edit-modal-actions">
              <button
                type="button"
                className="student-remove-button partner-product-modal-remove"
                onClick={handleRemove}
                disabled={isSaving || isRemoving}
              >
                <span>{isRemoving ? 'Removendo...' : 'Remover produto'}</span>
                <span className="student-remove-icon">
                  <RemoveIcon />
                </span>
              </button>

              <button
                type="submit"
                className="student-submit-button"
                disabled={!hasChanges || isSaving || isRemoving}
              >
                {isSaving ? 'Salvando...' : 'Salvar produto'}
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  )
}
