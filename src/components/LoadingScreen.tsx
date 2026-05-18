export default function LoadingScreen() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-bg">
      <div className="flex items-center gap-3 text-fg-muted">
        <span className="h-2 w-2 rounded-full bg-brand animate-pulse-dot" />
        <span className="text-sm font-medium tracking-wide">
          LeadScope
        </span>
      </div>
    </div>
  )
}
