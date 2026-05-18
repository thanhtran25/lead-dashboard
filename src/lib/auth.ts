import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AuthUser, FirebaseLoginResponse } from './types'
import { loginWithFirebase } from './api'

interface AuthState {
  user: AuthUser | null
  status: 'idle' | 'authenticating' | 'authenticated' | 'error'
  error: string | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  isExpired: () => boolean
}

function buildUser(resp: FirebaseLoginResponse): AuthUser {
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

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      status: 'idle',
      error: null,
      async login(email, password) {
        set({ status: 'authenticating', error: null })
        try {
          const resp = await loginWithFirebase({ email, password })
          set({
            user: buildUser(resp),
            status: 'authenticated',
            error: null,
          })
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Đăng nhập thất bại.'
          set({ status: 'error', error: message })
          throw err
        }
      },
      logout() {
        set({ user: null, status: 'idle', error: null })
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
        if (state?.user) state.status = 'authenticated'
      },
    },
  ),
)
