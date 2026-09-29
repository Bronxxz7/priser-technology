import {
  useEffect,
  useState,
} from "react";

import {
  ArrowUpRight,
  Banknote,
  ClipboardCheck,
  Package,
  QrCode,
  ReceiptText,
  RefreshCcw,
  ShoppingCart,
  Smartphone,
  WalletCards,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  useTienda,
} from "../../context/TiendaContext";

import {
  useAuth,
} from "../../context/AuthContext";

import {
  obtenerDashboard,
} from "../../services/dashboardService";

import AccessDenied from "../../components/shared/AccessDenied";

import "./Dashboard.css";


const datosIniciales = {
  cajaActual: 0,
  cajaInicial: 0,
  totalVentas: 0,
  totalIngresos: 0,
  totalGastos: 0,
  totalRetiros: 0,
  operacionesVentas: 0,
  movimientosGastos: 0,
  equiposVendidos: 0,
  equiposStock: 0,
  ultimoCierre: 0,

  totalVentasEfectivo: 0,
  totalIngresosEfectivo: 0,
  totalGastosEfectivo: 0,
  totalRetirosEfectivo: 0,

  saldoYape: 0,
  operacionesYape: 0,

  recargasSaldoInicial: 0,
  recargasUsado: 0,
  recargasSaldoActual: 0,
  recargasOperaciones: 0,

  recaudacionSaldoInicial: 0,
  recaudacionUsado: 0,
  recaudacionSaldoActual: 0,
  recaudacionOperaciones: 0,

  hayCajaAbierta: false,
  movimientos: [],
};


