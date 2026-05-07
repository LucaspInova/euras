import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { runWithRetries, withRequestTimeout } from '../../../lib/requestGuards'
import { supabase } from '../../../lib/supabase'
import PartnerPortalLayout from '../components/PartnerPortalLayout'
import {
  atualizarStatusResgate,
  fetchResgatesPendentes,
  getParceiroDataErrorMessage,
} from '../hooks/useParceiroData'

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M6 6l12 12M18 6 6 18"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

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
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const partnerProfileId = profile?.id ?? null

  useEffect(() => {
    let active = true

    async function loadRequests() {
      setLoading(true)
      setLoadError('')

      try {
        const response = await runWithRetries(
          () =>
            withRequestTimeout(fetchResgatesPendentes(supabase, partnerProfileId), {
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

  const removeRequestFromList = (requestId) => {
    setRequests((current) => current.filter((request) => request.id !== requestId))
  }

  const handleApprove = async (request) => {
    if (!request) return

    if (!partnerProfileId) {
      setActionError('Sessão expirada. Faça login novamente.')
      return
    }

    setActionLoading(true)
    setActionError('')

    try {
      const { error } = await atualizarStatusResgate(
        supabase,
        request.id,
        'confirmado',
        partnerProfileId,
      )

      if (error) throw error
      removeRequestFromList(request.id)
    } catch (error) {
      setActionError(getParceiroDataErrorMessage(error))
    } finally {
      setActionLoading(false)
    }
  }

  const openRejectModal = (request) => {
    setSelectedRequest(request)
    setRejectReason('')
    setActionError('')
  }

  const closeRejectModal = () => {
    if (actionLoading) return
    setSelectedRequest(null)
    setRejectReason('')
    setActionError('')
  }

  const handleReject = async () => {
    if (!selectedRequest) return

    if (!partnerProfileId) {
      setActionError('Sessão expirada. Faça login novamente.')
      return
    }

    if (!rejectReason.trim()) {
      setActionError('Informe o motivo para recusar a solicitação.')
      return
    }

    setActionLoading(true)
    setActionError('')

    try {
      const { error } = await atualizarStatusResgate(
        supabase,
        selectedRequest.id,
        'cancelado',
        partnerProfileId,
        rejectReason.trim(),
      )

      if (error) throw error
      removeRequestFromList(selectedRequest.id)
      closeRejectModal()
    } catch (error) {
      setActionError(getParceiroDataErrorMessage(error))
    } finally {
      setActionLoading(false)
    }
  }

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
                    <button
                      type="button"
                      className="partner-home-analyze-button"
                      onClick={() => handleApprove(request)}
                      disabled={actionLoading}
                    >
                      Confirmar
                    </button>
                    <button
                      type="button"
                      className="partner-home-reject-link"
                      onClick={() => openRejectModal(request)}
                      disabled={actionLoading}
                    >
                      Recusar
                    </button>
                  </div>
                </div>
              ))
            : null}

          {actionError && !selectedRequest ? (
            <p className="form-message form-message-error">{actionError}</p>
          ) : null}
        </article>
      </section>

      {selectedRequest ? (
        <div className="partner-home-modal-backdrop" role="presentation">
          <div
            className="partner-home-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Motivo da recusa"
          >
            <button
              type="button"
              className="partner-home-modal-close"
              aria-label="Fechar motivo da recusa"
              onClick={closeRejectModal}
            >
              <CloseIcon />
            </button>

            <h3 className="partner-home-reject-title">
              Por qual motivo deseja recusar esse resgate?
            </h3>
            <textarea
              className="partner-home-reject-textarea"
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder="Descreva o motivo da recusa."
            />

            <button
              type="button"
              className="partner-home-reject-button"
              onClick={handleReject}
              disabled={actionLoading}
            >
              {actionLoading ? 'Recusando...' : 'Confirmar recusa'}
            </button>

            {actionError ? (
              <p className="form-message form-message-error">{actionError}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </PartnerPortalLayout>
  )
}
