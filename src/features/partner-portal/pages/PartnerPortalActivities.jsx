import { useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../../../context/AuthContext'
import { runWithRetries, withRequestTimeout } from '../../../lib/requestGuards'
import { supabase } from '../../../lib/supabase'
import PartnerPortalLayout from '../components/PartnerPortalLayout'
import {
  fetchResgates,
  getParceiroDataErrorMessage,
} from '../hooks/useParceiroData'

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="5.8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="m15.2 15.2 4.3 4.3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M7.5 3.8v3.3M16.5 3.8v3.3M3.8 9.2h16.4" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="9" cy="12.8" r="1" fill="currentColor" />
      <circle cx="12" cy="12.8" r="1" fill="currentColor" />
      <circle cx="15" cy="12.8" r="1" fill="currentColor" />
    </svg>
  )
}

function formatEuras(value) {
  const amount = Number(value)
  const safeAmount = Number.isFinite(amount) ? amount : 0

  return safeAmount.toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function sortActivitiesDesc(a, b) {
  return Number(b.sortKey ?? 0) - Number(a.sortKey ?? 0)
}

function normalizeSearchText(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

function normalizeStatusFilter(statusFilter) {
  if (statusFilter === 'approved') return 'confirmado'
  if (statusFilter === 'rejected') return 'cancelado'
  return 'all'
}

function statusLabel(status) {
  if (status === 'confirmado') return 'Aprovado'
  if (status === 'cancelado') return 'Recusado'
  if (status === 'pendente') return 'Pendente'
  return status || 'Sem status'
}

function formatISODateToBr(value) {
  if (!value) return ''

  const [year, month, day] = String(value).split('-')
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function toISODate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function buildDateFilterLabel(startDateISO, endDateISO) {
  if (startDateISO && endDateISO) {
    return `${formatISODateToBr(startDateISO)} - ${formatISODateToBr(endDateISO)}`
  }

  if (startDateISO) {
    return `Desde ${formatISODateToBr(startDateISO)}`
  }

  if (endDateISO) {
    return `Ate ${formatISODateToBr(endDateISO)}`
  }

  return 'Data'
}

function matchesDateRange(activityDateISO, startDateISO, endDateISO) {
  const safeDate = String(activityDateISO ?? '')
  if (!safeDate) return false

  if (startDateISO && safeDate < startDateISO) {
    return false
  }

  if (endDateISO && safeDate > endDateISO) {
    return false
  }

  return true
}

function getQuickRange(option) {
  const now = new Date()

  if (option === 'today') {
    const today = toISODate(now)
    return { start: today, end: today }
  }

  if (option === 'last7') {
    const start = new Date(now)
    start.setDate(now.getDate() - 6)
    return { start: toISODate(start), end: toISODate(now) }
  }

  if (option === 'thisMonth') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    return { start: toISODate(start), end: toISODate(now) }
  }

  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
  return { start: toISODate(startOfLastMonth), end: toISODate(endOfLastMonth) }
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

function mapResgateToActivity(row) {
  const occurredAt = row.criado_em
  const safeDate = toSafeDate(occurredAt)

  return {
    id: row.id,
    studentName: row.aluno?.nome_completo ?? 'Aluno',
    productTitle: row.produto?.titulo ?? 'Produto',
    productSummary: row.produto?.titulo ?? 'Produto',
    amountEuras: Number(row.valor_euras ?? 0),
    dateLabel: formatDateLabel(safeDate),
    occurredAtLabel: formatTimeLabel(safeDate).replace(':', 'h'),
    occurredDateISO: safeDate.toISOString().slice(0, 10),
    sortKey: safeDate.getTime(),
    status: row.status ?? '',
    rejectionReason: row.motivo_recusa ?? '',
  }
}

export default function PartnerPortalActivities() {
  const { profile } = useAuth()
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [reloadNonce, setReloadNonce] = useState(0)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchText, setSearchText] = useState('')
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [startDateISO, setStartDateISO] = useState('')
  const [endDateISO, setEndDateISO] = useState('')
  const [draftStartDateISO, setDraftStartDateISO] = useState('')
  const [draftEndDateISO, setDraftEndDateISO] = useState('')
  const [dateFilterError, setDateFilterError] = useState('')
  const dateWrapRef = useRef(null)

  const partnerProfileId = profile?.id ?? null
  const statusQueryFilter = normalizeStatusFilter(statusFilter)

  useEffect(() => {
    let active = true

    async function loadActivities() {
      setLoading(true)
      setLoadError('')

      try {
        const response = await runWithRetries(
          () =>
            withRequestTimeout(
              fetchResgates(
                supabase,
                partnerProfileId,
                statusQueryFilter === 'all' ? null : statusQueryFilter,
              ),
              {
              message: 'Tempo limite ao carregar atividades do parceiro. Tente novamente.',
              },
            ),
          { attempts: 2 },
        )

        if (!active) return

        if (response.error) throw response.error
        setActivities((response.data ?? []).map(mapResgateToActivity).sort(sortActivitiesDesc))
      } catch (error) {
        if (!active) return

        console.info('Falha ao carregar atividades no portal parceiro.', error)
        setLoadError(getParceiroDataErrorMessage(error))
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    loadActivities()

    return () => {
      active = false
    }
  }, [partnerProfileId, reloadNonce, statusQueryFilter])

  useEffect(() => {
    if (!showDateFilter) {
      return undefined
    }

    const handleClickOutside = (event) => {
      if (dateWrapRef.current && !dateWrapRef.current.contains(event.target)) {
        setShowDateFilter(false)
        setDateFilterError('')
        setDraftStartDateISO(startDateISO)
        setDraftEndDateISO(endDateISO)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [endDateISO, showDateFilter, startDateISO])

  const filteredActivities = useMemo(() => {
    const normalizedQuery = normalizeSearchText(searchText)
    const expectedStatus = normalizeStatusFilter(statusFilter)

    return activities
      .filter((activity) => {
        if (expectedStatus !== 'all' && activity.status !== expectedStatus) {
          return false
        }

        if (!matchesDateRange(activity.occurredDateISO, startDateISO, endDateISO)) {
          return false
        }

        if (!normalizedQuery) {
          return true
        }

        const haystack = normalizeSearchText(`${activity.studentName} ${activity.productTitle}`)

        return haystack.includes(normalizedQuery)
      })
      .sort(sortActivitiesDesc)
  }, [activities, endDateISO, searchText, startDateISO, statusFilter])

  const groupedActivities = useMemo(() => {
    const groups = new Map()

    for (const activity of filteredActivities) {
      const key = `${activity.occurredDateISO ?? ''}:${activity.dateLabel ?? ''}`

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          dateLabel: activity.dateLabel ?? 'Sem data',
          items: [],
        })
      }

      groups.get(key).items.push(activity)
    }

    return Array.from(groups.values())
  }, [filteredActivities])

  const openDateFilter = () => {
    setDraftStartDateISO(startDateISO)
    setDraftEndDateISO(endDateISO)
    setDateFilterError('')
    setShowDateFilter(true)
  }

  const closeDateFilter = () => {
    setShowDateFilter(false)
    setDateFilterError('')
  }

  const applyDateFilter = () => {
    if (draftStartDateISO && draftEndDateISO && draftStartDateISO > draftEndDateISO) {
      setDateFilterError('Data inicial não pode ser maior que a data final.')
      return
    }

    setStartDateISO(draftStartDateISO)
    setEndDateISO(draftEndDateISO)
    setShowDateFilter(false)
    setDateFilterError('')
  }

  const applyQuickRange = (option) => {
    const { start, end } = getQuickRange(option)
    setDraftStartDateISO(start)
    setDraftEndDateISO(end)
    setDateFilterError('')
  }

  return (
    <PartnerPortalLayout title="Atividades">
      <section className="partner-activities-page">
        <div className="partner-activities-toolbar">
          <label className="partner-activities-search" aria-label="Pesquisar atividade">
            <span>
              <SearchIcon />
            </span>
            <input
              type="text"
              placeholder="Pesquisar..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
            />
          </label>

          <div className="partner-activities-date-wrap" ref={dateWrapRef}>
            <button
              type="button"
              className="partner-activities-date-button"
              onClick={() => (showDateFilter ? closeDateFilter() : openDateFilter())}
            >
              <span className="partner-activities-date-icon">
                <CalendarIcon />
              </span>
              <span>{buildDateFilterLabel(startDateISO, endDateISO)}</span>
            </button>

            {showDateFilter ? (
              <div className="partner-activities-date-panel" role="dialog" aria-label="Filtrar por intervalo de datas">
                <p className="partner-activities-date-panel-title">Intervalo de datas</p>

                <div className="partner-activities-date-inputs">
                  <label className="partner-activities-date-input">
                    <span>De</span>
                    <input
                      type="date"
                      value={draftStartDateISO}
                      onChange={(event) => setDraftStartDateISO(event.target.value)}
                    />
                  </label>

                  <span className="partner-activities-date-separator" aria-hidden="true">
                    -
                  </span>

                  <label className="partner-activities-date-input">
                    <span>Ate</span>
                    <input
                      type="date"
                      value={draftEndDateISO}
                      onChange={(event) => setDraftEndDateISO(event.target.value)}
                    />
                  </label>
                </div>

                <div className="partner-activities-presets">
                  <p>Periodos rapidos</p>
                  <div className="partner-activities-presets-list">
                    <button type="button" onClick={() => applyQuickRange('today')}>
                      Hoje
                    </button>
                    <button type="button" onClick={() => applyQuickRange('last7')}>
                      Ultimos 7 dias
                    </button>
                    <button type="button" onClick={() => applyQuickRange('thisMonth')}>
                      Este mes
                    </button>
                    <button type="button" onClick={() => applyQuickRange('lastMonth')}>
                      Mes passado
                    </button>
                  </div>
                </div>

                {dateFilterError ? (
                  <p className="partner-activities-date-error">{dateFilterError}</p>
                ) : null}

                <div className="partner-activities-date-actions">
                  <button
                    type="button"
                    className="partner-activities-date-reset"
                    onClick={() => {
                      setDraftStartDateISO('')
                      setDraftEndDateISO('')
                      setDateFilterError('')
                    }}
                  >
                    Limpar
                  </button>
                  <button type="button" className="partner-activities-date-cancel" onClick={closeDateFilter}>
                    Cancelar
                  </button>
                  <button type="button" className="partner-activities-date-apply" onClick={applyDateFilter}>
                    Aplicar
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <article className="partner-activities-card">
          <div className="partner-activities-filters">
            <button
              type="button"
              className={statusFilter === 'all' ? 'partner-activities-filter active' : 'partner-activities-filter'}
              onClick={() => setStatusFilter('all')}
            >
              Todas as atividades
            </button>
            <span className="partner-activities-divider" aria-hidden="true">|</span>
            <button
              type="button"
              className={statusFilter === 'approved' ? 'partner-activities-filter active' : 'partner-activities-filter'}
              onClick={() => setStatusFilter('approved')}
            >
              Aprovadas
            </button>
            <span className="partner-activities-divider" aria-hidden="true">|</span>
            <button
              type="button"
              className={statusFilter === 'rejected' ? 'partner-activities-filter active' : 'partner-activities-filter'}
              onClick={() => setStatusFilter('rejected')}
            >
              Recusadas
            </button>
          </div>

          {loading ? <p className="form-message">Carregando atividades...</p> : null}

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

          {!loading && !loadError && groupedActivities.length === 0 ? (
            <p className="form-message">Nenhuma atividade encontrada para os filtros informados.</p>
          ) : null}

          {!loading && !loadError
            ? groupedActivities.map((group) => (
                <section key={group.key} className="partner-activities-group">
                  <p className="partner-activities-date-label">{group.dateLabel}</p>

                  {group.items.map((activity) => (
                    <div key={activity.id} className="partner-activities-row">
                      <div className="partner-activities-main">
                        <h3>{activity.studentName}</h3>
                        <p>
                          {activity.productSummary || activity.productTitle}
                          {' | '}
                          {statusLabel(activity.status)}
                        </p>
                        {activity.status === 'cancelado' && activity.rejectionReason ? (
                          <p>Motivo: {activity.rejectionReason}</p>
                        ) : null}
                      </div>

                      <div className="partner-activities-values">
                        <p
                          className={
                            activity.status === 'cancelado'
                              ? 'partner-activities-amount partner-activities-amount-rejected'
                              : 'partner-activities-amount'
                          }
                        >
                          &lt; {formatEuras(activity.amountEuras)}
                        </p>
                        <span>{activity.occurredAtLabel}</span>
                      </div>
                    </div>
                  ))}
                </section>
              ))
            : null}
        </article>
      </section>
    </PartnerPortalLayout>
  )
}
