import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../context/AuthContext'
import { runWithRetries, withRequestTimeout } from '../../../lib/requestGuards'
import { supabase } from '../../../lib/supabase'
import PartnerPortalLayout from '../components/PartnerPortalLayout'
import {
  atualizarStatusResgate,
  fetchAtividadesConcedidas,
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

function SuccessIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="48" fill="#40c572" />
      <path
        d="M37 62.5 53 78.5 84 47.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="9"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  )
}

function RejectedIcon() {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="48" fill="#f01b27" />
      <path
        d="M43 43 77 77M77 43 43 77"
        fill="none"
        stroke="#ffffff"
        strokeWidth="9"
        strokeLinecap="square"
        strokeLinejoin="miter"
      />
    </svg>
  )
}

function formatEuras(value) {
  return ensureNumber(value).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function ensureNumber(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
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

function formatCompactTimeLabel(value) {
  return formatTimeLabel(value).replace(':', 'h')
}

function mapResgatePendente(row) {
  return {
    id: row.id,
    studentName: row.aluno?.nome_completo ?? 'Aluno',
    productTitle: row.produto?.titulo ?? 'Produto',
    amountEuras: ensureNumber(row.valor_euras),
    dateLabel: formatDateLabel(row.criado_em),
    requestedAtLabel: formatTimeLabel(row.criado_em),
    requestedAtCompact: formatCompactTimeLabel(row.criado_em),
  }
}

function mapAtividadeConcedida(row) {
  const safeDate = toSafeDate(row.concedido_em)

  return {
    id: row.id,
    studentName: row.aluno?.nome_completo ?? 'Aluno',
    productTitle: row.titulo_snapshot ?? 'Atividade',
    productSummary: row.titulo_snapshot ?? 'Atividade',
    amountEuras: ensureNumber(row.valor_euras),
    dateLabel: formatDateLabel(safeDate),
    occurredAtLabel: formatCompactTimeLabel(safeDate),
    occurredDateISO: safeDate.toISOString().slice(0, 10),
    status: 'aprovado',
  }
}

export default function PartnerPortalHome() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [pendingRequests, setPendingRequests] = useState([])
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadNonce, setReloadNonce] = useState(0)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [modalStage, setModalStage] = useState('analysis')
  const [rejectReason, setRejectReason] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError, setActionError] = useState('')

  const partnerProfileId = profile?.id ?? null

  useEffect(() => {
    let active = true

    async function loadHomeData() {
      setLoading(true)
      setLoadError('')

      try {
        const [resgatesResponse, atividadesResponse] = await runWithRetries(
          () =>
            withRequestTimeout(
              Promise.all([
                fetchResgatesPendentes(supabase, 3),
                fetchAtividadesConcedidas(supabase, 5),
              ]),
              {
                message: 'Tempo limite ao carregar o portal parceiro. Tente novamente.',
              },
            ),
          { attempts: 2 },
        )

        if (!active) return

        if (resgatesResponse.error) throw resgatesResponse.error
        if (atividadesResponse.error) throw atividadesResponse.error

        setPendingRequests((resgatesResponse.data ?? []).map(mapResgatePendente))
        setActivities((atividadesResponse.data ?? []).map(mapAtividadeConcedida))
      } catch (error) {
        if (!active) return

        console.info('Falha ao carregar painel do parceiro.', error)
        setLoadError(getParceiroDataErrorMessage(error))
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadHomeData()

    return () => {
      active = false
    }
  }, [partnerProfileId, reloadNonce])

  const visiblePendingRequests = useMemo(() => pendingRequests.slice(0, 3), [pendingRequests])
  const visibleActivities = useMemo(() => activities.slice(0, 6), [activities])

  const closeModal = (force = false) => {
    if (actionLoading && !force) return

    setSelectedRequest(null)
    setModalStage('analysis')
    setRejectReason('')
    setActionError('')
  }

  const openAnalyzeModal = (request) => {
    setSelectedRequest(request)
    setModalStage('analysis')
    setRejectReason('')
    setActionError('')
  }

  const openRejectModal = () => {
    setModalStage('reject')
    setActionError('')
  }

  const removeRequestFromList = () => {
    if (!selectedRequest) return

    setPendingRequests((current) => current.filter((item) => item.id !== selectedRequest.id))
  }

  const handleApprove = async () => {
    if (!selectedRequest) return
    if (!partnerProfileId) {
      setActionError('Sessão expirada. Faça login novamente.')
      return
    }

    setActionLoading(true)
    setActionError('')

    try {
      const { error } = await atualizarStatusResgate(
        supabase,
        selectedRequest.id,
        'aprovado',
        partnerProfileId,
      )
      if (error) throw error

      removeRequestFromList()
      setModalStage('success')
    } catch (error) {
      setActionError(getParceiroDataErrorMessage(error))
    } finally {
      setActionLoading(false)
    }
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
        'recusado',
        partnerProfileId,
      )
      if (error) throw error

      removeRequestFromList()
      setModalStage('rejected')
    } catch (error) {
      setActionError(getParceiroDataErrorMessage(error))
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <PartnerPortalLayout title="Tela Inicial">
      <section className="partner-home-page">
        <article className="partner-home-card">
          <h2>Solicitações de resgates</h2>

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

          {!loading && !loadError && pendingRequests.length === 0 ? (
            <p className="form-message">Nenhuma solicitação pendente no momento.</p>
          ) : null}

          {!loading && !loadError
            ? visiblePendingRequests.map((request) => (
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
                      onClick={() => openAnalyzeModal(request)}
                    >
                      Analisar resgate
                    </button>
                  </div>
                </div>
              ))
            : null}

          {!loading && !loadError && pendingRequests.length >= 3 ? (
            <button
              type="button"
              className="partner-home-see-all-button"
              onClick={() => navigate('/portal-parceiro/solicitacoes')}
            >
              Ver todas as solicitações
            </button>
          ) : null}
        </article>

        <article className="partner-home-card">
          <h2>Atividades</h2>

          {!loading && !loadError && visibleActivities.length === 0 ? (
            <p className="form-message">Sem atividades recentes.</p>
          ) : null}

          {!loading && !loadError
            ? visibleActivities.map((activity) => (
                <div key={activity.id} className="partner-home-activity-row">
                  <div className="partner-home-activity-main">
                    <p className="partner-home-date">{activity.dateLabel}</p>
                    <h3>{activity.studentName}</h3>
                    <p>{activity.productSummary || activity.productTitle}</p>
                  </div>

                  <div className="partner-home-activity-values">
                    <p
                      className={
                        activity.status === 'recusado'
                          ? 'partner-home-activity-amount partner-home-activity-amount-negative'
                          : 'partner-home-activity-amount'
                      }
                    >
                      &lt; {formatEuras(activity.amountEuras)}
                    </p>
                    <span>{activity.occurredAtLabel}</span>
                  </div>
                </div>
              ))
            : null}

          <button
            type="button"
            className="partner-home-see-all-button"
            onClick={() => navigate('/portal-parceiro/atividades')}
          >
            Ver todas as atividades
          </button>
        </article>
      </section>

      {selectedRequest ? (
        <div className="partner-home-modal-backdrop" role="presentation">
          {modalStage === 'analysis' ? (
            <div className="partner-home-modal" role="dialog" aria-modal="true" aria-label="Analisar resgate">
              <button
                type="button"
                className="partner-home-modal-close"
                aria-label="Fechar análise de resgate"
                onClick={closeModal}
              >
                <CloseIcon />
              </button>

              <p>{selectedRequest.studentName} deseja resgatar:</p>
              <h3>{selectedRequest.productTitle}</h3>
              <span>por</span>
              <strong>&lt; {formatEuras(selectedRequest.amountEuras)}</strong>

              <button
                type="button"
                className="partner-home-approve-button"
                onClick={handleApprove}
                disabled={actionLoading}
              >
                {actionLoading ? 'Processando...' : 'Aprovar'}
              </button>

              <button type="button" className="partner-home-reject-link" onClick={openRejectModal}>
                Recusar solicitação de resgate
              </button>

              {actionError ? <p className="form-message form-message-error">{actionError}</p> : null}
            </div>
          ) : null}

          {modalStage === 'success' ? (
            <div className="partner-home-modal partner-home-modal-success" role="dialog" aria-modal="true" aria-label="Resgate concluído">
              <div className="partner-home-success-icon">
                <SuccessIcon />
              </div>
              <p>O resgate foi concluído!</p>

              <button type="button" className="partner-home-approve-button" onClick={closeModal}>
                Continuar
              </button>
            </div>
          ) : null}

          {modalStage === 'rejected' ? (
            <div className="partner-home-modal partner-home-modal-success" role="dialog" aria-modal="true" aria-label="Resgate recusado">
              <div className="partner-home-success-icon">
                <RejectedIcon />
              </div>
              <p>O resgate foi recusado!</p>

              <button type="button" className="partner-home-approve-button" onClick={closeModal}>
                Continuar
              </button>
            </div>
          ) : null}

          {modalStage === 'reject' ? (
            <div className="partner-home-modal" role="dialog" aria-modal="true" aria-label="Motivo da recusa">
              <button
                type="button"
                className="partner-home-modal-close"
                aria-label="Fechar motivo da recusa"
                onClick={closeModal}
              >
                <CloseIcon />
              </button>

              <h3 className="partner-home-reject-title">Por qual motivo deseja recusar esse resgate?</h3>
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
                {actionLoading ? 'Recusando...' : 'Recusar'}
              </button>

              {actionError ? <p className="form-message form-message-error">{actionError}</p> : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </PartnerPortalLayout>
  )
}
