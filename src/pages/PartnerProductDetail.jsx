import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import SidebarLayout from '../components/SidebarLayout'
import {
  getPartnerApiErrorMessage,
  getPartnerProductById,
  removePartnerProduct,
  updatePartnerProduct,
} from '../lib/partnersApi'

function BackIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20 12H6.5M11.5 6 5 12l6.5 6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function RemoveIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="M8 8l8 8M16 8l-8 8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

export default function PartnerProductDetail() {
  const navigate = useNavigate()
  const { partnerId, productId } = useParams()
  const [loading, setLoading] = useState(true)
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [form, setForm] = useState(null)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setFormError('')

      try {
        const data = await getPartnerProductById(partnerId, productId)
        if (!active) return

        setForm({
          title: data.title ?? '',
          description: data.description ?? '',
          priceEuras: String(data.priceEuras ?? ''),
          imageUrl: data.imageUrl ?? '',
          partnerName: data.partnerName ?? '',
        })
      } catch (error) {
        if (!active) return
        setFormError(getPartnerApiErrorMessage(error))
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
  }, [partnerId, productId])

  if (!loading && !formError && !form) {
    return <Navigate to={`/parceiros/${partnerId}/produtos`} replace />
  }

  const handleFieldChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleSave = async (event) => {
    event.preventDefault()
    if (!form) return

    setFormError('')

    if (!form.title.trim()) {
      setFormError('Informe o titulo do produto.')
      return
    }

    if (!form.priceEuras.trim()) {
      setFormError('Informe o valor em Euras.')
      return
    }

    setIsSaving(true)

    try {
      await updatePartnerProduct(partnerId, productId, {
        title: form.title.trim(),
        description: form.description.trim(),
        priceEuras: form.priceEuras.trim(),
        imageUrl: form.imageUrl.trim(),
      })

      navigate(`/parceiros/${partnerId}/produtos`, { replace: true })
    } catch (error) {
      setFormError(getPartnerApiErrorMessage(error))
      setIsSaving(false)
    }
  }

  const handleRemove = async () => {
    setIsSaving(true)
    setFormError('')

    try {
      await removePartnerProduct(partnerId, productId)
      navigate(`/parceiros/${partnerId}/produtos`, { replace: true })
    } catch (error) {
      setFormError(getPartnerApiErrorMessage(error))
      setIsSaving(false)
    }
  }

  return (
    <SidebarLayout>
      <section className="partner-create-page">
        <div className="student-create-header">
          <h1 className="partners-heading">Controle produto</h1>

          <button
            type="button"
            className="student-back-button"
            aria-label="Voltar para produtos"
            onClick={() => navigate(`/parceiros/${partnerId}/produtos`)}
          >
            <BackIcon />
          </button>
        </div>

        {loading ? <p className="form-message">Carregando produto...</p> : null}
        {formError ? <p className="form-message form-message-error">{formError}</p> : null}

        {!loading && form ? (
          <form className="student-create-form" onSubmit={handleSave}>
            <section className="partner-create-card">
              <div className="partner-create-grid">
                <div className="partner-create-column">
                  <label className="partner-field">
                    <span>Parceiro:</span>
                    <input type="text" value={form.partnerName} disabled />
                  </label>

                  <label className="partner-field">
                    <span>Titulo:</span>
                    <input type="text" value={form.title} onChange={handleFieldChange('title')} />
                  </label>

                  <label className="partner-field">
                    <span>Descricao:</span>
                    <input type="text" value={form.description} onChange={handleFieldChange('description')} />
                  </label>
                </div>

                <div className="partner-create-column">
                  <label className="partner-field">
                    <span>Preco em Euras:</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={form.priceEuras}
                      onChange={handleFieldChange('priceEuras')}
                    />
                  </label>

                  <label className="partner-field">
                    <span>URL da imagem:</span>
                    <input type="text" value={form.imageUrl} onChange={handleFieldChange('imageUrl')} />
                  </label>
                </div>
              </div>
            </section>

            <div className="partner-create-submit-row partner-detail-actions-row">
              <button type="submit" className="student-submit-button" disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar produto'}
              </button>

              <button type="button" className="student-remove-button" disabled={isSaving} onClick={() => setShowDeleteModal(true)}>
                <span>Remover produto</span>
                <span className="student-remove-icon">
                  <RemoveIcon />
                </span>
              </button>
            </div>
          </form>
        ) : null}

        {showDeleteModal ? (
          <div className="student-modal-backdrop" role="presentation">
            <div className="student-remove-modal" role="dialog" aria-modal="true" aria-label="Remover produto">
              <p>Tem certeza de que deseja remover este produto?</p>
              <button type="button" className="student-modal-confirm" onClick={handleRemove}>
                Remover
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </SidebarLayout>
  )
}
