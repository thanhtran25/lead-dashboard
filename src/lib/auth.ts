import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  AuthUser,
  FirebaseLoginResponse,
  FirebaseRefreshResponse,
} from './types'
import { loginWithFirebase, refreshFirebaseToken } from './api'

interface AuthState {
  user: AuthUser | null
  status: 'idle' | 'authenticating' | 'authenticated' | 'error'
  /** True while a background token refresh is in flight. */
  refreshing: boolean
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<boolean>
  scheduleRefresh: () => void
  isExpired: () => boolean
}

function userFromLogin(resp: FirebaseLoginResponse): AuthUser {
  const email = resp.email ?? ''
  const username = email ? email.split('@')[0] : 'user'
  const expiresInSec = Number(resp.expiresIn ?? 3600)
  return {
    email,
    username,
    idToken: resp.idToken,
    refreshToken: resp.refreshToken,
    expiresAt: Date.now() + expiresInSec * 1000,
  }
}

function userFromRefresh(
  prev: AuthUser,
  resp: FirebaseRefreshResponse,
): AuthUser {
  const expiresInSec = Number(resp.expires_in ?? 3600)
  return {
    ...prev,
    idToken: resp.id_token,
    refreshToken: resp.refresh_token || prev.refreshToken,
    expiresAt: Date.now() + expiresInSec * 1000,
  }
}

// Refresh ~5 minutes before the token would expire — gives plenty of slack
// for a slow network and one retry without the user noticing anything.
const REFRESH_LEAD_MS = 5 * 60 * 1000

// Module-level timer so we don't have to put it on the store (which would
// then serialise into localStorage). One shared timer is enough since the
// app is a single SPA instance.
let refreshTimer: ReturnType<typeof setTimeout> | null = null
let refreshInFlight: Promise<boolean> | null = null

function clearTimer() {
  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      status: 'idle',
      refreshing: false,
      error: null,

      async login(email, password) {
        set({ status: 'authenticating', error: null })
        try {
          const resp = await loginWithFirebase({ email, password })
          set({
            user: userFromLogin(resp),
            status: 'authenticated',
            error: null,
          })
          get().scheduleRefresh()
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Đăng nhập thất bại.'
          set({ status: 'error', error: message })
          throw err
        }
      },

      logout() {
        clearTimer()
        refreshInFlight = null
        set({ user: null, status: 'idle', refreshing: false, error: null })
      },

      async refresh() {
        // Coalesce concurrent refreshes so we never fire two requests in
        // parallel (e.g. the timer fires while ProtectedRoute also triggers
        // a refresh on mount).
        if (refreshInFlight) return refreshInFlight

        const user = get().user
        if (!user?.refreshToken) {
          set({ user: null, refreshing: false })
          return false
        }

        set({ refreshing: true })
        refreshInFlight = (async () => {
          try {
            const resp = await refreshFirebaseToken(user.refreshToken!)
            set({
              user: userFromRefresh(user, resp),
              status: 'authenticated',
              refreshing: false,
              error: null,
            })
            get().scheduleRefresh()
            return true
          } catch {
            // Refresh token rejected — most likely revoked or simply too old.
            // Drop the session so the user is prompted to sign in again.
            clearTimer()
            set({
              user: null,
              status: 'idle',
              refreshing: false,
              error: null,
            })
            return false
          } finally {
            refreshInFlight = null
          }
        })()

        return refreshInFlight
      },

      scheduleRefresh() {
        clearTimer()
        const user = get().user
        if (!user) return

        const delay = Math.max(0, user.expiresAt - Date.now() - REFRESH_LEAD_MS)
        refreshTimer = setTimeout(() => {
          void get().refresh()
        }, delay)
      },

      isExpired() {
        const user = get().user
        if (!user) return true
        return Date.now() >= user.expiresAt
      },
    }),
    {
      name: 'leadscope.auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ user: state.user }),
      onRehydrateStorage: () => (state) => {
        if (!state?.user) return
        state.status = 'authenticated'
        // Defer the API call to the next tick so React has a chance to
        // mount the providers before we poke at network / state.
        queueMicrotask(() => {
          const store = useAuth.getState()
          if (!store.user?.refreshToken) return
          // If the saved token has already expired (or is about to within
          // the lead window) refresh right now; otherwise just (re)arm the
          // timer for when it does.
          const needsImmediate =
            store.user.expiresAt - Date.now() <= REFRESH_LEAD_MS
          if (needsImmediate) {
            void store.refresh()
          } else {
            store.scheduleRefresh()
          }
        })
      },
    },
  ),
)