function Dashboard() {
  const navigate =
    useNavigate();

  const {
    tiendaActiva,
  } = useTienda();

  const {
    perfil,
  } = useAuth();

  const esSuperAdmin =
    perfil?.superAdmin ===
    true;

  const puedeVerDashboard =
    esSuperAdmin ||
    perfil?.permisos
      ?.dashboard?.ver ===
      true;

  const tiendasPermitidas =
    Array.isArray(
      perfil?.tiendasPermitidas
    )
      ? perfil.tiendasPermitidas.filter(
          (id) =>
            id &&
            id !== "todas"
        )
      : [];

  const tiendaConsultaId =
    esSuperAdmin
      ? tiendaActiva?.id ||
        "todas"
      : tiendaActiva?.id &&
        tiendaActiva.id !==
          "todas" &&
        tiendasPermitidas.includes(
          tiendaActiva.id
        )
      ? tiendaActiva.id
      : tiendasPermitidas[0] ||
        "";

  const [
    datos,
    setDatos,
  ] = useState(
    datosIniciales
  );

  const [
    cargando,
    setCargando,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState("");



  const moneda =
    new Intl.NumberFormat(
      "es-PE",
      {
        style: "currency",
        currency: "PEN",
      }
    );


  function hora(
    fechaFirebase
  ) {
    if (!fechaFirebase) {
      return "--:--";
    }

    const fecha =
      typeof fechaFirebase.toDate ===
      "function"
        ? fechaFirebase.toDate()
        : new Date(
            fechaFirebase
          );

    return fecha.toLocaleTimeString(
      "es-PE",
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }


  async function cargarDashboard() {
    if (!puedeVerDashboard) {
      setDatos(
        datosIniciales
      );
      setError("");
      setCargando(false);
      return;
    }

    if (!tiendaConsultaId) {
      setDatos(
        datosIniciales
      );
      setError(
        "Tu cuenta no tiene una tienda asignada. Solicita acceso al administrador."
      );
      setCargando(false);
      return;
    }

    try {
      setCargando(true);
      setError("");

      const resultado =
        await obtenerDashboard(
          tiendaConsultaId
        );

      setDatos(
        resultado
      );
    } catch (err) {
      console.error(err);

      setError(
        "No se pudieron cargar los datos del Dashboard."
      );
    } finally {
      setCargando(false);
    }
  }


  useEffect(() => {
    cargarDashboard();
  }, [
    tiendaConsultaId,
    puedeVerDashboard,
  ]);




  if (
    perfil &&
    !puedeVerDashboard
  ) {
    return (
      <AccessDenied
        modulo="dashboard"
        accion="ver"
      />
    );
  }


  const tarjetas = [
    {
      titulo:
        "Caja actual",
      valor:
        moneda.format(
          datos.cajaActual
        ),
      detalle:
        datos.hayCajaAbierta
          ? "Caja física abierta"
          : "Sin caja abierta",
      icono:
        WalletCards,
      tipo:
        "azul",
      onClick: () =>
        navigate(
          "/admin/caja"
        ),
    },

    {
      titulo: "Yape",
      valor:
        moneda.format(
          datos.saldoYape
        ),
      detalle:
        `${datos.operacionesYape || 0} movimientos`,
      icono:
        QrCode,
      tipo:
        "yape",
      onClick: () =>
        navigate(
          "/admin/ventas"
        ),
    },

    {
      titulo:
        "R. Recargas",
      valor:
        moneda.format(
          datos.recargasSaldoActual ||
            0
        ),
      detalle:
        `Inicial ${moneda.format(
          datos.recargasSaldoInicial ||
            0
        )} · Usado ${moneda.format(
          datos.recargasUsado ||
            0
        )}`,
      icono:
        RefreshCcw,
      tipo:
        "recargas",
      onClick: () =>
        navigate(
          "/admin/ventas"
        ),
    },

    {
      titulo:
        "Recaudación",
      valor:
        moneda.format(
          datos.recaudacionSaldoActual ||
            0
        ),
      detalle:
        `Inicial ${moneda.format(
          datos.recaudacionSaldoInicial ||
            0
        )} · Usado ${moneda.format(
          datos.recaudacionUsado ||
            0
        )}`,
      icono:
        Banknote,
      tipo:
        "recaudacion",
      onClick: () =>
        navigate(
          "/admin/ventas"
        ),
    },

    {
      titulo:
        "Ventas de hoy",
      valor:
        moneda.format(
          datos.totalVentas
        ),
      detalle:
        `${datos.operacionesVentas} operaciones`,
      icono:
        ShoppingCart,
      tipo:
        "verde",
      onClick: () =>
        navigate(
          "/admin/ventas"
        ),
    },

    {
      titulo:
        "Gastos de hoy",
      valor:
        moneda.format(
          datos.totalGastos
        ),
      detalle:
        `${datos.movimientosGastos} movimientos`,
      icono:
        ReceiptText,
      tipo:
        "rojo",
      onClick: () =>
        navigate(
          "/admin/gastos"
        ),
    },

    {
      titulo:
        "Equipos vendidos",
      valor:
        datos.equiposVendidos,
      detalle:
        "Ventas del día",
      icono:
        Smartphone,
      tipo:
        "morado",
      onClick: () =>
        navigate(
          "/admin/equipos"
        ),
    },
  ];


  if (cargando) {
    return (
      <div className="dashboard">
        <div className="dashboard-loading">
          Cargando información de Firebase...
        </div>
      </div>
    );
  }


  return (
    <div className="dashboard">

      <div className="dashboard__header">
        <div>
          <h1>
            Dashboard
          </h1>

          <p>
            {tiendaActiva?.id ===
            "todas"
              ? "Resumen general de todas las tiendas."
              : `Resumen de ${tiendaActiva?.nombre}.`}
          </p>
        </div>

        <button
          className="dashboard__reports-button"
          onClick={() =>
            navigate(
              "/admin/reportes"
            )
          }
        >
          Ver reportes
          <ArrowUpRight
            size={17}
          />
        </button>
      </div>


      {error && (
        <div className="dashboard-error">
          {error}
        </div>
      )}


      <section className="dashboard__cards">
        {tarjetas.map(
          (tarjeta) => {
            const Icono =
              tarjeta.icono;

            return (
              <article
                key={
                  tarjeta.titulo
                }
                className={
                  `dashboard-card dashboard-card--${tarjeta.tipo}`
                }
                onClick={
                  tarjeta.onClick
                }
              >
                <div className="dashboard-card__top">
                  <div
                    className={
                      `dashboard-card__icon dashboard-card__icon--${tarjeta.tipo}`
                    }
                  >
                    <Icono
                      size={22}
                    />
                  </div>
                </div>

                <span className="dashboard-card__title">
                  {tarjeta.titulo}
                </span>

                <strong className="dashboard-card__value">
                  {tarjeta.valor}
                </strong>

                <small>
                  {tarjeta.detalle}
                </small>
              </article>
            );
          }
        )}
      </section>


      <section className="dashboard__secondary-cards">
        <div
          className="dashboard-mini-card"
          onClick={() =>
            navigate(
              "/admin/equipos"
            )
          }
        >
          <Package size={21} />

          <div>
            <span>
              Equipos disponibles
            </span>

            <strong>
              {datos.equiposStock}
            </strong>
          </div>
        </div>

        <div
          className="dashboard-mini-card"
          onClick={() =>
            navigate(
              "/admin/cierres"
            )
          }
        >
          <ClipboardCheck
            size={21}
          />

          <div>
            <span>
              Último cierre
            </span>

            <strong>
              {moneda.format(
                datos.ultimoCierre
              )}
            </strong>
          </div>
        </div>
      </section>


      <div className="dashboard__grid">
        <section className="dashboard-panel">
          <div className="dashboard-panel__header">
            <div>
              <h2>
                Movimientos recientes
              </h2>

              <p>
                Operaciones reales de hoy.
              </p>
            </div>
          </div>

          <div className="dashboard-table">
            <div className="dashboard-table__header">
              <span>
                Descripción
              </span>
              <span>
                Tipo
              </span>
              <span>
                Hora
              </span>
              <span>
                Monto
              </span>
            </div>

            {datos.movimientos.length ===
            0 ? (
              <div className="dashboard-empty">
                No hay movimientos registrados hoy.
              </div>
            ) : (
              datos.movimientos.map(
                (movimiento) => (
                  <div
                    className="dashboard-table__row"
                    key={
                      movimiento.id
                    }
                  >
                    <span>
                      {movimiento.descripcion}
                    </span>

                    <span>
                      <b
                        className={
                          movimiento.positivo
                            ? "status status--success"
                            : "status status--danger"
                        }
                      >
                        {movimiento.tipo}
                      </b>
                    </span>

                    <span>
                      {hora(
                        movimiento.fecha
                      )}
                    </span>

                    <strong
                      className={
                        movimiento.positivo
                          ? "amount--success"
                          : "amount--danger"
                      }
                    >
                      {movimiento.positivo
                        ? "+"
                        : "-"}{" "}
                      {moneda.format(
                        movimiento.monto
                      )}
                    </strong>
                  </div>
                )
              )
            )}
          </div>
        </section>


        <section className="dashboard-panel">
          <div className="dashboard-panel__header">
            <div>
              <h2>
                Estado de caja física
              </h2>

              <p>
                Solo considera movimientos en efectivo.
              </p>
            </div>
          </div>

          <div className="cash-summary">
            <div className="cash-summary__row">
              <span>
                Caja inicial
              </span>
              <strong>
                {moneda.format(
                  datos.cajaInicial
                )}
              </strong>
            </div>

            <div className="cash-summary__row">
              <span>
                Ventas en efectivo
              </span>
              <strong className="amount--success">
                + {moneda.format(
                  datos.totalVentasEfectivo
                )}
              </strong>
            </div>

            <div className="cash-summary__row">
              <span>
                Otros ingresos en efectivo
              </span>
              <strong className="amount--success">
                + {moneda.format(
                  datos.totalIngresosEfectivo
                )}
              </strong>
            </div>

            <div className="cash-summary__row">
              <span>
                Gastos en efectivo
              </span>
              <strong className="amount--danger">
                - {moneda.format(
                  datos.totalGastosEfectivo
                )}
              </strong>
            </div>

            <div className="cash-summary__row">
              <span>
                Retiros en efectivo
              </span>
              <strong className="amount--danger">
                - {moneda.format(
                  datos.totalRetirosEfectivo
                )}
              </strong>
            </div>

            <div className="cash-summary__total">
              <span>
                Caja actual
              </span>
              <strong>
                {moneda.format(
                  datos.cajaActual
                )}
              </strong>
            </div>
          </div>
        </section>
      </div>


    </div>
  );
}


export default Dashboard;
