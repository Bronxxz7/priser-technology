import {
  useEffect,
  useState,
} from "react";

import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
} from "lucide-react";

import {
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  iniciarSesion,
  recuperarPassword,
} from "../../services/authService";

import "./LoginAdmin.css";


function LoginAdmin() {
  const {
    usuario,
    perfil,
    cargando,
  } = useAuth();

  const navigate =
    useNavigate();

  const location =
    useLocation();

  const [
    correo,
    setCorreo,
  ] = useState("");

  const [
    password,
    setPassword,
  ] = useState("");

  const [
    verPassword,
    setVerPassword,
  ] = useState(false);

  const [
    enviando,
    setEnviando,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");

  const [
    mensaje,
    setMensaje,
  ] = useState("");


  const destino =
    location.state?.from ||
    "/admin";


  useEffect(() => {
    if (
      !cargando &&
      usuario &&
      perfil
    ) {
      navigate(
        destino,
        {
          replace: true,
        }
      );
    }
  }, [
    cargando,
    usuario,
    perfil,
    navigate,
    destino,
  ]);


  async function entrar(
    event
  ) {
    event.preventDefault();

    setError("");
    setMensaje("");

    try {
      setEnviando(true);

      await iniciarSesion(
        correo,
        password
      );

      navigate(
        destino,
        {
          replace: true,
        }
      );
    } catch (
      errorLogin
    ) {
      setError(
        errorLogin.message ||
          "No se pudo iniciar sesión."
      );
    } finally {
      setEnviando(false);
    }
  }


  async function recuperar() {
    setError("");
    setMensaje("");

    if (
      !correo.trim()
    ) {
      setError(
        "Escribe tu correo para recuperar la contraseña."
      );
      return;
    }

    try {
      setEnviando(true);

      await recuperarPassword(
        correo
      );

      setMensaje(
        "Se envió el enlace para restablecer la contraseña."
      );
    } catch {
      setError(
        "No se pudo enviar el correo de recuperación."
      );
    } finally {
      setEnviando(false);
    }
  }


  if (
    !cargando &&
    usuario &&
    perfil
  ) {
    return (
      <Navigate
        to="/admin"
        replace
      />
    );
  }


  return (
    <div className="login-admin-page">

      <div className="login-admin-card">

        <div className="login-admin-brand">
          <div className="login-admin-logo">
            P
          </div>

          <div>
            <h1>
              Priser Technology
            </h1>

            <p>
              Control de Tiendas
            </p>
          </div>
        </div>


        <div className="login-admin-title">
          <h2>
            Iniciar sesión
          </h2>

          <p>
            Ingresa con tu cuenta autorizada.
          </p>
        </div>


        <form
          onSubmit={entrar}
          className="login-admin-form"
        >

          <label>
            Correo electrónico

            <div className="login-admin-input">
              <Mail size={17} />

              <input
                type="email"
                autoComplete="username"
                value={correo}
                onChange={(event) =>
                  setCorreo(
                    event.target.value
                  )
                }
                placeholder="correo@empresa.com"
                required
              />
            </div>
          </label>


          <label>
            Contraseña

            <div className="login-admin-input">
              <LockKeyhole
                size={17}
              />

              <input
                type={
                  verPassword
                    ? "text"
                    : "password"
                }
                autoComplete="current-password"
                value={password}
                onChange={(event) =>
                  setPassword(
                    event.target.value
                  )
                }
                placeholder="Tu contraseña"
                required
              />

              <button
                type="button"
                className="login-admin-eye"
                onClick={() =>
                  setVerPassword(
                    (valor) =>
                      !valor
                  )
                }
                aria-label={
                  verPassword
                    ? "Ocultar contraseña"
                    : "Mostrar contraseña"
                }
              >
                {verPassword
                  ? <EyeOff size={17} />
                  : <Eye size={17} />
                }
              </button>
            </div>
          </label>


          {error && (
            <div className="login-admin-error">
              {error}
            </div>
          )}


          {mensaje && (
            <div className="login-admin-success">
              {mensaje}
            </div>
          )}


          <button
            type="submit"
            className="login-admin-submit"
            disabled={enviando}
          >
            {enviando
              ? "Ingresando..."
              : "Ingresar"}
          </button>


          <button
            type="button"
            className="login-admin-recover"
            onClick={recuperar}
            disabled={enviando}
          >
            ¿Olvidaste tu contraseña?
          </button>

        </form>


        <div className="login-admin-security">
          Acceso exclusivo para cuentas autorizadas.
        </div>

      </div>

    </div>
  );
}


export default LoginAdmin;
