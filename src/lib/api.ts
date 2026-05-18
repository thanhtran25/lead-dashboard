import { env, assertEnvForApi, assertEnvForLogin, statsBaseUrl } from './env'
import type {
  FirebaseErrorResponse,
  FirebaseLoginResponse,
  StatsFilters,
} from './types'

const FIREBASE_LOGIN_URL =
  'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword'

export class ApiError extends Error {
  status: number
  body: unknown

  constructor(message: string, status: number, body: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

function humanizeFirebaseError(msg?: string): string {
  if (!msg) return 'Đăng nhập thất bại.'
  const map: Record<string, string> = {
    EMAIL_NOT_FOUND: 'Email không tồn tại.',
    INVALID_PASSWORD: 'Mật khẩu không đúng.',
    INVALID_LOGIN_CREDENTIALS: 'Email hoặc mật khẩu không đúng.',
    USER_DISABLED: 'Tài khoản đã bị vô hiệu hoá.',
    TOO_MANY_ATTEMPTS_TRY_LATER: 'Quá nhiều lần thử. Vui lòng thử lại sau.',
    MISSING_PASSWORD: 'Vui lòng nhập mật khẩu.',
    INVALID_EMAIL: 'Email không hợp lệ.',
  }
  const key = msg.split(' ')[0]
  return map[key] ?? msg
}

export async function loginWithFirebase(params: {
  email: string
  password: string
}): Promise<FirebaseLoginResponse> {
  const envErr = assertEnvForLogin()
  if (envErr) throw new ApiError(envErr, 0, null)

  const url = `${FIREBASE_LOGIN_URL}?key=${encodeURIComponent(env.firebaseKey)}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      returnSecureToken: true,
      email: params.email,
      password: params.password,
      clientType: env.clientType,
    }),
  })

  const data = (await res.json().catch(() => null)) as
    | FirebaseLoginResponse
    | FirebaseErrorResponse
    | null

  if (!res.ok || !data || 'error' in data) {
    const err = (data as FirebaseErrorResponse | null)?.error
    throw new ApiError(humanizeFirebaseError(err?.message), res.status, data)
  }
  return data as FirebaseLoginResponse
}

export async function fetchLeadStats(
  filters: StatsFilters,
  idToken: string,
  signal?: AbortSignal,
): Promise<unknown> {
  const envErr = assertEnvForApi()
  if (envErr) throw new ApiError(envErr, 0, null)

  const params = new URLSearchParams()
  if (filters.channelTypes.length)
    params.set('channelTypes', filters.channelTypes.join(','))
  params.set('groupBy', filters.groupBy)
  params.set('from', filters.from)
  params.set('to', filters.to)

  const url = `${statsBaseUrl()}${env.statsPathPrefix}/leads?${params.toString()}`

  let res: Response
  try {
    res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${idToken}`,
        Accept: 'application/json',
      },
      signal,
    })
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause
    // Network-level failure — most often: backend unreachable from this
    // network, CORS preflight denied, or mixed-content blocked by the browser.
    const isMixed =
      url.startsWith('http://') &&
      typeof window !== 'undefined' &&
      window.location.protocol === 'https:'
    const hint = isMixed
      ? ' (page is HTTPS, backend is HTTP — browser chặn mixed content)'
      : ' (backend không reach được hoặc CORS bị từ chối)'
    throw new ApiError(`Không gọi được API stats${hint}.`, 0, cause)
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    let parsed: unknown = body
    try {
      parsed = JSON.parse(body)
    } catch {
      /* keep as text */
    }
    if (res.status === 401 || res.status === 403) {
      throw new ApiError('Phiên đăng nhập đã hết hạn.', res.status, parsed)
    }
    throw new ApiError(
      `Yêu cầu thống kê thất bại (${res.status}).`,
      res.status,
      parsed,
    )
  }
  return res.json()
}
