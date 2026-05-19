import { useMemo, useRef, useState } from 'react'

import Sidebar from '@/components/Sidebar'
import TopBar from '@/components/TopBar'

type LogEntry = {
  line?: string
  [key: string]: unknown
}

type ParseResult = {
  totalLines: number
  matchedLines: number
  allItems: string[]
  phones: string[]
  perLine: { line: string; items: string[] }[]
}

const TZ_OFFSET_HOURS = 7
const TZ_OFFSET_MS = TZ_OFFSET_HOURS * 60 * 60 * 1000
const BLOCKING_RE = /blocking\s*\[([^\]]*)\]\s*for\b/i
const PHONE_RE = /^0\d{9}$/

function extractItems(line: string): string[] {
  const m = line.match(BLOCKING_RE)
  if (!m) return []
  return m[1]
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function parseInput(raw: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch (err) {
    throw new Error(
      `JSON không hợp lệ: ${err instanceof Error ? err.message : String(err)}`,
    )
  }

  if (!Array.isArray(data)) {
    throw new Error('JSON phải là một mảng (array) các log entry.')
  }

  const perLine: { line: string; items: string[] }[] = []
  const dedup = new Set<string>()
  const ordered: string[] = []
  let matchedLines = 0

  for (const entry of data as LogEntry[]) {
    const line = typeof entry?.line === 'string' ? entry.line : ''
    if (!line) {
      perLine.push({ line: '', items: [] })
      continue
    }
    const items = extractItems(line)
    perLine.push({ line, items })
    if (items.length > 0) matchedLines += 1
    for (const it of items) {
      if (!dedup.has(it)) {
        dedup.add(it)
        ordered.push(it)
      }
    }
  }

  const phones = ordered.filter((it) => PHONE_RE.test(it))

  return {
    totalLines: data.length,
    matchedLines,
    allItems: ordered,
    phones,
    perLine,
  }
}

function getWhitelistDateRange(now = new Date()) {
  const vn = new Date(now.getTime() + TZ_OFFSET_MS)
  const y = vn.getUTCFullYear()
  const m = vn.getUTCMonth()
  const d = vn.getUTCDate()
  // from: today 00:00:00.000 (+07:00) → in UTC = (today)-7h
  const from = new Date(Date.UTC(y, m, d) - TZ_OFFSET_MS)
  // to: today+100 days 23:59:59.999 (+07:00) → in UTC = (today+100)+23:59:59.999 - 7h
  const to = new Date(
    Date.UTC(y, m, d + 100, 23, 59, 59, 999) - TZ_OFFSET_MS,
  )
  return { from, to }
}

function getDayRangeVn(year: number, month0: number, day: number) {
  // [00:00:00.000, 23:59:59.999] of a given calendar date in +07:00
  const from = new Date(Date.UTC(year, month0, day) - TZ_OFFSET_MS)
  const to = new Date(
    Date.UTC(year, month0, day, 23, 59, 59, 999) - TZ_OFFSET_MS,
  )
  return { from, to }
}

function getCurrentVnYear(now = new Date()) {
  return new Date(now.getTime() + TZ_OFFSET_MS).getUTCFullYear()
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

type IntroducerEntry = {
  raw: string
  code: string
  d: number
  m: number
  y: number
}

type IntroducerParse = {
  entries: IntroducerEntry[]
  invalid: string[]
}

function parseIntroducerLines(raw: string, now = new Date()): IntroducerParse {
  const entries: IntroducerEntry[] = []
  const invalid: string[] = []
  const dedup = new Set<string>()
  const defaultYear = getCurrentVnYear(now)

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line) continue

    const dateMatch = line.match(
      /(\d{1,2})\s*\/\s*(\d{1,2})(?:\s*\/\s*(\d{2,4}))?/,
    )
    if (!dateMatch) {
      invalid.push(line)
      continue
    }

    let codePart = line.slice(0, dateMatch.index).trim()
    codePart = codePart.replace(/[(\s]+(?:ngày\s*)?$/i, '').trim()
    if (!codePart) {
      invalid.push(line)
      continue
    }

    const d = Number(dateMatch[1])
    const m = Number(dateMatch[2])
    let y = defaultYear
    if (dateMatch[3]) {
      const yRaw = Number(dateMatch[3])
      y = dateMatch[3].length === 2 ? 2000 + yRaw : yRaw
    }

    if (
      !Number.isFinite(d) ||
      !Number.isFinite(m) ||
      d < 1 ||
      d > 31 ||
      m < 1 ||
      m > 12
    ) {
      invalid.push(line)
      continue
    }

    const key = `${codePart}|${y}-${m}-${d}`
    if (dedup.has(key)) continue
    dedup.add(key)

    entries.push({ raw: line, code: codePart, d, m, y })
  }

  return { entries, invalid }
}

function buildIntroducerQuery(entries: IntroducerEntry[]): string {
  if (entries.length === 0) {
    return '// (Nhập danh sách introducer ở trên để gen query.)'
  }
  const items = entries
    .map((e) => {
      const { from, to } = getDayRangeVn(e.y, e.m - 1, e.d)
      const value = `^(${escapeRegex(e.code)})$`
      return `  {
    "fieldName": "clientIntroducer",
    "from": ISODate(${JSON.stringify(from.toISOString())}),
    "to": ISODate(${JSON.stringify(to.toISOString())}),
    "type": "REGEX",
    "value": ${JSON.stringify(value)}
  }`
    })
    .join(',\n')
  return `db.whitelistRule.insertMany([
${items}
])`
}

function buildDeleteManyQuery(ids: string[]): string {
  if (ids.length === 0) {
    return '// (Chưa có item nào trong blocking. Upload file để xem query.)'
  }
  const lines = ids.map((id) => `      ${JSON.stringify(id)}`).join(',\n')
  return `db.blocks.deleteMany({
  _id: {
    $in: [
${lines}
    ]
  }
})`
}

function buildWhitelistQuery(phones: string[], now = new Date()): string {
  if (phones.length === 0) {
    return '// (Chưa có số điện thoại nào hợp lệ trong blocking.)'
  }
  const { from, to } = getWhitelistDateRange(now)
  const value = `^(${phones.join('|')})$`
  return `db.whitelistRule.insertMany([
  {
    "fieldName": "phone",
    "from": ISODate(${JSON.stringify(from.toISOString())}),
    "to": ISODate(${JSON.stringify(to.toISOString())}),
    "type": "REGEX",
    "value": ${JSON.stringify(value)}
  }
])`
}

const INTRODUCER_PLACEHOLDER = `BOOTH.HV (ngày 16/5)
BOOTH.REE (ngày 20/5)`

export default function FraudUnblockPage() {
  const [rawInput, setRawInput] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [introducerInput, setIntroducerInput] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const result = useMemo<ParseResult | null>(() => {
    if (!rawInput.trim()) return null
    try {
      const r = parseInput(rawInput)
      return r
    } catch (err) {
      return null
    }
  }, [rawInput])

  function handleParseError() {
    if (!rawInput.trim()) {
      setError(null)
      return
    }
    try {
      parseInput(rawInput)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const file = files[0]
    setFileName(file.name)
    try {
      const text = await file.text()
      setRawInput(text)
      try {
        parseInput(text)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    } catch (err) {
      setError(`Không đọc được file: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault()
    setDragging(false)
    handleFiles(e.dataTransfer.files)
  }

  function reset() {
    setRawInput('')
    setError(null)
    setFileName(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  const deleteQuery = useMemo(
    () => buildDeleteManyQuery(result?.allItems ?? []),
    [result],
  )
  const whitelistQuery = useMemo(
    () => buildWhitelistQuery(result?.phones ?? []),
    [result],
  )

  const dateRange = useMemo(() => getWhitelistDateRange(), [])

  const introducer = useMemo(
    () => parseIntroducerLines(introducerInput),
    [introducerInput],
  )
  const introducerQuery = useMemo(
    () => buildIntroducerQuery(introducer.entries),
    [introducer.entries],
  )

  return (
    <div className="min-h-screen flex bg-[#1e1e1e]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar />

        <main className="flex-1 px-6 lg:px-8 py-7 space-y-6 text-[#e4e4e7]">
          <header className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center justify-center h-9 w-9 rounded-lg bg-gradient-to-br from-[#a78bfa] to-[#6366f1] text-white shadow-[0_4px_16px_rgba(139,92,246,0.35)]">
                <ShieldGlyph />
              </span>
              <h1 className="text-2xl font-semibold tracking-tight text-white">
                Fraud Unblock — Generator
              </h1>
            </div>
            <p className="text-sm text-[#a1a1aa] max-w-3xl">
              Upload JSON log từ{' '}
              <span className="text-white">FraudCheckService</span> để sinh
              ra câu MongoDB{' '}
              <code className="text-[#f0abfc]">deleteMany</code> và{' '}
              <code className="text-[#86efac]">whitelistRule.insertMany</code>.
            </p>
          </header>

          <SectionCard
            number={1}
            tone="blue"
            title="Upload JSON file"
            subtitle={
              <>
                Kéo thả hoặc chọn file <CodeMark>.json</CodeMark> chứa mảng
                các log entry (có field <CodeMark>line</CodeMark>).
              </>
            }
            onDragOver={(e) => {
              e.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            highlight={dragging}
            rightSlot={
              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="application/json,.json,.txt"
                  className="hidden"
                  onChange={(e) => handleFiles(e.target.files)}
                />
                <button
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-md text-sm font-medium text-white bg-gradient-to-r from-[#7c5cff] to-[#a78bfa] hover:from-[#8b6bff] hover:to-[#b39dff] shadow-[0_2px_10px_rgba(124,92,255,0.4)] transition-all hover:shadow-[0_4px_16px_rgba(124,92,255,0.55)]"
                  onClick={() => fileRef.current?.click()}
                >
                  <UploadGlyph />
                  Chọn file
                </button>
                {(rawInput || fileName) && (
                  <button
                    className="inline-flex items-center h-10 px-3 rounded-md text-xs font-medium border border-[#3a3a3a] text-[#a1a1aa] hover:text-white hover:border-[#5a5a5a] transition-colors"
                    onClick={reset}
                  >
                    Reset
                  </button>
                )}
              </div>
            }
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <InnerPanel label="File hiện tại" accent="blue">
                <p className="text-sm text-white truncate font-mono">
                  {fileName ?? '—'}
                </p>
              </InnerPanel>
              <InnerPanel label="Hoặc paste JSON trực tiếp" accent="blue">
                <textarea
                  className="w-full h-24 bg-[#161616] border border-[#3a3a3a] rounded-md px-3 py-2 text-[12px] font-mono leading-relaxed text-[#e4e4e7] outline-none transition-colors focus:border-[#a78bfa] focus:bg-[#181818]"
                  placeholder='[{"line":"… blocking [0896… ] for 100 days", …}]'
                  value={rawInput}
                  onChange={(e) => {
                    setRawInput(e.target.value)
                    setFileName(null)
                  }}
                  onBlur={handleParseError}
                />
              </InnerPanel>
            </div>

            {error && (
              <div className="mt-3 rounded-md bg-[#fca5a5]/10 border border-[#fca5a5]/40 px-3 py-2 text-xs text-[#fca5a5]">
                {error}
              </div>
            )}
          </SectionCard>

          <SectionCard
            number={2}
            tone="cyan"
            title="Kết quả parse"
            subtitle={
              <>
                Cắt mảng giữa <CodeMark>blocking [</CodeMark> và{' '}
                <CodeMark>] for</CodeMark>, gộp lại và loại bỏ trùng lặp.
              </>
            }
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat
                label="Tổng entry"
                value={result?.totalLines ?? 0}
                accent="slate"
              />
              <Stat
                label="Entry khớp"
                value={result?.matchedLines ?? 0}
                accent="cyan"
              />
              <Stat
                label="Items (unique)"
                value={result?.allItems.length ?? 0}
                accent="amber"
              />
              <Stat
                label="Số điện thoại"
                value={result?.phones.length ?? 0}
                accent="green"
              />
            </div>

            {result && result.allItems.length > 0 && (
              <details className="mt-4 group">
                <summary className="text-xs text-[#a1a1aa] cursor-pointer hover:text-white select-none flex items-center gap-1.5">
                  <ChevronGlyph />
                  Xem chi tiết {result.allItems.length} items đã extract
                </summary>
                <div className="mt-2 max-h-48 overflow-auto rounded-md bg-[#161616] border border-[#2a2a2a] p-3 font-mono text-[11px] leading-relaxed">
                  {result.allItems.map((it) => {
                    const isPhone = PHONE_RE.test(it)
                    return (
                      <div
                        key={it}
                        className="flex items-center gap-2 py-0.5"
                      >
                        <span
                          className={[
                            'inline-flex items-center justify-center h-5 px-1.5 rounded text-[10px] font-medium shrink-0',
                            isPhone
                              ? 'bg-[#86efac]/15 text-[#86efac] border border-[#86efac]/30'
                              : 'bg-[#3a3a3a]/50 text-[#a1a1aa] border border-[#3a3a3a]',
                          ].join(' ')}
                        >
                          {isPhone ? 'phone' : '·'}
                        </span>
                        <span className="text-[#e4e4e7]">{it}</span>
                      </div>
                    )
                  })}
                </div>
              </details>
            )}
          </SectionCard>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-stretch">
            <SectionCard
              number={3}
              tone="pink"
              title="Query xoá block (deleteMany)"
              subtitle={
                <>
                  Mỗi item (phone / id / device id / ip) là 1 phần tử
                  trong <CodeMark>$in</CodeMark>.
                </>
              }
              rightSlot={
                <CopyButton
                  text={deleteQuery}
                  disabled={!result?.allItems.length}
                />
              }
              fill
            >
              <CodeBlock code={deleteQuery} fill />
            </SectionCard>

            <SectionCard
              number={4}
              tone="violet"
              title="Query whitelist phone (insertMany)"
              subtitle={
                <>
                  Lọc các item là số điện thoại (10 ký tự, bắt đầu bằng{' '}
                  <CodeMark>0</CodeMark>), gộp thành regex{' '}
                  <CodeMark>^(phone1|phone2|…)$</CodeMark>. Khoảng thời gian:{' '}
                  <span className="text-[#a78bfa] font-mono">
                    {dateRange.from.toISOString()}
                  </span>{' '}
                  →{' '}
                  <span className="text-[#a78bfa] font-mono">
                    {dateRange.to.toISOString()}
                  </span>{' '}
                  (00:00 hôm nay → 23:59:59.999 ngày thứ 100, theo +07:00).
                </>
              }
              rightSlot={
                <CopyButton
                  text={whitelistQuery}
                  disabled={!result?.phones.length}
                />
              }
              fill
            >
              <CodeBlock code={whitelistQuery} fill />
            </SectionCard>
          </div>

          <SectionCard
            number={5}
            tone="green"
            title="Whitelist Introducer theo ngày"
            subtitle={
              <>
                Mỗi dòng: <CodeMark>CODE (ngày DD/M)</CodeMark> hoặc{' '}
                <CodeMark>CODE (DD/M/YYYY)</CodeMark>. Mỗi entry sinh ra 1
                rule với{' '}
                <CodeMark>fieldName: "clientIntroducer"</CodeMark>, khoảng
                thời gian là 00:00 → 23:59:59.999 của ngày đó (theo +07:00).
                Dấu <CodeMark>.</CodeMark> sẽ được escape thành{' '}
                <CodeMark>\.</CodeMark>
              </>
            }
            rightSlot={
              <CopyButton
                text={introducerQuery}
                disabled={introducer.entries.length === 0}
              />
            }
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <InnerPanel
                label="Input — 1 introducer / dòng"
                accent="green"
              >
                <textarea
                  className="w-full h-40 bg-[#161616] border border-[#3a3a3a] rounded-md px-3 py-2 text-[12px] font-mono leading-relaxed text-[#e4e4e7] outline-none transition-colors focus:border-[#86efac] focus:bg-[#181818]"
                  placeholder={INTRODUCER_PLACEHOLDER}
                  value={introducerInput}
                  onChange={(e) => setIntroducerInput(e.target.value)}
                  spellCheck={false}
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-[#71717a]">
                    Năm mặc định ={' '}
                    <span className="font-mono text-[#a1a1aa]">
                      {getCurrentVnYear()}
                    </span>{' '}
                    nếu không khai báo.
                  </p>
                  <button
                    className="inline-flex items-center h-7 px-2.5 rounded-md text-[11px] font-medium border border-[#3a3a3a] text-[#a1a1aa] hover:text-[#86efac] hover:border-[#86efac]/50 transition-colors"
                    onClick={() => setIntroducerInput(INTRODUCER_PLACEHOLDER)}
                  >
                    Điền ví dụ
                  </button>
                </div>
              </InnerPanel>

              <InnerPanel
                label={`Parsed (${introducer.entries.length})`}
                accent="green"
              >
                {introducer.entries.length === 0 ? (
                  <p className="text-xs text-[#71717a]">
                    Chưa có dòng nào hợp lệ.
                  </p>
                ) : (
                  <div className="max-h-40 overflow-auto -mx-0.5">
                    <table className="w-full text-[11px]">
                      <thead className="text-[#71717a] sticky top-0 bg-[#1a1a1a]">
                        <tr className="text-left">
                          <th className="font-medium pb-1.5 pr-2">Code</th>
                          <th className="font-medium pb-1.5 pr-2">
                            Ngày (+7)
                          </th>
                          <th className="font-medium pb-1.5">UTC range</th>
                        </tr>
                      </thead>
                      <tbody className="font-mono text-[#e4e4e7]">
                        {introducer.entries.map((e) => {
                          const { from, to } = getDayRangeVn(
                            e.y,
                            e.m - 1,
                            e.d,
                          )
                          return (
                            <tr
                              key={`${e.code}-${e.y}-${e.m}-${e.d}`}
                              className="border-t border-[#2a2a2a]"
                            >
                              <td className="py-1.5 pr-2 text-[#86efac]">
                                {e.code}
                              </td>
                              <td className="py-1.5 pr-2 text-white">
                                {String(e.d).padStart(2, '0')}/
                                {String(e.m).padStart(2, '0')}/{e.y}
                              </td>
                              <td className="py-1.5 text-[#a1a1aa]">
                                {from.toISOString().slice(0, 19)}Z
                                <br />
                                {to.toISOString().slice(0, 19)}Z
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {introducer.invalid.length > 0 && (
                  <div className="mt-2 rounded bg-[#fcd34d]/10 border border-[#fcd34d]/40 px-2 py-1.5 text-[11px] text-[#fcd34d]">
                    Bỏ qua {introducer.invalid.length} dòng không nhận diện
                    được ngày: {introducer.invalid.slice(0, 3).join('; ')}
                    {introducer.invalid.length > 3 ? '…' : ''}
                  </div>
                )}
              </InnerPanel>
            </div>

            <div className="mt-3">
              <CodeBlock code={introducerQuery} />
            </div>
          </SectionCard>

          <footer className="pt-2 pb-4 text-[11px] text-[#71717a]">
            Tip: query có thể chạy thẳng trong{' '}
            <code className="text-[#a1a1aa]">mongosh</code>. Trên Compass
            cần bỏ <code className="text-[#a1a1aa]">ISODate(...)</code> →
            dùng date picker.
          </footer>
        </main>
      </div>
    </div>
  )
}

type Tone = 'blue' | 'cyan' | 'pink' | 'violet' | 'green'

const TONE_BADGE: Record<Tone, string> = {
  blue: 'bg-[#60a5fa]/15 text-[#60a5fa] border-[#60a5fa]/30',
  cyan: 'bg-[#22d3ee]/15 text-[#22d3ee] border-[#22d3ee]/30',
  pink: 'bg-[#f472b6]/15 text-[#f472b6] border-[#f472b6]/30',
  violet: 'bg-[#a78bfa]/15 text-[#a78bfa] border-[#a78bfa]/30',
  green: 'bg-[#86efac]/15 text-[#86efac] border-[#86efac]/30',
}

const TONE_STRIPE: Record<Tone, string> = {
  blue: 'from-[#60a5fa] to-[#3b82f6]',
  cyan: 'from-[#22d3ee] to-[#06b6d4]',
  pink: 'from-[#f472b6] to-[#ec4899]',
  violet: 'from-[#a78bfa] to-[#7c5cff]',
  green: 'from-[#86efac] to-[#22c55e]',
}

const TONE_INNER_BORDER: Record<Tone, string> = {
  blue: 'focus-within:border-[#60a5fa]/60',
  cyan: 'focus-within:border-[#22d3ee]/60',
  pink: 'focus-within:border-[#f472b6]/60',
  violet: 'focus-within:border-[#a78bfa]/60',
  green: 'focus-within:border-[#86efac]/60',
}

function SectionCard({
  number,
  tone,
  title,
  subtitle,
  rightSlot,
  children,
  highlight,
  fill,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  number: number
  tone: Tone
  title: string
  subtitle?: React.ReactNode
  rightSlot?: React.ReactNode
  children?: React.ReactNode
  highlight?: boolean
  /**
   * When true, the card stretches to fill its grid cell height and the
   * children area flexes so a `fill` child (e.g. CodeBlock) can take
   * the remaining vertical space.
   */
  fill?: boolean
  onDragOver?: (e: React.DragEvent<HTMLDivElement>) => void
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>) => void
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void
}) {
  return (
    <section
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={[
        'relative overflow-hidden rounded-xl bg-[#252526] border transition-all duration-150',
        'shadow-[0_2px_12px_rgba(0,0,0,0.35)]',
        fill ? 'h-full flex flex-col' : '',
        highlight
          ? 'border-[#a78bfa]/60 bg-[#2a2640]'
          : 'border-[#3a3a3a] hover:border-[#4a4a4a]',
      ].join(' ')}
    >
      <div
        className={[
          'absolute top-0 left-0 h-full w-[3px] bg-gradient-to-b',
          TONE_STRIPE[tone],
        ].join(' ')}
      />
      <div
        className={[
          'p-5 pl-6 space-y-4',
          fill ? 'flex-1 flex flex-col min-h-0' : '',
        ].join(' ')}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span
              className={[
                'inline-flex items-center justify-center h-7 w-7 rounded-md text-[12px] font-semibold border shrink-0',
                TONE_BADGE[tone],
              ].join(' ')}
            >
              {number}
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-white leading-tight">
                {title}
              </p>
              {subtitle && (
                <p className="text-xs text-[#a1a1aa] mt-1 leading-relaxed">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {rightSlot}
        </div>
        {children}
      </div>
    </section>
  )
}

function InnerPanel({
  label,
  accent,
  children,
}: {
  label: string
  accent: Tone
  children: React.ReactNode
}) {
  return (
    <div
      className={[
        'rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] p-3 transition-colors',
        TONE_INNER_BORDER[accent],
      ].join(' ')}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#71717a] mb-2">
        {label}
      </p>
      {children}
    </div>
  )
}

function CodeMark({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1 py-0.5 rounded bg-[#1a1a1a] border border-[#2a2a2a] text-[#fbbf24] font-mono text-[11px]">
      {children}
    </code>
  )
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string
  value: number
  accent: 'slate' | 'cyan' | 'amber' | 'green'
}) {
  const valueColor = {
    slate: 'text-white',
    cyan: 'text-[#22d3ee]',
    amber: 'text-[#fcd34d]',
    green: 'text-[#86efac]',
  }[accent]
  const bgRing = {
    slate: 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.04)]',
    cyan: 'shadow-[inset_0_0_0_1px_rgba(34,211,238,0.12)]',
    amber: 'shadow-[inset_0_0_0_1px_rgba(252,211,77,0.12)]',
    green: 'shadow-[inset_0_0_0_1px_rgba(134,239,172,0.12)]',
  }[accent]
  return (
    <div
      className={[
        'rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] p-3',
        bgRing,
      ].join(' ')}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[#71717a]">
        {label}
      </p>
      <p
        className={[
          'mt-1 text-2xl font-semibold font-mono tabular-nums',
          valueColor,
        ].join(' ')}
      >
        {value.toLocaleString()}
      </p>
    </div>
  )
}

function CodeBlock({
  code,
  fill,
}: {
  code: string
  /**
   * When true, the block grows to fill its flex parent (used when the
   * SectionCard is also marked `fill` so two side-by-side cards align
   * to the taller one's height).
   */
  fill?: boolean
}) {
  return (
    <pre
      className={[
        'mt-4 overflow-auto rounded-lg bg-[#0f0f0f] border border-[#2a2a2a] p-4 text-[12px] leading-relaxed font-mono text-[#e4e4e7] whitespace-pre',
        fill ? 'flex-1 min-h-[200px]' : 'max-h-[420px]',
      ].join(' ')}
    >
      <code>{code}</code>
    </pre>
  )
}

function CopyButton({
  text,
  disabled,
}: {
  text: string
  disabled?: boolean
}) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // clipboard might be unavailable on http
    }
  }
  return (
    <button
      onClick={copy}
      disabled={disabled}
      className={[
        'inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-xs font-medium border transition-all shrink-0',
        copied
          ? 'bg-[#86efac]/15 border-[#86efac]/60 text-[#86efac]'
          : 'bg-[#1a1a1a] border-[#3a3a3a] text-[#a1a1aa] hover:text-white hover:border-[#5a5a5a] hover:bg-[#222]',
        disabled
          ? 'opacity-40 cursor-not-allowed hover:bg-[#1a1a1a] hover:border-[#3a3a3a] hover:text-[#a1a1aa]'
          : '',
      ].join(' ')}
    >
      {copied ? <CheckGlyph /> : <CopyGlyph />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function ShieldGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M8 1.5 2.5 3.5v4c0 3.2 2.4 6 5.5 7 3.1-1 5.5-3.8 5.5-7v-4L8 1.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="m5.8 8.1 1.6 1.6L10.4 6.7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function UploadGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden>
      <path
        d="M8 2v8M4.5 5.5 8 2l3.5 3.5M3 12v1.5h10V12"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CopyGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <rect
        x="5"
        y="5"
        width="8"
        height="9"
        rx="1.2"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M3 11V3.2C3 2.54 3.54 2 4.2 2H11"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  )
}

function CheckGlyph() {
  return (
    <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden>
      <path
        d="m3.5 8.5 3 3 6-7"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="none"
      className="h-3 w-3 transition-transform group-open:rotate-90"
      aria-hidden
    >
      <path
        d="m6 4 4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
