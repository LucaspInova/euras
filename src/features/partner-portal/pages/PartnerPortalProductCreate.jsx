import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { buildOptimizedImageDataUrl } from '../../../lib/imageUpload'
import { supabase } from '../../../lib/supabase'
import PartnerPortalLayout from '../components/PartnerPortalLayout'
import {
  criarProduto,
  fetchParceiro,
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

function resolveInstitutionName(profile) {
  return profile?.nome_completo?.trim() || 'Parceiro'
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

export default function PartnerPortalProductCreate() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const { profile } = useAuth()
  const [formError, setFormError] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [loadingPartner, setLoadingPartner] = useState(true)
  const [partnerProfileId, setPartnerProfileId] = useState(null)
  const [partnerRowId, setPartnerRowId] = useState(null)
  const [institutionName, setInstitutionName] = useState(resolveInstitutionName(profile))
  const [form, setForm] = useState({
    name: '',
    value: '',
    description: '',
    imageUrl: '',
  })

  useEffect(() => {
    let active = true

    async function loadParceiro() {
      setLoadingPartner(true)
      setFormError('')

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser()
        if (authError) throw authError

        const authUser = authData?.user ?? null
        if (!authUser?.id) {
          throw new Error('Sessao expirada. Faca login novamente.')
        }

        const { data, error } = await fetchParceiro(supabase)
        if (error) throw error

        if (!active) return

        const resolvedProfileId = data?.perfil_parceiro_id ?? null
        const resolvedPartnerRowId = data?.id ?? null
        if (!data || (!resolvedProfileId && !resolvedPartnerRowId)) {
          setPartnerProfileId(null)
          setPartnerRowId(null)
          setFormError('Seu usuario nao esta vinculado a nenhum parceiro. Contate o administrador.')
          return
        }

        setPartnerProfileId(resolvedProfileId)
        setPartnerRowId(resolvedPartnerRowId)
        setInstitutionName(data?.nome_instituicao?.trim() || resolveInstitutionName(profile))
      } catch (error) {
        if (!active) return
        setPartnerProfileId(null)
        setPartnerRowId(null)
        setFormError(getParceiroDataErrorMessage(error))
      } finally {
        if (active) {
          setLoadingPartner(false)
        }
      }
    }

    loadParceiro()

    return () => {
      active = false
    }
  }, [profile])

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

    if (!form.value.trim()) {
      setFormError('Informe o valor do produto.')
      return
    }

    const parsedPrice = parseEurasValue(form.value.trim())
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setFormError('Informe um valor valido para o produto.')
      return
    }

    if (!partnerProfileId && !partnerRowId) {
      setFormError('Seu usuario nao esta vinculado a nenhum parceiro. Contate o administrador.')
      return
    }

    setIsSaving(true)

    try {
      const { error } = await criarProduto(supabase, {
        perfil_parceiro_id: partnerProfileId,
        parceiro_id: partnerRowId,
        titulo: form.name.trim(),
        descricao: form.description.trim(),
        preco_euras: parsedPrice,
        url_imagem: form.imageUrl,
        ativo: true,
      })

      if (error) throw error
      navigate('/portal-parceiro/produtos', { replace: true })
    } catch (error) {
      setFormError(getParceiroDataErrorMessage(error))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <PartnerPortalLayout>
      <section className="portal-product-editor-page">
        <div className="portal-product-editor-header">
          <h1>Adicionar produto</h1>

          <button
            type="button"
            className="portal-product-back-button"
            aria-label="Voltar para produtos"
            onClick={() => navigate('/portal-parceiro/produtos')}
          >
            <BackIcon />
          </button>
        </div>

        {formError ? <p className="form-message form-message-error">{formError}</p> : null}

        <form className="portal-product-editor-form" onSubmit={handleSubmit}>
          <article className="portal-product-editor-card">
            <div className="portal-product-editor-grid">
              <div className="portal-product-editor-main">
                <label className="portal-product-field">
                  <span>Produto:</span>
                  <input type="text" value={form.name} onChange={handleFieldChange('name')} />
                </label>

                <label className="portal-product-field">
                  <span>Instituicao:</span>
                  <input type="text" value={institutionName} disabled />
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
                  <span>Descricao (opcional):</span>
                  <textarea value={form.description} onChange={handleFieldChange('description')} />
                </label>
              </div>
            </div>
          </article>

          <div className="portal-product-editor-actions portal-product-editor-actions-center">
            <button
              type="submit"
              className="portal-product-primary-button"
              disabled={isSaving || loadingPartner || (!partnerProfileId && !partnerRowId)}
            >
              {isSaving ? 'Salvando...' : 'Adicionar produto'}
            </button>
          </div>
        </form>
      </section>
    </PartnerPortalLayout>
  )
}
