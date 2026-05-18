export type ChannelType = 'IKIS' | 'WTS' | 'DX' | string

export type GroupBy = 'DAY' | 'MONTH' | 'YEAR'

/** Which numeric field of each sub-channel to use for charts/KPIs. */
export type MetricKey = 'total' | 'completed' | 'processing' | 'failed'

export const METRIC_KEYS: MetricKey[] = [
  'total',
  'completed',
  'processing',
  'failed',
]

export interface FirebaseLoginResponse {
  kind?: string
  localId?: string
  email?: string
  displayName?: string
  idToken: string
  registered?: boolean
  refreshToken?: string
  expiresIn?: string
}

export interface FirebaseErrorResponse {
  error?: {
    code?: number
    message?: string
    errors?: Array<{ message?: string; domain?: string; reason?: string }>
  }
}

export interface AuthUser {
  email: string
  username: string
  idToken: string
  refreshToken?: string
  expiresAt: number
}

export interface StatsFilters {
  channelTypes: ChannelType[]
  groupBy: GroupBy
  from: string // YYYY-MM-DD
  to: string // YYYY-MM-DD
  metric: MetricKey
}

/** Aggregate stats for a single period × dimension (type or sub-channel). */
export interface ChannelStats {
  completed: number
  failed: number
  processing: number
  total: number
}

export function emptyStats(): ChannelStats {
  return { completed: 0, failed: 0, processing: 0, total: 0 }
}

export function addStats(a: ChannelStats, b: ChannelStats): ChannelStats {
  return {
    completed: a.completed + b.completed,
    failed: a.failed + b.failed,
    processing: a.processing + b.processing,
    total: a.total + b.total,
  }
}

export function metricOf(stats: ChannelStats, key: MetricKey): number {
  switch (key) {
    case 'completed':
      return stats.completed
    case 'failed':
      return stats.failed
    case 'processing':
      return stats.processing
    case 'total':
    default:
      return stats.total
  }
}

/**
 * Normalized bucket. Holds aggregate stats per top-level channel type as
 * well as the sub-channels that contributed to those totals.
 */
export interface LeadBucket {
  /** Period key, e.g. "2026-04-28" (DAY). */
  period: string
  /** Human readable label for the X axis. */
  label: string
  /** Stats grouped by channelType: IKIS / WTS / DX. */
  channels: Record<string, ChannelStats>
  /** Stats grouped by sub-channel name (e.g. "MTS.V2.AOS"). */
  subChannels: Record<string, ChannelStats>
  /** Mapping sub-channel → parent channel type, for table breakdown. */
  subChannelParent: Record<string, string>
  /** Grand totals across all channel types. */
  status: ChannelStats
}

export interface ParsedStats {
  buckets: LeadBucket[]
  channels: string[]
  subChannels: string[]
  raw: unknown
}
