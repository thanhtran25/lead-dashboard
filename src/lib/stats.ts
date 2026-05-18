import {
  addStats,
  emptyStats,
  metricOf,
  type ChannelStats,
  type LeadBucket,
  type MetricKey,
  type ParsedStats,
  type StatsFilters,
} from './types'
import { formatDateLabel } from './format'

/**
 * Parser for the /api/v1/stats/leads response.
 *
 * The actual shape returned by the backend is a list of day buckets, where
 * each bucket has `groups` keyed by top-level channel type, and each group
 * exposes a list of sub-channels with completion-status counts:
 *
 * ```jsonc
 * [
 *   {
 *     "date": "2026-04-28",
 *     "groups": [
 *       {
 *         "type": "IKIS",
 *         "channels": [
 *           { "channel": "MTS.V2.AOS", "qtyCompleted": 8, "qtyFailed": 0,
 *             "qtyProcessing": 13, "total": 21 },
 *           …
 *         ]
 *       },
 *       …
 *     ]
 *   }
 * ]
 * ```
 *
 * We tolerate a couple of variations defensively so a backend tweak
 * (renaming `groups` to `channelGroups`, etc.) doesn't break the UI.
 */
export function parseStats(raw: unknown, filters: StatsFilters): ParsedStats {
  const channels = new Set<string>()
  const subChannels = new Set<string>()
  const subChannelParent: Record<string, string> = {}
  const byPeriod = new Map<
    string,
    {
      channels: Record<string, ChannelStats>
      subChannels: Record<string, ChannelStats>
    }
  >()

  for (const row of pickRows(raw)) {
    if (!row || typeof row !== 'object') continue
    const r = row as Record<string, unknown>

    const period = pickPeriod(r)
    if (!period) continue

    const bucket = byPeriod.get(period) ?? { channels: {}, subChannels: {} }

    const groups = pickArr(r, ['groups', 'channelGroups', 'types'])
    if (groups.length > 0) {
      for (const g of groups) {
        if (!g || typeof g !== 'object') continue
        const grp = g as Record<string, unknown>
        const typeName = String(grp.type ?? grp.name ?? grp.channelType ?? '')
        if (!typeName) continue
        channels.add(typeName)

        const subs = pickArr(grp, ['channels', 'items', 'subChannels'])
        const typeAgg: ChannelStats = bucket.channels[typeName] ?? emptyStats()
        for (const sub of subs) {
          if (!sub || typeof sub !== 'object') continue
          const s = sub as Record<string, unknown>
          const subName = String(s.channel ?? s.name ?? s.id ?? '')
          const stats: ChannelStats = {
            completed: toNumber(s.qtyCompleted ?? s.completed),
            failed: toNumber(s.qtyFailed ?? s.failed),
            processing: toNumber(s.qtyProcessing ?? s.processing),
            total: toNumber(s.total ?? s.qtyTotal),
          }
          // Some upstreams omit `total` — fall back to a sum of statuses.
          if (stats.total === 0) {
            stats.total = stats.completed + stats.processing + stats.failed
          }
          bucket.channels[typeName] = addStats(typeAgg, stats)
          if (subName) {
            const fullKey = `${typeName}:${subName}`
            subChannels.add(fullKey)
            subChannelParent[fullKey] = typeName
            bucket.subChannels[fullKey] = addStats(
              bucket.subChannels[fullKey] ?? emptyStats(),
              stats,
            )
          }
        }
        // Ensure the type appears with at least zero stats even when its
        // sub-channel list is empty for this day.
        if (subs.length === 0 && !bucket.channels[typeName]) {
          bucket.channels[typeName] = emptyStats()
        }
      }
    }

    byPeriod.set(period, bucket)
  }

  // Seed selected channel filters so the chart always has columns for them.
  for (const c of filters.channelTypes) channels.add(c)

  const sortedPeriods = Array.from(byPeriod.keys()).sort()
  const channelList = Array.from(channels)
  const subChannelList = Array.from(subChannels).sort()

  const buckets: LeadBucket[] = sortedPeriods.map((period) => {
    const data = byPeriod.get(period)!
    const channelStats: Record<string, ChannelStats> = {}
    for (const c of channelList) channelStats[c] = data.channels[c] ?? emptyStats()
    const sub: Record<string, ChannelStats> = {}
    for (const k of subChannelList) sub[k] = data.subChannels[k] ?? emptyStats()
    const status = channelList.reduce(
      (acc, c) => addStats(acc, channelStats[c]),
      emptyStats(),
    )
    return {
      period,
      label: formatDateLabel(period, filters.groupBy),
      channels: channelStats,
      subChannels: sub,
      subChannelParent,
      status,
    }
  })

  return {
    buckets,
    channels: channelList,
    subChannels: subChannelList,
    raw,
  }
}

