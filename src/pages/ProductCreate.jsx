import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SidebarLayout from '../components/SidebarLayout'
import { buildOptimizedImageDataUrl } from '../lib/imageUpload'
import { createProduct, getPartnerApiErrorMessage, listPartners } from '../lib/partnersApi'

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

function mapPartnerOption(partner) {
  const profileId = partner?.profileId ?? partner?.id ?? null
  if (!profileId) {
    return null
  }

  return {
    value: String(profileId),
    label: partner?.name?.trim() || 'Parceiro',
  }
}

export default function ProductCreate() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [loadingPartners, setLoadingPartners] = useState(true)
  const [partnerOptions, setPartnerOptions] = useState([])
  const [form, setForm] = useState({
    name: '',
    partnerProfileId: '',
    value: '',
    description: '',
    imageUrl: '',
  })

  useEffect(() => {
    let active = true

    async function loadPartners() {
      setLoadingPartners(true)
      setFormError('')

      try {
        const partners = await listPartners()
        if (!active) return

        const options = (partners ?? []).map(mapPartnerOption).filter(Boolean)
        setPartnerOptions(options)

        setForm((current) => {
          if (current.partnerProfileId || options.length === 0) {
            return current
          }

          return { ...current, partnerProfileId: options[0].value }
        })

        if (options.length === 0) {
          setFormError('Nenhum parceiro ativo foi encontrado. Cadastre um parceiro antes de criar produtos.')
        }
      } catch (error) {
        if (!active) return
        setFormError(getPartnerApiErrorMessage(error))
      } finally {
        if (active) {
          setLoadingPartners(false)
        }
      }
    }

    loadPartners()

    return () => {
      active = false
    }
  }, [])

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
    setFormError('')

    if (!form.name.trim()) {
      setFormError('Informe o nome do produto.')
      return
    }

    if (!form.partnerProfileId) {
      setFormError('Selecione a instituicao do produto.')
      return
    }

    if (!form.value.trim()) {
      setFormError('Informe o valor do produto.')
      return
    }

    setIsSaving(true)

    try {
      const selectedPartner = partnerOptions.find(
        (option) => option.value === form.partnerProfileId,
      )

      await createProduct({
        name: form.name.trim(),
        partnerProfileId: form.partnerProfileId,
        institution: selectedPartner?.label ?? '',
        description: form.description.trim(),
        priceEuras: form.value.trim(),
        imageUrl: form.imageUrl,
      })

      navigate('/produtos', { replace: true, state: { resetFilters: true } })
    } catch (error) {
      setFormError(getPartnerApiErrorMessage(error))
      setIsSaving(false)
    }
  }

  return (
    <SidebarLayout>
      <section className="product-create-page">
        <div className="student-create-header">
          <h1 className="partners-heading">Adicionar produto</h1>

          <button
            type="button"
            className="student-back-button product-create-back"
            aria-label="Voltar para produtos"
            onClick={() => navigate('/produtos')}
          >
            <BackIcon />
          </button>
        </div>

        {formError ? <p className="form-message form-message-error">{formError}</p> : null}

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
                  <select
                    value={form.partnerProfileId}
                    onChange={handleFieldChange('partnerProfileId')}
                    disabled={loadingPartners || partnerOptions.length === 0}
                  >
                    {partnerOptions.length === 0 ? (
                      <option value="">
                        {loadingPartners ? 'Carregando parceiros...' : 'Nenhum parceiro disponivel'}
                      </option>
                    ) : null}

                    {partnerOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
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

          <div className="product-create-submit-row">
            <button
              type="submit"
              className="product-create-submit-button"
              disabled={isSaving || loadingPartners || partnerOptions.length === 0}
            >
              {isSaving ? 'Salvando...' : 'Adicionar produto'}
            </button>
          </div>
        </form>
      </section>
    </SidebarLayout>
  )
}
