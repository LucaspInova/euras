/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { ensureFreshSession, supabase } from '../lib/supabase'

const AuthContext = createContext(null)
const euras = supabase.schema('euras')

function isIrrecoverableSessionError(error) {
  const message = String(error?.message ?? '').toLowerCase()

  return (
    message.includes('refresh token') ||
    message.includes('invalid refresh token') ||
    message.includes('session missing') ||
    message.includes('invalid_grant')
  )
}

async function updateLastLoginIfAllowed(userId) {
  if (!userId) return

  const { error } = await euras
    .from('perfis')
    .update({ ultimo_login_em: new Date().toISOString() })
    .eq('id', userId)

  if (error) {
    console.info(
      'Nao foi possivel atualizar euras.perfis.ultimo_login_em por RLS/permissao. Fluxo segue normalmente.',
      error.message,
    )
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let isMounted = true
    let refreshingOnForeground = false

    async function bootstrapSession() {
      const { data, error } = await supabase.auth.getSession()

      if (!isMounted) return

      if (error) {
        setSession(null)
        setUser(null)
        setAuthError('Nao foi possivel recuperar a sessao atual.')
      } else {
        setSession(data.session ?? null)
        setUser(data.session?.user ?? null)
      }

      setLoading(false)
    }

    async function refreshSessionWhenForeground() {
      if (!isMounted || refreshingOnForeground) return

      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return
      }

      refreshingOnForeground = true

      try {
        const refreshedSession = await ensureFreshSession({ minimumValiditySeconds: 120 })
        if (!isMounted) return

        setSession(refreshedSession)
        setUser(refreshedSession.user ?? null)
        setAuthError('')
      } catch (error) {
        if (!isMounted) return

        if (isIrrecoverableSessionError(error)) {
          setSession(null)
          setUser(null)
        }

        setAuthError(error?.message ?? 'Nao foi possivel renovar a sessao.')
      } finally {
        if (isMounted) {
          setLoading(false)
        }
        refreshingOnForeground = false
      }
    }

    bootstrapSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (!isMounted) return

      setSession(nextSession ?? null)
      setUser(nextSession?.user ?? null)
      setAuthError('')
      setLoading(false)

      if (event === 'SIGNED_IN' && nextSession?.user?.id) {
        await updateLastLoginIfAllowed(nextSession.user.id)
      }
    })

    const onFocus = () => {
      refreshSessionWhenForeground()
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshSessionWhenForeground()
      }
    }

    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      isMounted = false
      subscription.unsubscribe()
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  const signInWithPassword = async ({ email, password }) => {
    setAuthError('')
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { data, error }
  }

  const signInWithGoogle = async () => {
    setAuthError('')
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/dashboard`,
      },
    })
    return { data, error }
  }

  const resetPasswordForEmail = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    return { data, error }
  }

  const createTimeoutError = () => {
    const error = new Error('Tempo limite para encerrar a sessao excedido.')
    error.name = 'AuthSignOutTimeoutError'
    return error
  }

  const signOut = async () => {
    const timeoutMs = 8000

    setSession(null)
    setUser(null)
    setLoading(false)
    setAuthError('')

    try {
      const result = await Promise.race([
        supabase.auth.signOut(),
        new Promise((resolve) => {
          setTimeout(() => resolve({ error: createTimeoutError() }), timeoutMs)
        }),
      ])

      return { error: result?.error ?? null }
    } catch (error) {
      return { error }
    }
  }

  const value = {
    session,
    user,
    loading,
    authError,
    signInWithPassword,
    signInWithGoogle,
    resetPasswordForEmail,
    signOut,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider.')
  }

  return context
}
