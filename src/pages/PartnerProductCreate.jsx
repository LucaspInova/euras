import { useEffect, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import SidebarLayout from '../components/SidebarLayout'
import { createPartnerProduct, getPartnerApiErrorMessage, getPartnerById } from '../lib/partnersApi'

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

export default function PartnerProductCreate() {
  const navigate = useNavigate()
  const { partnerId } = useParams()
  const [partner, setPartner] = useState(null)
  const [loading, setLoading] = useState(true)
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    priceEuras: '',
    imageUrl: '',
  })

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setFormError('')

      try {
        const partnerData = await getPartnerById(partnerId)
        if (!active) return
        setPartner(partnerData)
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
  }, [partnerId])

  if (!loading && !formError && !partner) {
    return <Navigate to="/parceiros" replace />
  }

  const handleFieldChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
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
      await createPartnerProduct(partnerId, {
        title: form.title.trim(),
        description: form.description.trim(),
        priceEuras: form.priceEuras.trim(),
        imageUrl: form.imageUrl.trim(),
      })

      navigate(`/parceiros/${partnerId}/produtos`, { replace: true })
    } catch (error) {
      console.info('Falha ao criar produto.', error)
      setFormError(getPartnerApiErrorMessage(error))
      setIsSaving(false)
    }
  }

  return (
    <SidebarLayout>
      <section className="partner-create-page">
        <div className="student-create-header">
          <h1 className="partners-heading">Adicionar produto</h1>

          <button
            type="button"
            className="student-back-button"
            aria-label="Voltar para produtos do parceiro"
            onClick={() => navigate(`/parceiros/${partnerId}/produtos`)}
          >
            <BackIcon />
          </button>
        </div>

        {loading ? <p className="form-message">Carregando parceiro...</p> : null}
        {formError ? <p className="form-message form-message-error">{formError}</p> : null}

        {!loading && partner ? (
          <form className="student-create-form" onSubmit={handleSubmit}>
            <section className="partner-create-card">
              <div className="partner-create-grid">
                <div className="partner-create-column">
                  <label className="partner-field">
                    <span>Parceiro:</span>
                    <input type="text" value={partner.name} disabled />
                  </label>

                  <label className="partner-field">
                    <span>Título do produto:</span>
                    <input type="text" value={form.title} onChange={handleFieldChange('title')} />
                  </label>

                  <label className="partner-field">
                    <span>Descrição:</span>
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
                    <span>URL da imagem (opcional):</span>
                    <input type="text" value={form.imageUrl} onChange={handleFieldChange('imageUrl')} />
                  </label>
                </div>
              </div>
            </section>

            <div className="partner-create-submit-row">
              <button type="submit" className="student-submit-button" disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Adicionar produto'}
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </SidebarLayout>
  )
}
