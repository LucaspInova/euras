/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState } from 'react'
import { normalizeRole } from '../lib/authRoles'
import { isTransientRequestError, runWithRetries, withRequestTimeout } from '../lib/requestGuards'
import { ensureFreshSession, supabase } from '../lib/supabase'

const AuthContext = createContext(null)
const euras = supabase.schema('euras')
const PROFILE_COLUMNS = 'id, nome_completo, email, telefone, campus, url_avatar, papel'
const PROFILE_COLUMNS_WITH_AUTH = `${PROFILE_COLUMNS}, auth_user_id`
const AUTH_BOOTSTRAP_TIMEOUT_MS = 12000
const PROFILE_LOAD_TIMEOUT_MS = 10000
const SIGN_IN_TIMEOUT_MS = 12000
const STUDENT_LOGIN_PREPARE_TIMEOUT_MS = 15000
const PREPARE_STUDENT_LOGIN_FUNCTION = 'preparar-login-aluno-app'

async function runGuardedAuthTask(
  task,
  {
    timeoutMs = AUTH_BOOTSTRAP_TIMEOUT_MS,
    timeoutMessage = 'Tempo limite ao validar sua sessão. Tente novamente.',
    attempts = 2,
  } = {},
) {
  return runWithRetries(
    () =>
      withRequestTimeout(Promise.resolve().then(task), {
        timeoutMs,
        message: timeoutMessage,
      }),
    {
      attempts,
      retryDelayMs: 450,
      shouldRetry: isTransientRequestError,
    },
  )
}

function isIrrecoverableSessionError(error) {
  const message = String(error?.message ?? '').toLowerCase()

  return (
    message.includes('refresh token') ||
    message.includes('invalid refresh token') ||
    message.includes('session not found') ||
    message.includes('session missing') ||
    message.includes('invalid_grant')
  )
}

function isMissingColumnError(error, columnName) {
  const joined = [
    String(error?.message ?? ''),
    String(error?.details ?? ''),
    String(error?.hint ?? ''),
  ]
    .join(' ')
    .toLowerCase()

  return joined.includes(String(columnName ?? '').toLowerCase()) && joined.includes('column')
}

function normalizeEmail(value) {
  return String(value ?? '').trim().toLowerCase()
}

function isInvalidLoginCredentialsError(error) {
  return String(error?.message ?? '').toLowerCase().includes('invalid login credentials')
}

function getPrepareStudentLoginMessage(code) {
  if (code === 'function_not_found') {
    return 'Funcao de login de aluno nao publicada no Supabase.'
  }

  if (code === 'function_error' || code === 'service_error') {
    return 'Erro na funcao de login de aluno. Verifique as secrets no Supabase.'
  }

  if (code === 'duplicate_profile_email' || code === 'duplicate_auth_email' || code === 'duplicate_auth_link') {
    return 'Este e-mail possui vinculo duplicado. Fale com o administrador.'
  }

  if (code === 'invalid_auth_link') {
    return 'Cadastro do aluno precisa ser revisado pelo administrador.'
  }

  if (code === 'student_not_allowed') {
    return 'Aluno nao liberado para acesso ou e-mail invalido.'
  }

  return 'Nao foi possivel liberar o acesso do aluno agora. Tente novamente.'
}

function createPrepareStudentLoginError(code, message) {
  const error = new Error(message || getPrepareStudentLoginMessage(code))
  error.code = code || 'student_login_prepare_failed'
  return error
}

async function getPrepareStudentLoginErrorCode(error) {
  if (!error) return ''

  try {
    const context = error.context
    if (context?.clone && typeof context.clone === 'function') {
      const body = await context.clone().json()
      if (body?.code === 'NOT_FOUND') return 'function_not_found'
      if (body?.code) return 'function_error'
    }
  } catch {
    // Ignore parsing errors and fall back to the message.
  }

  const message = String(error?.message ?? '').toLowerCase()
  if (message.includes('not found')) return 'function_not_found'
  return 'function_error'
}

async function loadProfileById(profileId, columns = PROFILE_COLUMNS) {
  if (!profileId) return null

  const response = await euras
    .from('perfis')
    .select(columns)
    .eq('id', profileId)
    .limit(1)
    .maybeSingle()

  if (response.error) {
    throw response.error
  }

  return response.data ?? null
}

