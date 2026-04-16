/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

async function updateLastLoginIfAllowed(userId) {
  if (!userId) return

  const { error } = await supabase
    .from('profiles')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', userId)

  if (error) {
    console.info(
      'Nao foi possivel atualizar last_login_at por RLS/permissao. Fluxo segue normalmente.',
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

    return () => {
      isMounted = false
      subscription.unsubscribe()
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

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    return { error }
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
