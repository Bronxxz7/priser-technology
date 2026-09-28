import {
  getApps,
  initializeApp,
} from "firebase/app";

import {
  createUserWithEmailAndPassword,
  deleteUser,
  getAuth,
  sendPasswordResetEmail,
  signOut,
} from "firebase/auth";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import app, {
  auth,
  db,
} from "../firebase/firebaseConfig";


/* =========================================================
   PLANTILLAS DE PERMISOS
========================================================= */

export const PLANTILLAS_PERMISOS = {
  administrador: {
    dashboard: { ver: true },

    caja: {
      ver: true,
      abrir: true,
      cerrar: true,
    },

    ventas: {
      ver: true,
      crear: true,
      editar: true,
      eliminar: true,
    },

    gastos: {
      ver: true,
      crear: true,
      editar: true,
      eliminar: true,
    },

    ingresos: {
      ver: true,
      crear: true,
      editar: true,
      eliminar: true,
    },

    retiros: {
      ver: true,
      crear: true,
      editar: true,
      eliminar: true,
    },

    inventario: {
      ver: true,
    },

    equipos: {
      ver: true,
      crear: true,
      editar: true,
      transferir: true,
      eliminar: true,
    },

    cierres: {
      ver: true,
      crear: true,
    },

    reportes: {
      ver: true,
      exportar: true,
    },

    usuarios: {
      ver: true,
      crear: true,
      editar: true,
      desactivar: true,
    },

    tiendas: {
      ver: true,
      crear: true,
      editar: true,
    },
  },

  encargado: {
    dashboard: { ver: true },

    caja: {
      ver: true,
      abrir: true,
      cerrar: true,
    },

    ventas: {
      ver: true,
      crear: true,
      editar: true,
      eliminar: false,
    },

    gastos: {
      ver: true,
      crear: true,
      editar: true,
      eliminar: false,
    },

    ingresos: {
      ver: true,
      crear: true,
      editar: true,
      eliminar: false,
    },

    retiros: {
      ver: true,
      crear: true,
      editar: false,
      eliminar: false,
    },

    inventario: {
      ver: true,
    },

    equipos: {
      ver: true,
      crear: true,
      editar: true,
      transferir: true,
      eliminar: false,
    },

    cierres: {
      ver: true,
      crear: true,
    },

    reportes: {
      ver: true,
      exportar: false,
    },

    usuarios: {
      ver: false,
      crear: false,
      editar: false,
      desactivar: false,
    },

    tiendas: {
      ver: false,
      crear: false,
      editar: false,
    },
  },

  vendedor: {
    dashboard: { ver: false },

    caja: {
      ver: true,
      abrir: false,
      cerrar: false,
    },

    ventas: {
      ver: true,
      crear: true,
      editar: false,
      eliminar: false,
    },

    gastos: {
      ver: false,
      crear: false,
      editar: false,
      eliminar: false,
    },

    ingresos: {
      ver: false,
      crear: false,
      editar: false,
      eliminar: false,
    },

    retiros: {
      ver: false,
      crear: false,
      editar: false,
      eliminar: false,
    },

    inventario: {
      ver: true,
    },

    equipos: {
      ver: true,
      crear: false,
      editar: false,
      transferir: false,
      eliminar: false,
    },

    cierres: {
      ver: false,
      crear: false,
    },

    reportes: {
      ver: false,
      exportar: false,
    },

    usuarios: {
      ver: false,
      crear: false,
      editar: false,
      desactivar: false,
    },

    tiendas: {
      ver: false,
      crear: false,
      editar: false,
    },
  },

  personalizado: {
    dashboard: { ver: false },

    caja: {
      ver: false,
      abrir: false,
      cerrar: false,
    },

    ventas: {
      ver: false,
      crear: false,
      editar: false,
      eliminar: false,
    },

    gastos: {
      ver: false,
      crear: false,
      editar: false,
      eliminar: false,
    },

    ingresos: {
      ver: false,
      crear: false,
      editar: false,
      eliminar: false,
    },

    retiros: {
      ver: false,
      crear: false,
      editar: false,
      eliminar: false,
    },

    inventario: {
      ver: false,
    },

    equipos: {
      ver: false,
      crear: false,
      editar: false,
      transferir: false,
      eliminar: false,
    },

    cierres: {
      ver: false,
      crear: false,
    },

    reportes: {
      ver: false,
      exportar: false,
    },

    usuarios: {
      ver: false,
      crear: false,
      editar: false,
      desactivar: false,
    },

    tiendas: {
      ver: false,
      crear: false,
      editar: false,
    },
  },
};


/* =========================================================
   AUTH SECUNDARIO
   Crea una cuenta sin cerrar la sesión del administrador.
========================================================= */

const APP_SECUNDARIA =
  "priser-usuarios-secondary";

const secundariaExistente =
  getApps().find(
    (item) =>
      item.name ===
      APP_SECUNDARIA
  );

