import { useEffect, useMemo, useRef, useState } from 'react'
import SidebarLayout from '../components/SidebarLayout'
import { getActivitiesApiErrorMessage, listActivities } from '../lib/activitiesApi'

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="5.8" fill="none" stroke="currentColor" strokeWidth="2" />
      <path d="m15.2 15.2 4.3 4.3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function DateIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5.7" width="17" height="14.2" rx="2.2" fill="none" stroke="currentColor" strokeWidth="1.9" />
      <path d="M7 3.7v3.3M17 3.7v3.3M3.5 9.5h17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" />
      <path d="M8.5 12.8h2.8M13.3 12.8h2.8M8.5 16.2h2.8" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  )
}

function DownloadIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 4.1v10.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="m8.3 10.5 3.7 3.9 3.7-3.9" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M4.4 19.2h15.2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

const MONTH_OPTIONS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Marco' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
]

function normalize(text) {
  return String(text ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
}

function formatDate(isoDate) {
  const [year, month, day] = String(isoDate ?? '').split('-')
  if (!year || !month || !day) return '--/--/----'
  return `${day}/${month}/${year}`
}

function formatDateForExport(isoDate) {
  const [year, month, day] = String(isoDate ?? '').split('-')
  if (!year || !month || !day) return '--/--/--'
  return `${day}/${month}/${year.slice(2)}`
}

function getWeekdayLabel(isoDate) {
  const date = new Date(`${isoDate}T00:00:00`)
  const labels = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB']
  return labels[date.getDay()] ?? '---'
}

function formatAmount(value) {
  return Number(value ?? 0).toFixed(2).replace('.', ',')
}

function formatTime(value) {
  return String(value ?? '').replace(':', 'h')
}

function formatStatus(status) {
  if (status === 'confirmado') return 'Aprovado'
  if (status === 'cancelado') return 'Recusado'
  if (status === 'pendente') return 'Pendente'
  return status || 'Sem status'
}

function buildActivitySummary(activity) {
  return `Parceiro: ${activity.partnerName} | Produto: ${activity.productName} | Status: ${formatStatus(activity.status)}`
}

function groupByDate(activities) {
  const map = new Map()

  for (const activity of activities) {
    const key = activity.date
    const list = map.get(key)
    if (list) {
      list.push(activity)
    } else {
      map.set(key, [activity])
    }
  }

  return Array.from(map.entries()).map(([date, items]) => ({ date, items }))
}

export default function Activities() {
  const filterRef = useRef(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFilterType, setDateFilterType] = useState('month')
  const [selectedMonth, setSelectedMonth] = useState('')
  const [selectedMonthYear, setSelectedMonthYear] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [showDateFilter, setShowDateFilter] = useState(false)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionMessage, setActionMessage] = useState('')

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      setLoadError('')

      try {
        const nextActivities = await listActivities(statusFilter)
        if (!active) return
        setActivities(nextActivities)
      } catch (error) {
        if (!active) return
        setLoadError(getActivitiesApiErrorMessage(error))
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
  }, [statusFilter])

  useEffect(() => {
    if (!showDateFilter) {
      return undefined
    }

    const handleClickOutside = (event) => {
      if (filterRef.current && !filterRef.current.contains(event.target)) {
        setShowDateFilter(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDateFilter])

  const filteredActivities = useMemo(() => {
    const normalizedSearch = normalize(searchTerm.trim())

    return activities.filter((activity) => {
      const matchesSearch =
        !normalizedSearch ||
        normalize(activity.studentName).includes(normalizedSearch) ||
        normalize(activity.partnerName).includes(normalizedSearch)

      const activityYear = String(activity.date ?? '').slice(0, 4)
      const activityMonth = String(activity.date ?? '').slice(5, 7)
      const matchesMonth =
        (!selectedMonth || activityMonth === selectedMonth) &&
        (!selectedMonthYear || activityYear === selectedMonthYear)
      const matchesYear = !selectedYear || activityYear === selectedYear
      const matchesDate = dateFilterType === 'month' ? matchesMonth : matchesYear

      return matchesSearch && matchesDate
    })
  }, [activities, dateFilterType, searchTerm, selectedMonth, selectedMonthYear, selectedYear])

  const yearOptions = useMemo(() => {
    const values = Array.from(new Set(activities.map((activity) => String(activity.date ?? '').slice(0, 4)).filter(Boolean)))
    if (values.length === 0) {
      return [String(new Date().getFullYear())]
    }
    return values.sort((a, b) => b.localeCompare(a))
  }, [activities])

  const groupedActivities = useMemo(() => groupByDate(filteredActivities), [filteredActivities])

  const handleDownloadFile = () => {
    if (filteredActivities.length === 0) {
      setActionMessage('Não há atividades para exportar com os filtros atuais.')
      return
    }

    const header = ['Data', 'Hora', 'Aluno', 'Loja', 'Produto', 'Status', 'ValorEuras']
    const rows = filteredActivities.map((activity) => [
      `\u200B${formatDateForExport(activity.date)}`,
      activity.time,
      activity.studentName,
      activity.partnerName,
      activity.productName,
      activity.status,
      String(activity.amountEuras).replace('.', ','),
    ])

    const csvContent = [header, ...rows]
      .map((row) =>
        row
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(';'),
      )
      .join('\n')

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' })
    const blobUrl = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const dateSuffix =
      dateFilterType === 'month'
        ? selectedMonth || selectedMonthYear
          ? `${selectedMonthYear || 'todos'}-${selectedMonth || '00'}`
          : new Date().toISOString().slice(0, 7)
        : selectedYear || new Date().toISOString().slice(0, 4)

    link.href = blobUrl
    link.download = `atividades-${dateSuffix}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)

    setActionMessage(`Arquivo atividades-${dateSuffix}.csv baixado com sucesso.`)
  }

  return (
    <SidebarLayout>
      <section className="activities-page">
        <div className="activities-topbar">
          <h1 className="activities-heading">Atividades</h1>

          <div className="activities-actions" ref={filterRef}>
            <label className="activities-search" aria-label="Pesquisar atividade">
              <span className="activities-search-icon">
                <SearchIcon />
              </span>
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value)
                  setActionMessage('')
                }}
              />
            </label>

            <button
              type="button"
              className="activities-date-button"
              onClick={() => setShowDateFilter((current) => !current)}
            >
              <span className="activities-button-icon">
                <DateIcon />
              </span>
              <span>Data</span>
            </button>

            {showDateFilter ? (
              <div className="activities-filter-popover">
                <label className="activities-filter-row">
                  <span>Filtro:</span>
                  <select
                    value={dateFilterType}
                    onChange={(event) => {
                      setDateFilterType(event.target.value)
                      setActionMessage('')
                    }}
                  >
                    <option value="month">Mes</option>
                    <option value="year">Ano</option>
                  </select>
                </label>

                {dateFilterType === 'month' ? (
                  <>
                    <label className="activities-filter-row">
                      <span>Mes:</span>
                      <select
                        value={selectedMonth}
                        onChange={(event) => {
                          setSelectedMonth(event.target.value)
                          setActionMessage('')
                        }}
                      >
                        <option value="">Todos</option>
                        {MONTH_OPTIONS.map((month) => (
                          <option key={month.value} value={month.value}>
                            {month.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="activities-filter-row">
                      <span>Ano:</span>
                      <select
                        value={selectedMonthYear}
                        onChange={(event) => {
                          setSelectedMonthYear(event.target.value)
                          setActionMessage('')
                        }}
                      >
                        <option value="">Todos</option>
                        {yearOptions.map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </label>
                  </>
                ) : (
                  <label className="activities-filter-row">
                    <span>Ano:</span>
                    <select
                      value={selectedYear}
                      onChange={(event) => {
                        setSelectedYear(event.target.value)
                        setActionMessage('')
                      }}
                    >
                      <option value="">Todos</option>
                      {yearOptions.map((year) => (
                        <option key={year} value={year}>
                          {year}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <button
                  type="button"
                  className="activities-clear-filter-button"
                  onClick={() => {
                    setSelectedMonth('')
                    setSelectedMonthYear('')
                    setSelectedYear('')
                    setActionMessage('')
                  }}
                >
                  Limpar filtro
                </button>
              </div>
            ) : null}

            <button
              type="button"
              className="activities-download-button"
              onClick={handleDownloadFile}
            >
              <span className="activities-button-icon">
                <DownloadIcon />
              </span>
              <span>Baixar arquivo</span>
            </button>
          </div>
        </div>

        <div className="activities-status-tabs" role="tablist" aria-label="Filtro por status das atividades">
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'all'}
            className={statusFilter === 'all' ? 'activities-status-tab active' : 'activities-status-tab'}
            onClick={() => {
              setStatusFilter('all')
              setActionMessage('')
            }}
          >
            Todas as atividades
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'approved'}
            className={statusFilter === 'approved' ? 'activities-status-tab active' : 'activities-status-tab'}
            onClick={() => {
              setStatusFilter('approved')
              setActionMessage('')
            }}
          >
            Aprovadas
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={statusFilter === 'rejected'}
            className={statusFilter === 'rejected' ? 'activities-status-tab active' : 'activities-status-tab'}
            onClick={() => {
              setStatusFilter('rejected')
              setActionMessage('')
            }}
          >
            Recusadas
          </button>
        </div>

        <section className="activities-board" aria-label="Historico de atividades">
          {loading ? <p className="activities-empty-state">Carregando atividades...</p> : null}
          {loadError ? <p className="activities-empty-state">{loadError}</p> : null}
          {actionMessage ? <p className="activities-message">{actionMessage}</p> : null}

          {!loading && !loadError
            ? groupedActivities.map((group) => (
                <section key={group.date} className="activities-day-group">
                  <p className="activities-day-title">
                    {getWeekdayLabel(group.date)} - {formatDate(group.date)}
                  </p>

                  <div className="activities-day-items">
                    {group.items.map((activity) => (
                      <article key={activity.id} className="activity-row">
                        <div className="activity-main">
                          <h3>{activity.studentName}</h3>
                          <p>{buildActivitySummary(activity)}</p>
                        </div>

                        <div className="activity-meta">
                          <strong className="euras-inline-value">
                            <span className="euras-inline-coin" aria-hidden="true" />
                            {formatAmount(activity.amountEuras)}
                          </strong>
                          <span>{formatTime(activity.time)}</span>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>
              ))
            : null}

          {!loading && !loadError && filteredActivities.length === 0 ? (
            <p className="activities-empty-state">Nenhuma atividade encontrada com os filtros atuais.</p>
          ) : null}
        </section>
      </section>
    </SidebarLayout>
  )
}