async function loadProfileByEmail(email) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return null

  const exactResponse = await euras
    .from('perfis')
    .select(PROFILE_COLUMNS)
    .eq('email', normalizedEmail)
    .limit(1)
    .maybeSingle()

  if (exactResponse.error) {
    throw exactResponse.error
  }

  if (exactResponse.data) {
    return exactResponse.data
  }

  const fallbackResponse = await euras
    .from('perfis')
    .select(PROFILE_COLUMNS)
    .ilike('email', normalizedEmail)
    .limit(1)
    .maybeSingle()

  if (fallbackResponse.error) {
    throw fallbackResponse.error
  }

  return fallbackResponse.data ?? null
}

async function loadAuthenticatedProfile(authUser) {
  const authUserId = authUser?.id
  const authUserEmail = normalizeEmail(authUser?.email)

  if (!authUserId) return null

  const profileByAuthId = await euras
    .from('perfis')
    .select(PROFILE_COLUMNS_WITH_AUTH)
    .eq('auth_user_id', authUserId)
    .limit(1)
    .maybeSingle()

  if (profileByAuthId.error && isMissingColumnError(profileByAuthId.error, 'auth_user_id')) {
    const legacyProfileById = await loadProfileById(authUserId)
    if (legacyProfileById) {
      return legacyProfileById
    }

    return loadProfileByEmail(authUserEmail)
  }

  if (profileByAuthId.error) {
    throw profileByAuthId.error
  }

  if (profileByAuthId.data) {
    return profileByAuthId.data
  }

  const profileByLegacyId = await loadProfileById(authUserId, PROFILE_COLUMNS_WITH_AUTH)
  if (profileByLegacyId) {
    return profileByLegacyId
  }

  return loadProfileByEmail(authUserEmail)
}

async function prepareStudentLoginIfNeeded(email) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return { ok: false, code: 'invalid_email' }

  const { data, error } = await runGuardedAuthTask(
    () =>
      supabase.functions.invoke(PREPARE_STUDENT_LOGIN_FUNCTION, {
        body: { email: normalizedEmail },
      }),
    {
      attempts: 1,
      timeoutMs: STUDENT_LOGIN_PREPARE_TIMEOUT_MS,
      timeoutMessage: 'Tempo limite ao preparar login de aluno. Tente novamente.',
    },
  )

  if (error || !data?.ok) {
    const code = data?.code || (await getPrepareStudentLoginErrorCode(error))
    return {
      ok: false,
      code,
      error: createPrepareStudentLoginError(code, data?.message),
    }
  }

  return { ok: true }
}

