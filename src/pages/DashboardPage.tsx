import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { format, subDays } from 'date-fns'

import Header from '@/components/Header'
import FilterBar from '@/components/FilterBar'
import KpiCards from '@/components/KpiCard'
import LeadsChart from '@/components/LeadsChart'
import DataTable from '@/components/DataTable'
import DebugPanel from '@/components/DebugPanel'

import { useAuth } from '@/lib/auth'
import { ApiError, fetchLeadStats } from '@/lib/api'
import { parseStats, summarizeStats } from '@/lib/stats'
import { useT } from '@/lib/i18n'
import type { StatsFilters } from '@/lib/types'

const STORAGE_KEY = 'leadscope.filters'

function defaultFilters(): StatsFilters {
  const today = new Date()
  return {
    channelTypes: ['IKIS', 'WTS', 'DX'],
    groupBy: 'DAY',
    from: format(subDays(today, 7), 'yyyy-MM-dd'),
    to: format(today, 'yyyy-MM-dd'),
    metric: 'total',
  }
}

function loadFilters(): StatsFilters {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultFilters()
    const parsed = JSON.parse(raw) as Partial<StatsFilters>
    const fallback = defaultFilters()
    return {
      channelTypes:
        parsed.channelTypes && parsed.channelTypes.length > 0
          ? parsed.channelTypes
          : fallback.channelTypes,
      groupBy: parsed.groupBy ?? fallback.groupBy,
      from: parsed.from ?? fallback.from,
      to: parsed.to ?? fallback.to,
      metric: parsed.metric ?? fallback.metric,
    }
  } catch {
    return defaultFilters()
  }
}

export default function DashboardPage() {
  const t = useT()
  const navigate = useNavigate()
  const user = useAuth((s) => s.user)
  const logout = useAuth((s) => s.logout)

  const [filters, setFilters] = useState<StatsFilters>(() => loadFilters())
  const [refreshIntervalMs, setRefreshIntervalMs] = useState(0)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
  }, [filters])

  const idToken = user?.idToken ?? ''

  const query = useQuery({
    queryKey: ['leads', filters, idToken],
    queryFn: async ({ signal }) => fetchLeadStats(filters, idToken, signal),
    enabled: Boolean(idToken),
    refetchInterval: refreshIntervalMs > 0 ? refreshIntervalMs : false,
    refetchOnWindowFocus: false,
    retry: (count, err) => {
      if (err instanceof ApiError && (err.status === 401 || err.status === 403))
        return false
      return count < 1
    },
  })

  useEffect(() => {
    const err = query.error
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      logout()
      navigate('/login', { replace: true })
    }
  }, [query.error, logout, navigate])

  const parsed = useMemo(() => {
    if (!query.data) {
      return {
        buckets: [],
        channels: [],
        subChannels: [],
        raw: null as unknown,
      }
    }
    return parseStats(query.data, filters)
  }, [query.data, filters])

  const visibleChannels = useMemo(() => {
    const set = new Set(filters.channelTypes)
    return parsed.channels.length
      ? parsed.channels.filter(
          (c) => set.has(c) || filters.channelTypes.length === 0,
        )
      : filters.channelTypes
  }, [parsed.channels, filters.channelTypes])

  const summary = useMemo(
    () => summarizeStats(parsed, visibleChannels, filters.metric),
    [parsed, visibleChannels, filters.metric],
  )

  const groupLabel =
    filters.groupBy === 'DAY'
      ? t('filter.group.day')
      : filters.groupBy === 'WEEK'
        ? t('filter.group.week')
        : t('filter.group.month')

  const rangeLabel = `${filters.from} → ${filters.to}`
  const lastUpdated = query.dataUpdatedAt ? new Date(query.dataUpdatedAt) : null
  const errorMessage =
    query.error instanceof Error ? query.error.message : null

  const diagnostics = {
    buckets: parsed.buckets.length,
    channels: parsed.channels,
    total: summary.status.total,
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header lastUpdated={lastUpdated} />

      <main className="mx-auto w-full max-w-[1480px] px-6 py-8 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold text-fg tracking-tight">
              {t('page.title')}
            </h1>
            <p className="text-sm text-fg-muted mt-1">
              {t('page.subtitle', {
                from: filters.from,
                to: filters.to,
                group: groupLabel.toLowerCase(),
                channels: filters.channelTypes.join(' · '),
              })}
            </p>
          </div>
        </div>

        <FilterBar
          filters={filters}
          onChange={setFilters}
          onRefresh={() => query.refetch()}
          isFetching={query.isFetching}
          refreshIntervalMs={refreshIntervalMs}
          onRefreshIntervalChange={setRefreshIntervalMs}
        />

        {errorMessage && (
          <div className="card border-signal-red/40 bg-signal-red/5 p-5">
            <p className="text-sm font-semibold text-signal-red mb-1">
              {t('error.title')}
            </p>
            <p className="text-xs text-fg-muted">{errorMessage}</p>
            <button onClick={() => query.refetch()} className="btn-ghost mt-4">
              {t('error.retry')}
            </button>
          </div>
        )}

        <KpiCards summary={summary} rangeLabel={rangeLabel} />

        <LeadsChart
          buckets={parsed.buckets}
          channels={visibleChannels}
          metric={filters.metric}
        />

        <DataTable
          buckets={parsed.buckets}
          channels={visibleChannels}
          filename={`leadscope_${filters.from}_${filters.to}_${filters.groupBy}.csv`}
        />

        <DebugPanel raw={query.data ?? null} diagnostics={diagnostics} />

        <footer className="pt-4 pb-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-line text-[11px] text-fg-dim">
          <span>© {new Date().getFullYear()} LeadScope</span>
          <span className="num">
            {query.isFetching ? t('misc.streaming') : t('misc.idle')}
          </span>
        </footer>
      </main>
    </div>
  )
}
