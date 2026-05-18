import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { format, subDays } from 'date-fns'

import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'
import WelcomeRow from '@/components/WelcomeRow'
import NavTabs from '@/components/NavTabs'
import FilterStrip from '@/components/FilterStrip'
import MiniWidgets from '@/components/MiniWidgets'
import ChannelBreakdown from '@/components/ChannelBreakdown'
import StatusDonut from '@/components/StatusDonut'
import VolumeCard from '@/components/VolumeCard'
import SubChannelsCard from '@/components/SubChannelsCard'
import DataTable from '@/components/DataTable'

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

const VALID_GROUPS = new Set<StatsFilters['groupBy']>(['DAY', 'MONTH', 'YEAR'])
const VALID_METRICS = new Set<StatsFilters['metric']>([
  'total',
  'completed',
  'processing',
  'failed',
])

function loadFilters(): StatsFilters {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultFilters()
    const parsed = JSON.parse(raw) as Partial<StatsFilters>
    const fb = defaultFilters()
    return {
      channelTypes:
        parsed.channelTypes && parsed.channelTypes.length > 0
          ? parsed.channelTypes
          : fb.channelTypes,
      groupBy:
        parsed.groupBy && VALID_GROUPS.has(parsed.groupBy)
          ? parsed.groupBy
          : fb.groupBy,
      from: parsed.from ?? fb.from,
      to: parsed.to ?? fb.to,
      metric:
        parsed.metric && VALID_METRICS.has(parsed.metric)
          ? parsed.metric
          : fb.metric,
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

  const errorMessage =
    query.error instanceof Error ? query.error.message : null

  return (
    <div className="min-h-screen flex bg-bg">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        {/* Sticky page header — sits right below TopBar (h-16) and keeps
            the welcome line + metric tabs in view while the user scrolls. */}
        <div className="sticky top-16 z-20 bg-bg/90 backdrop-blur border-b border-line">
          <div className="px-6 lg:px-8 pt-5 pb-3 space-y-5">
            <WelcomeRow filters={filters} onChange={setFilters} />
            <NavTabs
              active={filters.metric}
              onChange={(m) => setFilters({ ...filters, metric: m })}
            />
          </div>
        </div>

        <main className="flex-1 px-6 lg:px-8 py-6 space-y-6">
          <FilterStrip
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
              <button
                onClick={() => query.refetch()}
                className="btn-ghost mt-4"
              >
                {t('error.retry')}
              </button>
            </div>
          )}

          <MiniWidgets
            buckets={parsed.buckets}
            channels={visibleChannels}
            activeMetric={filters.metric}
            onSelectMetric={(m) => setFilters({ ...filters, metric: m })}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ChannelBreakdown
                buckets={parsed.buckets}
                channels={visibleChannels}
                metric={filters.metric}
              />
            </div>
            <StatusDonut summary={summary} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VolumeCard
              buckets={parsed.buckets}
              channels={visibleChannels}
              metric={filters.metric}
              groupBy={filters.groupBy}
            />
            <SubChannelsCard
              buckets={parsed.buckets}
              subChannels={parsed.subChannels}
              metric={filters.metric}
            />
          </div>

          <DataTable
            buckets={parsed.buckets}
            channels={visibleChannels}
            filename={`leadscope_${filters.from}_${filters.to}_${filters.groupBy}.csv`}
          />

          <footer className="pt-4 pb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-t border-line text-[11px] text-fg-dim">
            <span>© {new Date().getFullYear()} LeadScope</span>
            <span className="num">
              {query.isFetching ? t('misc.streaming') : t('misc.idle')}
            </span>
          </footer>
        </main>
      </div>
    </div>
  )
}
