import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase/firebaseConfig";


function limpiarTexto(
  valor
) {
  return String(
    valor ?? ""
  ).trim();
}


function normalizarId(
  valor
) {
  return limpiarTexto(
    valor
  )
    .toLowerCase()
    .normalize("NFD")
    .replace(
      /[\u0300-\u036f]/g,
      ""
    )
    .replace(
      /[^a-z0-9]+/g,
      "-"
    )
    .replace(
      /^-+|-+$/g,
      "");
}


function ordenarTiendas(
  lista
) {
  return [...lista].sort(
    (a, b) =>
      String(
        a.nombre ||
        a.id ||
        ""
      ).localeCompare(
        String(
          b.nombre ||
          b.id ||
          ""
        ),
        "es"
      )
  );
}


async function obtenerPerfilActual() {
  const uid =
    auth.currentUser?.uid;

  if (!uid) {
    throw new Error(
      "Debes iniciar sesión."
    );
  }

  const snapshot =
    await getDoc(
      doc(
        db,
        "usuarios",
        uid
      )
    );

  if (!snapshot.exists()) {
    throw new Error(
      "No se encontró el perfil del usuario."
    );
  }

  return {
    id:
      snapshot.id,
    ...snapshot.data(),
  };
}


async function exigirPermiso(
  accion
) {
  const perfil =
    await obtenerPerfilActual();

  if (
    perfil.activo !== true
  ) {
    throw new Error(
      "Tu cuenta está desactivada."
    );
  }

  if (
    perfil.superAdmin === true
  ) {
    return perfil;
  }

  if (
    perfil.permisos?.tiendas?.[
      accion
    ] !== true
  ) {
    throw new Error(
      "NO TIENES PERMISO. PÍDELE PERMISO AL ADMINISTRADOR."
    );
  }

  return perfil;
}


/*
  IMPORTANTE:
  No usamos orderBy("nombre") en Firestore.
  Algunos documentos antiguos pueden no tener el campo nombre.
  Firestore excluiría esos documentos de una query con orderBy.

  Leemos la colección completa y ordenamos en JavaScript.
*/
export function suscribirseTiendas(
  callback,
  onError = null
) {
  return onSnapshot(
    collection(
      db,
      "tiendas"
    ),

    (snapshot) => {
      const lista =
        snapshot.docs.map(
          (documento) => {
            const datos =
              documento.data();

            return {
              id:
                documento.id,

              ...datos,

              /*
                Si un documento antiguo no tiene nombre,
                usamos el ID visible como respaldo.
              */
              nombre:
                limpiarTexto(
                  datos.nombre
                ) ||
                String(
                  documento.id
                ).toUpperCase(),
            };
          }
        );

      callback(
        ordenarTiendas(
          lista
        )
      );
    },

    (error) => {
      console.error(
        "Error leyendo tiendas:",
        error
      );

      if (
        typeof onError ===
        "function"
      ) {
        onError(
          error
        );
      }
    }
  );
}


export async function crearTienda({
  nombre,
  categoria = "",
  logo = "",
}) {
  const perfil =
    await exigirPermiso(
      "crear"
    );

  const nombreLimpio =
    limpiarTexto(
      nombre
    );

  if (!nombreLimpio) {
    throw new Error(
      "Ingresa el nombre de la tienda."
    );
  }

  const tiendaId =
    normalizarId(
      nombreLimpio
    );

  if (!tiendaId) {
    throw new Error(
      "El nombre de la tienda no es válido."
    );
  }

  const referencia =
    doc(
      db,
      "tiendas",
      tiendaId
    );

  const existente =
    await getDoc(
      referencia
    );

  if (
    existente.exists()
  ) {
    throw new Error(
      "Ya existe una tienda con ese nombre."
    );
  }

  await setDoc(
    referencia,
    {
      nombre:
        nombreLimpio.toUpperCase(),

      categoria:
        limpiarTexto(
          categoria
        ),

      logo:
        limpiarTexto(
          logo
        ),

      activo:
        true,

      fechaCreacion:
        serverTimestamp(),

      fechaActualizacion:
        serverTimestamp(),

      creadoPor:
        auth.currentUser?.uid ||
        null,

      creadoPorNombre:
        perfil.nombre ||
        perfil.email ||
        perfil.correo ||
        "",
    }
  );

  return tiendaId;
}


export async function editarTienda(
  tiendaId,
  datos = {}
) {
  await exigirPermiso(
    "editar"
  );

  if (!tiendaId) {
    throw new Error(
      "No se encontró la tienda."
    );
  }

  const referencia =
    doc(
      db,
      "tiendas",
      tiendaId
    );

  const snapshot =
    await getDoc(
      referencia
    );

  if (!snapshot.exists()) {
    throw new Error(
      "La tienda ya no existe."
    );
  }

  const cambios = {
    fechaActualizacion:
      serverTimestamp(),

    actualizadoPor:
      auth.currentUser?.uid ||
      null,
  };

  if (
    datos.nombre !==
    undefined
  ) {
    const nombre =
      limpiarTexto(
        datos.nombre
      );

    if (!nombre) {
      throw new Error(
        "El nombre no puede quedar vacío."
      );
    }

    cambios.nombre =
      nombre.toUpperCase();
  }

  if (
    datos.categoria !==
    undefined
  ) {
    cambios.categoria =
      limpiarTexto(
        datos.categoria
      );
  }

  if (
    datos.logo !==
    undefined
  ) {
    cambios.logo =
      limpiarTexto(
        datos.logo
      );
  }

  if (
    datos.activo !==
    undefined
  ) {
    cambios.activo =
      datos.activo ===
      true;
  }

  await updateDoc(
    referencia,
    cambios
  );
}


export function activarTienda(
  tiendaId
) {
  return editarTienda(
    tiendaId,
    {
      activo:
        true,
    }
  );
}


export function desactivarTienda(
  tiendaId
) {
  return editarTienda(
    tiendaId,
    {
      activo:
        false,
    }
  );
}