async function updateLastLoginIfAllowed(profileId) {
  if (!profileId) return

  const { error } = await euras
    .from('perfis')
    .update({ ultimo_login_em: new Date().toISOString() })
    .eq('id', profileId)

  if (error) {
    console.info(
      'Não foi possível atualizar euras.perfis.ultimo_login_em por RLS/permissão. Fluxo segue normalmente.',
      error.message,
    )
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoading, setProfileLoading] = useState(true)
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    let isMounted = true
    let refreshingOnForeground = false

    async function syncProfileForUser(nextUser) {
      if (!nextUser?.id) {
        if (isMounted) {
          setProfile(null)
          setProfileLoading(false)
        }
        return null
      }

      if (isMounted) {
        setProfileLoading(true)
      }

      try {
        const nextProfile = await runGuardedAuthTask(() => loadAuthenticatedProfile(nextUser), {
          timeoutMs: PROFILE_LOAD_TIMEOUT_MS,
          timeoutMessage: 'Tempo limite ao carregar seu perfil. Tente novamente.',
        })

        if (!isMounted) return nextProfile

        setProfile(nextProfile)

        if (!nextProfile) {
          setAuthError(
            'Seu login foi autenticado, mas não encontramos um perfil associado. Contate o suporte.',
          )
        }

        return nextProfile
      } catch (error) {
        if (!isMounted) return null

        setProfile(null)
        setAuthError(error?.message ?? 'Não foi possível carregar seu perfil.')
        return null
      } finally {
        if (isMounted) {
          setProfileLoading(false)
        }
      }
    }

    async function applySession(nextSession) {
      if (!isMounted) return null

      const nextUser = nextSession?.user ?? null
      setSession(nextSession ?? null)
      setUser(nextUser)
      setAuthError('')

      const nextProfile = await syncProfileForUser(nextUser)

      if (isMounted) {
        setLoading(false)
      }

      return nextProfile
    }

    async function bootstrapSession() {
      let sessionResponse = null

      try {
        sessionResponse = await runGuardedAuthTask(() => supabase.auth.getSession(), {
          timeoutMessage: 'Tempo limite ao recuperar a sessão atual.',
        })
      } catch (error) {
        if (!isMounted) return

        setSession(null)
        setUser(null)
        setProfile(null)
        setAuthError(error?.message ?? 'Não foi possível recuperar a sessão atual.')
        setProfileLoading(false)
        setLoading(false)
        return
      }

      const { data, error } = sessionResponse ?? {}

      if (!isMounted) return

      if (error) {
        setSession(null)
        setUser(null)
        setProfile(null)
        setAuthError('Não foi possível recuperar a sessão atual.')
        setProfileLoading(false)
        setLoading(false)
        return
      }

      let verifiedSession = data.session ?? null

      if (verifiedSession) {
        try {
          verifiedSession = await ensureFreshSession({
            minimumValiditySeconds: 120,
            verifyServerSession: true,
          })
        } catch (verifyError) {
          setSession(null)
          setUser(null)
          setProfile(null)
          setAuthError(verifyError?.message ?? 'Sessao expirada. Faca login novamente.')
          setProfileLoading(false)
          setLoading(false)
          return
        }
      }

      await applySession(verifiedSession)
    }

    async function refreshSessionWhenForeground() {
      if (!isMounted || refreshingOnForeground) return

      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return
      }

      refreshingOnForeground = true

      try {
        const refreshedSession = await ensureFreshSession({
          minimumValiditySeconds: 120,
          verifyServerSession: true,
        })
        if (!isMounted) return

        // Mantém sessão e usuário sincronizados sem reacender loading global/perfil
        // para evitar "flash" de tela ao alternar abas do navegador.
        setSession(refreshedSession ?? null)
        setUser(refreshedSession?.user ?? null)
        setLoading(false)
        setAuthError('')
      } catch (error) {
        if (!isMounted) return

        if (isIrrecoverableSessionError(error)) {
          setSession(null)
          setUser(null)
          setProfile(null)
        }

        setProfileLoading(false)
        setLoading(false)
        setAuthError(error?.message ?? 'Não foi possível renovar a sessão.')
      } finally {
        refreshingOnForeground = false
      }
    }

    bootstrapSession()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      window.setTimeout(async () => {
        if (!isMounted) return

        if (event === 'INITIAL_SESSION') {
          return
        }

        if (event === 'TOKEN_REFRESHED') {
          setSession(nextSession ?? null)
          setUser(nextSession?.user ?? null)
          setLoading(false)
          return
        }

        const resolvedProfile = await applySession(nextSession ?? null)

        if (event === 'SIGNED_IN' && nextSession?.user?.id) {
          await updateLastLoginIfAllowed(resolvedProfile?.id ?? nextSession.user.id)
        }
      }, 0)
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

    try {
      const normalizedEmail = normalizeEmail(email)
      const signInPayload = {
        email: normalizedEmail || email,
        password,
      }

      const attemptPasswordSignIn = () =>
        runGuardedAuthTask(
          () => supabase.auth.signInWithPassword(signInPayload),
          {
            timeoutMs: SIGN_IN_TIMEOUT_MS,
            timeoutMessage: 'Tempo limite ao tentar fazer login. Verifique sua conexão e tente novamente.',
          },
        )

      const firstAttempt = await attemptPasswordSignIn()

      if (!firstAttempt.error || !isInvalidLoginCredentialsError(firstAttempt.error)) {
        return firstAttempt
      }

      const prepareStudentLogin = await prepareStudentLoginIfNeeded(normalizedEmail)

      if (!prepareStudentLogin.ok) {
        if (prepareStudentLogin.code === 'student_not_allowed' || prepareStudentLogin.code === 'invalid_email') {
          return firstAttempt
        }

        return { data: null, error: prepareStudentLogin.error }
      }

      const retryAttempt = await attemptPasswordSignIn()

      return retryAttempt
    } catch (error) {
      return { data: null, error }
    }
  }

  const signInWithGoogle = async () => {
    setAuthError('')

    try {
      const { data, error } = await runGuardedAuthTask(
        () =>
          supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: `${window.location.origin}/login`,
            },
          }),
        {
          timeoutMs: SIGN_IN_TIMEOUT_MS,
          timeoutMessage:
            'Tempo limite ao iniciar o login com Google. Verifique sua conexão e tente novamente.',
        },
      )

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  const resetPasswordForEmail = async (email) => {
    try {
      const { data, error } = await runGuardedAuthTask(
        () =>
          supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin,
          }),
        {
          timeoutMessage:
            'Tempo limite ao solicitar redefinição de senha. Verifique sua conexão e tente novamente.',
        },
      )

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  const updatePassword = async (password) => {
    setAuthError('')

    try {
      const { data, error } = await runGuardedAuthTask(
        () =>
          supabase.auth.updateUser({
            password,
          }),
        {
          timeoutMs: SIGN_IN_TIMEOUT_MS,
          timeoutMessage:
            'Tempo limite ao alterar a senha. Verifique sua conexao e tente novamente.',
        },
      )

      return { data, error }
    } catch (error) {
      return { data: null, error }
    }
  }

  const refreshProfile = async () => {
    if (!user?.id) {
      setProfile(null)
      return null
    }

    setProfileLoading(true)
    setAuthError('')

    try {
      const nextProfile = await runGuardedAuthTask(() => loadAuthenticatedProfile(user), {
        timeoutMs: PROFILE_LOAD_TIMEOUT_MS,
        timeoutMessage: 'Tempo limite ao atualizar seu perfil. Tente novamente.',
      })
      setProfile(nextProfile)
      return nextProfile
    } catch (error) {
      setProfile(null)
      setAuthError(error?.message ?? 'Não foi possível atualizar seu perfil.')
      throw error
    } finally {
      setProfileLoading(false)
    }
  }

  const updateProfile = async ({ name, phone }) => {
    if (!user?.id) {
      throw new Error('Sessão expirada. Faça login novamente.')
    }

    const normalizedName = String(name ?? '').trim()
    const normalizedPhone = String(phone ?? '').trim()

    if (!normalizedName) {
      throw new Error('Informe o nome de usuário.')
    }

    setProfileLoading(true)
    setAuthError('')

    const payload = {
      nome_completo: normalizedName,
      telefone: normalizedPhone,
    }

    try {
      const targetProfileId = profile?.id ?? user.id
      let response = await euras
        .from('perfis')
        .update(payload)
        .eq('id', targetProfileId)
        .select(PROFILE_COLUMNS)
        .maybeSingle()

      if (response.error) {
        throw response.error
      }

      if (!response.data && targetProfileId !== user.id) {
        response = await euras
          .from('perfis')
          .update(payload)
          .eq('id', user.id)
          .select(PROFILE_COLUMNS)
          .maybeSingle()

        if (response.error) {
          throw response.error
        }
      }

      if (!response.data) {
        const fallbackByAuthId = await euras
          .from('perfis')
          .update(payload)
          .eq('auth_user_id', user.id)
          .select(PROFILE_COLUMNS)
          .maybeSingle()

        if (fallbackByAuthId.error && !isMissingColumnError(fallbackByAuthId.error, 'auth_user_id')) {
          throw fallbackByAuthId.error
        }

        response = fallbackByAuthId.error ? response : fallbackByAuthId
      }

      if (!response.data) {
        throw new Error('Perfil não encontrado.')
      }

      setProfile(response.data)

      const { data: updatedAuthData, error: updateAuthError } = await supabase.auth.updateUser({
        data: {
          ...(user?.user_metadata ?? {}),
          name: normalizedName,
          full_name: normalizedName,
        },
      })

      if (updateAuthError) {
        console.info('Não foi possível atualizar os metadados do usuário no Auth.', updateAuthError)
      } else if (updatedAuthData?.user) {
        setUser(updatedAuthData.user)
      }

      return response.data
    } catch (error) {
      setAuthError(error?.message ?? 'Não foi possível atualizar seu perfil.')
      throw error
    } finally {
      setProfileLoading(false)
    }
  }

  const createTimeoutError = () => {
    const error = new Error('Tempo limite para encerrar a sessão excedido.')
    error.name = 'AuthSignOutTimeoutError'
    return error
  }

  const signOut = async () => {
    const timeoutMs = 8000

    setSession(null)
    setUser(null)
    setProfile(null)
    setProfileLoading(false)
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
    profile,
    role: normalizeRole(profile?.papel),
    loading,
    profileLoading,
    authError,
    signInWithPassword,
    signInWithGoogle,
    resetPasswordForEmail,
    updatePassword,
    refreshProfile,
    updateProfile,
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
