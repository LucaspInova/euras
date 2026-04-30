import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getHomePathByRole, isSupportedRole } from "../lib/authRoles";

function EyeIcon({ visible }) {
  if (visible) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <circle
          cx="12"
          cy="12"
          r="3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M3 3l18 18M9.5 9.6A3 3 0 0 0 12 15a3 3 0 0 0 2.5-5.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M5.6 7.2A12.7 12.7 0 0 0 2 12s3.5 6 10 6a10.8 10.8 0 0 0 4.8-1.1M10.2 6.2A10.7 10.7 0 0 1 12 6c6.5 0 10 6 10 6a13 13 0 0 1-2.8 3.6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

export default function Login() {
  const navigate = useNavigate();
  const { user, role, loading, profileLoading, authError, signInWithPassword, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    if (!loading && !profileLoading && user && isSupportedRole(role)) {
      navigate(getHomePathByRole(role), { replace: true });
    }
  }, [user, role, loading, profileLoading, navigate]);

  const roleAccessError =
    !loading && !profileLoading && user && !authError && role && !isSupportedRole(role)
      ? "Seu usuário não possui permissão para acessar este painel."
      : "";
  const profileError =
    !loading && !profileLoading && user && authError
      ? authError
      : "";

  const handleNoAction = (event) => {
    event.preventDefault();
  };

  const handlePasswordLogin = async (event) => {
    event.preventDefault();
    setFormError("");

    if (!email || !password) {
      setFormError("Preencha e-mail e senha para continuar.");
      return;
    }

    setIsLoading(true);

    const { error } = await signInWithPassword({
      email: email.trim(),
      password,
    });

    setIsLoading(false);

    if (error) {
      const rawMessage = error.message?.toLowerCase() || "";

      if (rawMessage.includes("invalid login credentials")) {
        setFormError("E-mail ou senha invalidos.");
        return;
      }

      if (rawMessage.includes("email not confirmed")) {
        setFormError("Seu e-mail ainda não foi confirmado. Confirme o e-mail para concluir o login.");
        return;
      }

      if (rawMessage.includes("email not verified")) {
        setFormError("Seu e-mail ainda não foi verificado. Verifique sua caixa de entrada.");
        return;
      }

      if (rawMessage.includes("too many requests")) {
        setFormError("Muitas tentativas de login. Aguarde um instante e tente novamente.");
        return;
      }

      if (error.message) {
        setFormError(error.message);
        return;
      }

      setFormError("Não foi possível fazer login agora.");
      return;
    }

  };

  const handleGoogleLogin = async () => {
    setFormError("");
    setIsLoading(true);

    const { error } = await signInWithGoogle();

    setIsLoading(false);

    if (error) {
      setFormError(error.message || "Não foi possível iniciar o login com Google.");
    }
  };

  return (
    <main className="login-page">
      <section className="login-card" aria-label="Login">
        <h1 className="login-title">EURAS</h1>

        <form className="login-form" onSubmit={handlePasswordLogin}>
          <label className="sr-only" htmlFor="email">
            E-mail
          </label>
          <input
            className="login-input"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="E-mail..."
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <div className="password-field">
            <label className="sr-only" htmlFor="password">
              Senha
            </label>
            <input
              className="login-input login-input-password"
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Senha..."
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <button
              className="toggle-password-button"
              type="button"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              onClick={() => setShowPassword((current) => !current)}
            >
              <EyeIcon visible={showPassword} />
            </button>
          </div>

          {(formError || profileError || roleAccessError) && (
            <p className="form-message form-message-error">
              {formError || profileError || roleAccessError}
            </p>
          )}

          <button className="primary-button" type="submit" disabled={isLoading}>
            {isLoading ? "Entrando..." : "Continuar"}
          </button>

          <span className="login-divider">ou</span>

          <button
            className="secondary-button"
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
          >
            <span aria-hidden="true" className="google-mark">
              G
            </span>
            Continuar com o Google
          </button>

          <button
            className="forgot-password-link"
            type="button"
            onClick={handleNoAction}
          >
            Esqueci minha senha.
          </button>
        </form>
      </section>
    </main>
  );
}
