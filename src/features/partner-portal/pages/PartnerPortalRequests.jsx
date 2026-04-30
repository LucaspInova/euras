import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { runWithRetries, withRequestTimeout } from '../../../lib/requestGuards'
import { supabase } from '../../../lib/supabase'
import PartnerPortalLayout from '../components/PartnerPortalLayout'
import {
  fetchResgatesPendentes,
  getParceiroDataErrorMessage,
} from '../hooks/useParceiroData'

function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
}

function formatEuras(value) {
  const numeric = Number(value)
  return (Number.isFinite(numeric) ? numeric : 0).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function toSafeDate(value) {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

function formatDateLabel(value) {
  const safeDate = toSafeDate(value)
  const weekday = new Intl.DateTimeFormat('pt-BR', { weekday: 'short' })
    .format(safeDate)
    .replace('.', '')
    .toUpperCase()
  const dateLabel = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(safeDate)

  return `${weekday} - ${dateLabel}`
}

function formatTimeLabel(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(toSafeDate(value))
}

function mapResgatePendente(row) {
  return {
    id: row.id,
    studentName: row.aluno?.nome_completo ?? 'Aluno',
    productTitle: row.produto?.titulo ?? 'Produto',
    amountEuras: Number(row.valor_euras ?? 0),
    dateLabel: formatDateLabel(row.criado_em),
    requestedAtLabel: formatTimeLabel(row.criado_em),
  }
}

export default function PartnerPortalRequests() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [requests, setRequests] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadNonce, setReloadNonce] = useState(0)

  const partnerProfileId = profile?.id ?? null

  useEffect(() => {
    let active = true

    async function loadRequests() {
      setLoading(true)
      setLoadError('')

      try {
        const response = await runWithRetries(
          () =>
            withRequestTimeout(fetchResgatesPendentes(supabase), {
              message: 'Tempo limite ao carregar as solicitações de resgate. Tente novamente.',
            }),
          { attempts: 2 },
        )

        if (!active) return
        if (response.error) throw response.error

        setRequests((response.data ?? []).map(mapResgatePendente))
      } catch (error) {
        if (!active) return
        setLoadError(getParceiroDataErrorMessage(error))
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadRequests()

    return () => {
      active = false
    }
  }, [partnerProfileId, reloadNonce])

  const filteredRequests = useMemo(() => {
    const search = normalize(searchTerm.trim())
    if (!search) return requests

    return requests.filter((request) => {
      const student = normalize(request.studentName)
      const product = normalize(request.productTitle)
      return student.includes(search) || product.includes(search)
    })
  }, [requests, searchTerm])

  return (
    <PartnerPortalLayout title="Solicitações de resgates">
      <section className="partner-home-page">
        <article className="partner-home-card">
          <div className="portal-requests-header">
            <label className="portal-product-search" aria-label="Pesquisar solicitação de resgate">
              <input
                type="text"
                placeholder="Pesquisar solicitação..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </label>

            <button
              type="button"
              className="partner-home-see-all-button"
              onClick={() => navigate('/portal-parceiro')}
            >
              Voltar para tela inicial
            </button>
          </div>

          {loading ? <p className="form-message">Carregando solicitações...</p> : null}
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

          {!loading && !loadError && filteredRequests.length === 0 ? (
            <p className="form-message">Nenhuma solicitação pendente encontrada.</p>
          ) : null}

          {!loading && !loadError
            ? filteredRequests.map((request) => (
                <div key={request.id} className="partner-home-request-row">
                  <div className="partner-home-request-main">
                    <p className="partner-home-date">{request.dateLabel}</p>
                    <h3>{request.studentName}</h3>
                    <p className="partner-home-request-desc">
                      Solicitou o produto ({request.productTitle}) às {request.requestedAtLabel}
                    </p>
                  </div>

                  <div className="partner-home-request-actions">
                    <p className="partner-home-amount">&lt; {formatEuras(request.amountEuras)}</p>
                  </div>
                </div>
              ))
            : null}
        </article>
      </section>
    </PartnerPortalLayout>
  )
}