const appSecundaria =
  secundariaExistente ||
  initializeApp(
    app.options,
    APP_SECUNDARIA
  );

const authSecundario =
  getAuth(appSecundaria);


/* =========================================================
   UTILIDADES
========================================================= */

function texto(valor) {
  return String(
    valor ?? ""
  ).trim();
}


function correo(valor) {
  return texto(valor)
    .toLowerCase();
}


function clonar(objeto) {
  return JSON.parse(
    JSON.stringify(objeto)
  );
}


export function obtenerPermisosPorRol(
  rol
) {
  return clonar(
    PLANTILLAS_PERMISOS[
      rol
    ] ||
      PLANTILLAS_PERMISOS
        .personalizado
  );
}


function validarRol(rol) {
  if (
    !Object.prototype.hasOwnProperty.call(
      PLANTILLAS_PERMISOS,
      rol
    )
  ) {
    throw new Error(
      "Selecciona un rol válido."
    );
  }
}


function normalizarTiendas(
  rol,
  tiendasPermitidas
) {
  /*
    IMPORTANTE:
    rol "administrador" NO significa superAdmin.
    Toda cuenta creada desde Usuarios es una cuenta delegada
    y debe tener una o varias tiendas concretas.
    Solo el perfil con superAdmin:true puede trabajar con TODAS.
  */
  const unicas = [
    ...new Set(
      (
        tiendasPermitidas ||
        []
      )
        .map(texto)
        .map(
          (id) =>
            id.toLowerCase()
        )
        .filter(Boolean)
        .filter(
          (id) =>
            id !==
            "todas"
        )
    ),
  ];

  if (
    unicas.length ===
    0
  ) {
    throw new Error(
      "Selecciona al menos una tienda para esta cuenta."
    );
  }

  return unicas;
}



/* =========================================================
   LEER PERFIL ACTUAL
========================================================= */

export async function obtenerPerfilUsuario(
  uid
) {
  if (!uid) {
    return null;
  }

  const snapshot =
    await getDoc(
      doc(
        db,
        "usuarios",
        uid
      )
    );

  if (
    !snapshot.exists()
  ) {
    return null;
  }

  return {
    id:
      snapshot.id,

    ...snapshot.data(),
  };
}


/* =========================================================
   ESCUCHAR USUARIOS
========================================================= */

export function suscribirseUsuarios(
  callback
) {
  let cancelarSnapshot =
    () => {};

  let cancelado =
    false;

  async function iniciar() {
    const uid =
      auth.currentUser?.uid;

    if (!uid) {
      callback([]);
      return;
    }

    try {
      const perfilActual =
        await obtenerPerfilUsuario(
          uid
        );

      if (
        cancelado ||
        !perfilActual
      ) {
        return;
      }

      const puedeVerUsuarios =
        perfilActual.superAdmin ===
          true ||
        perfilActual.permisos
          ?.usuarios?.ver ===
          true;

      /*
        Si la cuenta NO tiene permiso para Usuarios,
        no intentamos escuchar toda la colección.
        Así Firestore no genera "Missing or insufficient permissions".
      */
      if (
        !puedeVerUsuarios
      ) {
        callback([
          perfilActual,
        ]);

        return;
      }

      cancelarSnapshot =
        onSnapshot(
          collection(
            db,
            "usuarios"
          ),

          (snapshot) => {
            const usuarios =
              snapshot.docs
                .map(
                  (documento) => ({
                    id:
                      documento.id,

                    ...documento.data(),
                  })
                )
                .sort(
                  (a, b) =>
                    String(
                      a.nombre || ""
                    ).localeCompare(
                      String(
                        b.nombre || ""
                      ),
                      "es"
                    )
                );

            callback(
              usuarios
            );
          },

          (error) => {
            console.error(
              "Error leyendo usuarios:",
              error
            );

            callback([]);
          }
        );
    } catch (error) {
      console.error(
        "Error verificando permisos de usuarios:",
        error
      );

      callback([]);
    }
  }

  iniciar();

  return () => {
    cancelado = true;
    cancelarSnapshot?.();
  };
}

/* =========================================================
   CREAR USUARIO
========================================================= */