function pickRows(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw
  if (!raw || typeof raw !== 'object') return []
  const r = raw as Record<string, unknown>
  for (const key of ['data', 'items', 'results', 'rows', 'series', 'stats']) {
    const v = r[key]
    if (Array.isArray(v)) return v
  }
  for (const v of Object.values(r)) {
    if (Array.isArray(v)) return v
  }
  return []
}

function pickArr(obj: Record<string, unknown>, keys: string[]): unknown[] {
  for (const k of keys) {
    const v = obj[k]
    if (Array.isArray(v)) return v
  }
  return []
}

function pickPeriod(row: Record<string, unknown>): string | null {
  for (const key of [
    'date',
    'day',
    'period',
    'bucket',
    'time',
    'timestamp',
    'month',
    'year',
  ]) {
    const v = row[key]
    if (typeof v === 'string' && v.length > 0) return v.slice(0, 10)
    if (typeof v === 'number') return new Date(v).toISOString().slice(0, 10)
  }
  return null
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    if (Number.isFinite(n)) return n
  }
  return 0
}

// ---------------------------------------------------------------------------
// Summary metrics
// ---------------------------------------------------------------------------

export interface StatsSummary {
  /** Grand status totals across all visible channels and buckets. */
  status: ChannelStats
  /** Sum of the selected metric across all visible channels and buckets. */
  metricTotal: number
  /** Average of the selected metric per bucket. */
  metricAverage: number
  /** Bucket with the highest selected metric value. */
  peak: { label: string; value: number } | null
  /** Growth % of selected metric between the 2nd half vs 1st half of the range. */
  growthPct: number
  /** Number of channels that contributed any value of the selected metric. */
  activeChannels: number
  /** Convenience: completion conversion rate = completed / total. */
  conversionPct: number
}

export function summarizeStats(
  parsed: ParsedStats,
  visibleChannels: string[],
  metric: MetricKey = 'total',
): StatsSummary {
  const buckets = parsed.buckets
  if (buckets.length === 0) {
    return {
      status: emptyStats(),
      metricTotal: 0,
      metricAverage: 0,
      peak: null,
      growthPct: 0,
      activeChannels: 0,
      conversionPct: 0,
    }
  }

  const status = buckets.reduce<ChannelStats>(
    (acc, b) =>
      visibleChannels.reduce((s, c) => addStats(s, b.channels[c] ?? emptyStats()), acc),
    emptyStats(),
  )

  const metricByBucket = buckets.map((b) =>
    visibleChannels.reduce(
      (s, c) => s + metricOf(b.channels[c] ?? emptyStats(), metric),
      0,
    ),
  )

  const metricTotal = metricByBucket.reduce((s, n) => s + n, 0)
  const metricAverage = metricTotal / buckets.length

  let peakIdx = 0
  for (let i = 1; i < metricByBucket.length; i++) {
    if (metricByBucket[i] > metricByBucket[peakIdx]) peakIdx = i
  }
  const peak = {
    label: buckets[peakIdx].label,
    value: metricByBucket[peakIdx],
  }

  const mid = Math.floor(buckets.length / 2)
  const firstHalf = metricByBucket.slice(0, mid).reduce((s, n) => s + n, 0)
  const secondHalf = metricByBucket.slice(mid).reduce((s, n) => s + n, 0)
  const growthPct =
    firstHalf > 0
      ? ((secondHalf - firstHalf) / firstHalf) * 100
      : secondHalf > 0
        ? 100
        : 0

  const activeChannels = visibleChannels.filter((c) =>
    buckets.some((b) => metricOf(b.channels[c] ?? emptyStats(), metric) > 0),
  ).length

  const conversionPct =
    status.total > 0 ? (status.completed / status.total) * 100 : 0

  return {
    status,
    metricTotal,
    metricAverage,
    peak,
    growthPct,
    activeChannels,
    conversionPct,
  }
}
