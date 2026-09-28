import {
  useMemo,
  useState,
} from "react";

import {
  Building2,
  CheckCircle2,
  Edit3,
  Plus,
  Power,
  PowerOff,
  Search,
  X,
} from "lucide-react";

import {
  usePermisos,
} from "../../hooks/usePermisos";

import {
  useTienda,
} from "../../context/TiendaContext";

import AccessDenied from "../../components/shared/AccessDenied";

import {
  activarTienda,
  crearTienda,
  desactivarTienda,
  editarTienda,
} from "../../services/tiendasService";

import "./Tiendas.css";


const FORMULARIO_VACIO = {
  nombre: "",
  categoria: "",
};


function Tiendas() {
  const {
    puedeVer,
    puedeCrear,
    puedeEditar,
    cargando:
      cargandoPermisos,
  } = usePermisos();

  /*
    NO abrimos un segundo listener.
    Utilizamos exactamente las mismas tiendas que usa Header,
    Usuarios y el resto del sistema.
  */
  const {
    tiendas,
    cargandoTiendas,
    errorTiendas,
  } = useTienda();


  const [
    busqueda,
    setBusqueda,
  ] = useState("");

  const [
    mostrandoFormulario,
    setMostrandoFormulario,
  ] = useState(false);

  const [
    tiendaEditando,
    setTiendaEditando,
  ] = useState(null);

  const [
    formulario,
    setFormulario,
  ] = useState(
    FORMULARIO_VACIO
  );

  const [
    guardando,
    setGuardando,
  ] = useState(false);

  const [
    errorLocal,
    setErrorLocal,
  ] = useState("");


  const permisoVer =
    puedeVer(
      "tiendas"
    );

  const permisoCrear =
    puedeCrear(
      "tiendas"
    );

  const permisoEditar =
    puedeEditar(
      "tiendas"
    );


  const tiendasFiltradas =
    useMemo(
      () => {
        const texto =
          busqueda
            .trim()
            .toLowerCase();

        if (!texto) {
          return tiendas;
        }

        return tiendas.filter(
          (tienda) => {
            const contenido = [
              tienda.nombre,
              tienda.id,
              tienda.categoria,
            ]
              .join(" ")
              .toLowerCase();

            return contenido.includes(
              texto
            );
          }
        );
      },
      [
        tiendas,
        busqueda,
      ]
    );


  if (
    cargandoPermisos ||
    cargandoTiendas
  ) {
    return (
      <div className="tiendas-loading">
        Cargando tiendas...
      </div>
    );
  }


  if (!permisoVer) {
    return (
      <AccessDenied
        modulo="tiendas"
        accion="ver"
      />
    );
  }


  function cambiarCampo(
    event
  ) {
    const {
      name,
      value,
    } = event.target;

    setFormulario(
      (anterior) => ({
        ...anterior,
        [name]:
          value,
      })
    );
  }


  function abrirCrear() {
    if (!permisoCrear) {
      setErrorLocal(
        "NO TIENES PERMISO PARA CREAR TIENDAS. PÍDELE PERMISO AL ADMINISTRADOR."
      );

      return;
    }

    setErrorLocal("");
    setTiendaEditando(
      null
    );
    setFormulario(
      FORMULARIO_VACIO
    );
    setMostrandoFormulario(
      true
    );
  }


  function abrirEditar(
    tienda
  ) {
    if (!permisoEditar) {
      setErrorLocal(
        "NO TIENES PERMISO PARA EDITAR TIENDAS. PÍDELE PERMISO AL ADMINISTRADOR."
      );

      return;
    }

    setErrorLocal("");

    setTiendaEditando(
      tienda
    );

    setFormulario({
      nombre:
        tienda.nombre ||
        tienda.id ||
        "",
      categoria:
        tienda.categoria ||
        "",
    });

    setMostrandoFormulario(
      true
    );
  }


  function cerrarFormulario() {
    if (guardando) {
      return;
    }

    setMostrandoFormulario(
      false
    );

    setTiendaEditando(
      null
    );

    setFormulario(
      FORMULARIO_VACIO
    );

    setErrorLocal("");
  }


  async function guardar(
    event
  ) {
    event.preventDefault();

    setErrorLocal("");

    try {
      setGuardando(true);

      if (
        tiendaEditando
      ) {
        await editarTienda(
          tiendaEditando.id,
          formulario
        );
      } else {
        await crearTienda(
          formulario
        );
      }

      setMostrandoFormulario(
        false
      );

      setTiendaEditando(
        null
      );

      setFormulario(
        FORMULARIO_VACIO
      );
    } catch (
      errorGuardar
    ) {
      setErrorLocal(
        errorGuardar.message ||
          "No se pudo guardar la tienda."
      );
    } finally {
      setGuardando(false);
    }
  }


  async function cambiarEstado(
    tienda
  ) {
    if (!permisoEditar) {
      setErrorLocal(
        "NO TIENES PERMISO PARA EDITAR TIENDAS. PÍDELE PERMISO AL ADMINISTRADOR."
      );

      return;
    }

    const activar =
      tienda.activo ===
      false;

    const confirmado =
      window.confirm(
        activar
          ? `¿Activar la tienda ${tienda.nombre || tienda.id}?`
          : `¿Desactivar la tienda ${tienda.nombre || tienda.id}?`
      );

    if (!confirmado) {
      return;
    }

    try {
      setErrorLocal("");

      if (activar) {
        await activarTienda(
          tienda.id
        );
      } else {
        await desactivarTienda(
          tienda.id
        );
      }
    } catch (
      errorEstado
    ) {
      setErrorLocal(
        errorEstado.message ||
          "No se pudo actualizar la tienda."
      );
    }
  }


  const error =
    errorLocal ||
    errorTiendas;


  return (
    <div className="tiendas">

      <div className="tiendas__header">

        <div>
          <h1>
            Tiendas
          </h1>

          <p>
            Administración de tiendas registradas en el sistema.
          </p>
        </div>


        {permisoCrear && (
          <button
            type="button"
            className="tiendas__create"
            onClick={
              abrirCrear
            }
          >
            <Plus
              size={17}
            />

            Nueva tienda
          </button>
        )}

      </div>


      {error && (
        <div className="tiendas__error">
          {error}
        </div>
      )}


      <div className="tiendas__toolbar">

        <Search
          size={18}
        />

        <input
          value={
            busqueda
          }
          onChange={(
            event
          ) =>
            setBusqueda(
              event.target.value
            )
          }
          placeholder="Buscar tienda o categoría..."
        />

        <span>
          {
            tiendasFiltradas.length
          }{" "}
          tiendas
        </span>

      </div>


      {tiendasFiltradas.length ===
      0 ? (
        <div className="tiendas__empty">
          <Building2
            size={38}
          />

          <h3>
            No hay tiendas
          </h3>

          <p>
            {errorTiendas
              ? "No se pudieron leer las tiendas desde Firestore."
              : "No se encontraron tiendas registradas."}
          </p>
        </div>
      ) : (
        <div className="tiendas__grid">

          {tiendasFiltradas.map(
            (tienda) => (
              <article
                className={
                  tienda.activo ===
                  false
                    ? "tienda-card tienda-card--inactive"
                    : "tienda-card"
                }
                key={
                  tienda.id
                }
              >

                <div className="tienda-card__top">

                  <div className="tienda-card__icon">
                    <Building2
                      size={22}
                    />
                  </div>

                  <span
                    className={
                      tienda.activo ===
                      false
                        ? "tienda-card__status tienda-card__status--inactive"
                        : "tienda-card__status tienda-card__status--active"
                    }
                  >
                    {tienda.activo ===
                    false
                      ? "Inactiva"
                      : "Activa"}
                  </span>

                </div>


                <h2>
                  {tienda.nombre ||
                    String(
                      tienda.id
                    ).toUpperCase()}
                </h2>

                <p>
                  {tienda.categoria ||
                    "Sin categoría"}
                </p>


                {permisoEditar && (
                  <div className="tienda-card__actions">

                    <button
                      type="button"
                      onClick={() =>
                        abrirEditar(
                          tienda
                        )
                      }
                    >
                      <Edit3
                        size={14}
                      />

                      Editar
                    </button>

                    <button
                      type="button"
                      className={
                        tienda.activo ===
                        false
                          ? "tienda-card__activate"
                          : "tienda-card__deactivate"
                      }
                      onClick={() =>
                        cambiarEstado(
                          tienda
                        )
                      }
                    >
                      {tienda.activo ===
                      false ? (
                        <Power
                          size={14}
                        />
                      ) : (
                        <PowerOff
                          size={14}
                        />
                      )}

                      {tienda.activo ===
                      false
                        ? "Activar"
                        : "Desactivar"}
                    </button>

                  </div>
                )}

              </article>
            )
          )}

        </div>
      )}


      {mostrandoFormulario && (
        <div className="tiendas-modal">

          <div className="tiendas-modal__card">

            <div className="tiendas-modal__header">

              <div>
                <h2>
                  {tiendaEditando
                    ? "Editar tienda"
                    : "Nueva tienda"}
                </h2>

                <p>
                  {tiendaEditando
                    ? "Actualiza la información de la tienda."
                    : "Registra una nueva tienda en el sistema."}
                </p>
              </div>

              <button
                type="button"
                onClick={
                  cerrarFormulario
                }
                aria-label="Cerrar"
              >
                <X
                  size={19}
                />
              </button>

            </div>


            <form
              onSubmit={
                guardar
              }
              className="tiendas-form"
            >

              <label>
                Nombre

                <input
                  name="nombre"
                  value={
                    formulario.nombre
                  }
                  onChange={
                    cambiarCampo
                  }
                  placeholder="Nombre de la tienda"
                  autoFocus
                />
              </label>


              <label>
                Categoría

                <input
                  name="categoria"
                  value={
                    formulario.categoria
                  }
                  onChange={
                    cambiarCampo
                  }
                  placeholder="Ej. Telefonía"
                />
              </label>


              {errorLocal && (
                <div className="tiendas-form__error">
                  {errorLocal}
                </div>
              )}


              <div className="tiendas-form__actions">

                <button
                  type="button"
                  className="tiendas-form__cancel"
                  onClick={
                    cerrarFormulario
                  }
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="tiendas-form__save"
                  disabled={
                    guardando
                  }
                >
                  <CheckCircle2
                    size={15}
                  />

                  {guardando
                    ? "Guardando..."
                    : "Guardar"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}


export default Tiendas;