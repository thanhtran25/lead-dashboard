import type { StatsFilters } from '@/lib/types'
import DateRangePicker from './DateRangePicker'

export default function WelcomeRow({
  filters,
  onChange,
}: {
  filters: StatsFilters
  onChange: (next: StatsFilters) => void
}) {
  return (
    <div className="flex items-center">
      <DateRangePicker
        from={filters.from}
        to={filters.to}
        onChange={(from, to) => onChange({ ...filters, from, to })}
      />
    </div>
  )
}