export async function crearUsuario({
  nombre,
  correo: correoUsuario,
  password,
  rol,
  tiendasPermitidas,
  permisos,
}) {
  const nombreLimpio =
    texto(nombre);

  const correoLimpio =
    correo(
      correoUsuario
    );

  if (!nombreLimpio) {
    throw new Error(
      "El nombre es obligatorio."
    );
  }

  if (!correoLimpio) {
    throw new Error(
      "El correo es obligatorio."
    );
  }

  if (
    !password ||
    password.length < 6
  ) {
    throw new Error(
      "La contraseña debe tener al menos 6 caracteres."
    );
  }

  validarRol(rol);

  const tiendasFinales =
    normalizarTiendas(
      rol,
      tiendasPermitidas
    );

  const permisosFinales =
    permisos
      ? clonar(permisos)
      : obtenerPermisosPorRol(
          rol
        );

  let credencial = null;

  try {
    credencial =
      await createUserWithEmailAndPassword(
        authSecundario,
        correoLimpio,
        password
      );

    const uid =
      credencial.user.uid;

    const perfil = {
      uid,

      nombre:
        nombreLimpio,

      correo:
        correoLimpio,

      /*
        Se guarda también email por compatibilidad con componentes
        antiguos que todavía consultan perfil.email.
      */
      email:
        correoLimpio,

      rol,

      superAdmin:
        false,

      activo:
        true,

      /*
        tiendaId conserva la tienda principal.
        tiendasPermitidas mantiene una o varias tiendas autorizadas.
      */
      tiendaId:
        tiendasFinales[0] ||
        "",

      tiendasPermitidas:
        tiendasFinales,

      permisos:
        permisosFinales,

      fechaCreacion:
        serverTimestamp(),

      fechaActualizacion:
        serverTimestamp(),
    };

    if (
      auth.currentUser?.uid
    ) {
      perfil.creadoPor =
        auth.currentUser.uid;
    }

    await setDoc(
      doc(
        db,
        "usuarios",
        uid
      ),
      perfil
    );

    await signOut(
      authSecundario
    );

    return uid;
  } catch (error) {
    /*
     * Si Auth alcanzó a crear la cuenta pero
     * Firestore falló, intentamos revertirla.
     */
    if (
      credencial?.user
    ) {
      try {
        await deleteUser(
          credencial.user
        );
      } catch (
        rollbackError
      ) {
        console.error(
          "No se pudo revertir la cuenta recién creada:",
          rollbackError
        );
      }
    }

    try {
      await signOut(
        authSecundario
      );
    } catch {
      // Sin acción.
    }

    throw error;
  }
}


/* =========================================================
   EDITAR USUARIO
========================================================= */

export async function editarUsuario(
  usuarioId,
  {
    nombre,
    rol,
    tiendasPermitidas,
    permisos,
  }
) {
  if (!usuarioId) {
    throw new Error(
      "No se encontró el usuario."
    );
  }

  const nombreLimpio =
    texto(nombre);

  if (!nombreLimpio) {
    throw new Error(
      "El nombre es obligatorio."
    );
  }

  validarRol(rol);

  const tiendasFinales =
    normalizarTiendas(
      rol,
      tiendasPermitidas
    );

  const permisosFinales =
    permisos
      ? clonar(permisos)
      : obtenerPermisosPorRol(
          rol
        );

  const cambios = {
    nombre:
      nombreLimpio,

    rol,

    tiendaId:
      tiendasFinales[0] ||
      "",

    tiendasPermitidas:
      tiendasFinales,

    permisos:
      permisosFinales,

    fechaActualizacion:
      serverTimestamp(),
  };

  if (
    auth.currentUser?.uid
  ) {
    cambios.actualizadoPor =
      auth.currentUser.uid;
  }

  await updateDoc(
    doc(
      db,
      "usuarios",
      usuarioId
    ),
    cambios
  );
}


/* =========================================================
   ACTIVAR / DESACTIVAR
========================================================= */

export async function cambiarEstadoUsuario(
  usuarioId,
  activo
) {
  if (!usuarioId) {
    throw new Error(
      "No se encontró el usuario."
    );
  }

  if (
    usuarioId ===
      auth.currentUser?.uid &&
    activo === false
  ) {
    throw new Error(
      "No puedes desactivar tu propia cuenta."
    );
  }

  const cambios = {
    activo:
      Boolean(activo),

    fechaActualizacion:
      serverTimestamp(),
  };

  if (
    auth.currentUser?.uid
  ) {
    cambios.actualizadoPor =
      auth.currentUser.uid;
  }

  await updateDoc(
    doc(
      db,
      "usuarios",
      usuarioId
    ),
    cambios
  );
}


/* =========================================================
   RESTABLECER CONTRASEÑA
========================================================= */

export async function enviarRestablecimientoPassword(
  correoUsuario
) {
  const correoLimpio =
    correo(
      correoUsuario
    );

  if (!correoLimpio) {
    throw new Error(
      "El usuario no tiene un correo válido."
    );
  }

  await sendPasswordResetEmail(
    auth,
    correoLimpio
  );
}


/* =========================================================
   HELPERS DE PERMISOS
   Se usarán después en menú, rutas y botones.
========================================================= */

export function tienePermiso(
  perfil,
  modulo,
  accion = "ver"
) {
  if (
    perfil?.superAdmin ===
    true
  ) {
    return true;
  }

  return Boolean(
    perfil?.permisos?.[
      modulo
    ]?.[accion]
  );
}


export function tieneAccesoTienda(
  perfil,
  tiendaId
) {
  if (
    perfil?.superAdmin ===
    true
  ) {
    return true;
  }

  const permitidas =
    perfil?.tiendasPermitidas ||
    [];

  return (
    permitidas.includes(
      "todas"
    ) ||
    permitidas.includes(
      tiendaId
    )
  );
}