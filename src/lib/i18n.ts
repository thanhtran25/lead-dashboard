import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Locale = 'vi' | 'en'

const STRINGS = {
  vi: {
    'app.name': 'LeadScope',
    'app.tagline': 'Thống kê lead theo kênh',

    'login.title': 'Đăng nhập',
    'login.subtitle': 'Xác thực để xem thống kê lead.',
    'login.email': 'Email',
    'login.password': 'Mật khẩu',
    'login.show': 'Hiện',
    'login.hide': 'Ẩn',
    'login.submit': 'Đăng nhập',
    'login.signingIn': 'Đang đăng nhập…',
    'login.missingFields': 'Vui lòng nhập email và mật khẩu.',
    'login.noFirebaseKey':
      'Chưa cấu hình VITE_FIREBASE_KEY trong .env. Restart server sau khi cập nhật.',
    'login.notice': 'Lưu ý',
    'login.error': 'Lỗi',

    'header.signOut': 'Đăng xuất',
    'header.operator': 'Tài khoản',
    'header.lastFetch': 'Cập nhật lần cuối',
    'header.systemTime': 'Thời gian hệ thống',

    'section.filters': 'Bộ lọc',
    'section.overview': 'Tổng quan',
    'section.timeSeries': 'Biểu đồ theo thời gian',
    'section.breakdown': 'Chi tiết theo kỳ',
    'section.debug': 'Debug · Raw API response',

    'filter.channels': 'Kênh',
    'filter.groupBy': 'Nhóm theo',
    'filter.dateRange': 'Khoảng thời gian',
    'filter.actions': 'Hành động',
    'filter.preset.7d': '7 NGÀY',
    'filter.preset.14d': '14 NGÀY',
    'filter.preset.30d': '30 NGÀY',
    'filter.preset.90d': '90 NGÀY',
    'filter.group.day': 'Ngày',
    'filter.group.week': 'Tuần',
    'filter.group.month': 'Tháng',
    'filter.refresh': 'Làm mới',
    'filter.fetching': 'Đang tải…',
    'filter.auto.off': 'Tự động · Tắt',
    'filter.auto.30s': 'Tự động · 30 giây',
    'filter.auto.1m': 'Tự động · 1 phút',
    'filter.auto.5m': 'Tự động · 5 phút',

    'kpi.total': 'Tổng số lead',
    'kpi.completed': 'Đã hoàn thành',
    'kpi.processing': 'Đang xử lý',
    'kpi.failed': 'Thất bại',
    'kpi.conversion': 'Tỷ lệ hoàn thành',
    'kpi.average': 'Trung bình / kỳ',
    'kpi.peak': 'Cao nhất',
    'kpi.growth': 'Tăng trưởng',
    'kpi.activeChannels': '{n} kênh hoạt động',
    'kpi.peakNote': 'tại {label}',
    'kpi.peakEmpty': 'không có dữ liệu',
    'kpi.growthNote': 'nửa sau so với nửa đầu',
    'kpi.averageNote': 'qua {n} kỳ',
    'kpi.percentOfTotal': '{pct}% tổng',

    'metric.label': 'Chỉ số',
    'metric.total': 'Tổng',
    'metric.completed': 'Hoàn thành',
    'metric.processing': 'Đang xử lý',
    'metric.failed': 'Thất bại',

    'chart.title': 'Lead theo kênh',
    'chart.mode.line': 'Đường',
    'chart.mode.bar': 'Cột',
    'chart.mode.stacked': 'Vùng chồng',
    'chart.summary': '{channels} kênh · {buckets} kỳ',
    'chart.empty.title': 'Chưa có dữ liệu',
    'chart.empty.hint':
      'Đổi kênh hoặc khoảng thời gian, sau đó bấm Làm mới để gọi lại API.',

    'table.title': 'Chi tiết theo kỳ',
    'table.hint': 'Click vào header để sắp xếp',
    'table.col.period': 'Kỳ',
    'table.col.total': 'Tổng',
    'table.col.completed': 'Hoàn thành',
    'table.col.processing': 'Đang xử lý',
    'table.col.failed': 'Thất bại',
    'table.sum': 'TỔNG',
    'table.empty': 'Không có dòng nào trong khoảng này.',
    'table.export': 'Xuất CSV',
    'table.viewByChannel': 'Theo kênh',
    'table.viewByStatus': 'Theo trạng thái',

    'debug.title': 'Raw API response',
    'debug.hint':
      'Dùng tab này để kiểm tra dữ liệu thật và cập nhật parser trong lib/stats.ts',
    'debug.expand': 'Mở',
    'debug.collapse': 'Thu gọn',
    'debug.copy': 'Copy JSON',
    'debug.copied': 'Đã copy',
    'debug.diag.title': 'Chẩn đoán parser',
    'debug.diag.buckets': 'Số kỳ phân tích được',
    'debug.diag.channels': 'Kênh phát hiện',
    'debug.diag.total': 'Tổng cộng',
    'debug.diag.emptyHint':
      'Parser không trích được số nào. Copy JSON ở dưới và gửi lại để cập nhật parser.',
    'debug.noData': 'Chưa có response. Bấm Làm mới ở bộ lọc.',

    'page.title': 'Bảng thống kê hôm nay',
    'page.subtitle': '{from} → {to} · nhóm theo {group} · {channels}',

    'error.title': 'Đã xảy ra lỗi',
    'error.retry': 'Thử lại',

    'misc.streaming': 'Đang stream',
    'misc.idle': 'Nghỉ',
    'misc.cacheAge': 'Cache {seconds}s',
    'misc.unknown': 'không xác định',
  },
  en: {
    'app.name': 'LeadScope',
    'app.tagline': 'Channel-wise lead statistics',

    'login.title': 'Sign in',
    'login.subtitle': 'Authenticate to read lead statistics.',
    'login.email': 'Email',
    'login.password': 'Password',
    'login.show': 'Show',
    'login.hide': 'Hide',
    'login.submit': 'Sign in',
    'login.signingIn': 'Signing in…',
    'login.missingFields': 'Please enter both email and password.',
    'login.noFirebaseKey':
      'VITE_FIREBASE_KEY is not set in .env. Restart the server after editing.',
    'login.notice': 'Notice',
    'login.error': 'Error',

    'header.signOut': 'Sign out',
    'header.operator': 'Operator',
    'header.lastFetch': 'Last fetch',
    'header.systemTime': 'System time',

    'section.filters': 'Filters',
    'section.overview': 'Overview',
    'section.timeSeries': 'Time series',
    'section.breakdown': 'Breakdown',
    'section.debug': 'Debug · Raw API response',

    'filter.channels': 'Channels',
    'filter.groupBy': 'Group by',
    'filter.dateRange': 'Date range',
    'filter.actions': 'Actions',
    'filter.preset.7d': '7D',
    'filter.preset.14d': '14D',
    'filter.preset.30d': '30D',
    'filter.preset.90d': '90D',
    'filter.group.day': 'Day',
    'filter.group.week': 'Week',
    'filter.group.month': 'Month',
    'filter.refresh': 'Refresh',
    'filter.fetching': 'Fetching…',
    'filter.auto.off': 'Auto · Off',
    'filter.auto.30s': 'Auto · 30s',
    'filter.auto.1m': 'Auto · 1m',
    'filter.auto.5m': 'Auto · 5m',

    'kpi.total': 'Total leads',
    'kpi.completed': 'Completed',
    'kpi.processing': 'Processing',
    'kpi.failed': 'Failed',
    'kpi.conversion': 'Completion rate',
    'kpi.average': 'Average / bucket',
    'kpi.peak': 'Peak',
    'kpi.growth': 'Growth',
    'kpi.activeChannels': '{n} channels active',
    'kpi.peakNote': 'on {label}',
    'kpi.peakEmpty': 'no data',
    'kpi.growthNote': '2nd half vs 1st half',
    'kpi.averageNote': 'over {n} buckets',
    'kpi.percentOfTotal': '{pct}% of total',

    'metric.label': 'Metric',
    'metric.total': 'Total',
    'metric.completed': 'Completed',
    'metric.processing': 'Processing',
    'metric.failed': 'Failed',

    'chart.title': 'Leads by channel',
    'chart.mode.line': 'Line',
    'chart.mode.bar': 'Bar',
    'chart.mode.stacked': 'Stacked',
    'chart.summary': '{channels} channels · {buckets} buckets',
    'chart.empty.title': 'No data',
    'chart.empty.hint':
      'Adjust channels or date range, then click Refresh to retry the API.',

    'table.title': 'Per-period breakdown',
    'table.hint': 'Click a header to sort',
    'table.col.period': 'Period',
    'table.col.total': 'Total',
    'table.col.completed': 'Completed',
    'table.col.processing': 'Processing',
    'table.col.failed': 'Failed',
    'table.sum': 'SUM',
    'table.empty': 'No rows in this range.',
    'table.export': 'Export CSV',
    'table.viewByChannel': 'By channel',
    'table.viewByStatus': 'By status',

    'debug.title': 'Raw API response',
    'debug.hint':
      'Use this to inspect real data and adjust the parser in lib/stats.ts',
    'debug.expand': 'Expand',
    'debug.collapse': 'Collapse',
    'debug.copy': 'Copy JSON',
    'debug.copied': 'Copied',
    'debug.diag.title': 'Parser diagnostics',
    'debug.diag.buckets': 'Buckets extracted',
    'debug.diag.channels': 'Channels detected',
    'debug.diag.total': 'Grand total',
    'debug.diag.emptyHint':
      "Parser couldn't extract any numbers. Copy the JSON below and share it so we can update the parser.",
    'debug.noData': 'No response yet. Press Refresh in the filter bar.',

    'page.title': "Today's lead desk",
    'page.subtitle': '{from} → {to} · grouped by {group} · {channels}',

    'error.title': 'Something went wrong',
    'error.retry': 'Retry',

    'misc.streaming': 'Streaming',
    'misc.idle': 'Idle',
    'misc.cacheAge': 'Cache {seconds}s',
    'misc.unknown': 'unknown',
  },
} as const

export type TKey = keyof (typeof STRINGS)['vi']

interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
  toggle: () => void
}

export const useLocale = create<LocaleState>()(
  persist(
    (set, get) => ({
      locale: 'vi',
      setLocale: (locale) => set({ locale }),
      toggle: () => set({ locale: get().locale === 'vi' ? 'en' : 'vi' }),
    }),
    {
      name: 'leadscope.locale',
      storage: createJSONStorage(() => localStorage),
    },
  ),
)

function format(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    key in vars ? String(vars[key]) : `{${key}}`,
  )
}

export function useT() {
  const locale = useLocale((s) => s.locale)
  return (key: TKey, vars?: Record<string, string | number>) => {
    const dict = STRINGS[locale] as Record<string, string>
    const fallback = STRINGS.vi as Record<string, string>
    return format(dict[key] ?? fallback[key] ?? key, vars)
  }
}

export function translate(
  locale: Locale,
  key: TKey,
  vars?: Record<string, string | number>,
): string {
  const dict = STRINGS[locale] as Record<string, string>
  const fallback = STRINGS.vi as Record<string, string>
  return format(dict[key] ?? fallback[key] ?? key, vars)
}
