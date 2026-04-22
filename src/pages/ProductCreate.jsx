import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import SidebarLayout from '../components/SidebarLayout'
import { createProduct, getPartnerApiErrorMessage } from '../lib/partnersApi'

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

export default function ProductCreate() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [form, setForm] = useState({
    name: 'Bolsa 50%-',
    institution: 'Ceeds Maracanau',
    value: '80,00',
    description: 'Bolsa 50% para as mensalidades a partir do 2o semestre',
    imageUrl: '',
  })

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

  const handleSubmit = async (event) => {
    event.preventDefault()
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
      await createProduct({
        name: form.name.trim(),
        institution: form.institution.trim(),
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

          <div className="product-create-submit-row">
            <button type="submit" className="product-create-submit-button" disabled={isSaving}>
              {isSaving ? 'Salvando...' : 'Adicionar produto'}
            </button>
          </div>
        </form>
      </section>
    </SidebarLayout>
  )
}
