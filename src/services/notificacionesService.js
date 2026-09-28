import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase/firebaseConfig";


function fechaMs(
  fecha
) {
  if (!fecha) {
    return 0;
  }

  if (
    typeof fecha.toDate ===
    "function"
  ) {
    return fecha.toDate().getTime();
  }

  const valor =
    new Date(fecha);

  return Number.isNaN(
    valor.getTime()
  )
    ? 0
    : valor.getTime();
}


function textoLimpio(
  valor
) {
  return String(
    valor || ""
  ).trim();
}


export async function crearNotificacion({
  titulo,
  mensaje,
  tipo = "informacion",
  tiendaDestinoId = "todas",
  creadoPorNombre = "",
}) {
  const uid =
    auth.currentUser?.uid;

  if (!uid) {
    throw new Error(
      "Debes iniciar sesión."
    );
  }

  const tituloLimpio =
    textoLimpio(
      titulo
    );

  const mensajeLimpio =
    textoLimpio(
      mensaje
    );

  const destino =
    textoLimpio(
      tiendaDestinoId
    ) || "todas";

  if (!tituloLimpio) {
    throw new Error(
      "Ingresa un título."
    );
  }

  if (!mensajeLimpio) {
    throw new Error(
      "Ingresa el mensaje."
    );
  }

  if (
    tituloLimpio.length >
    80
  ) {
    throw new Error(
      "El título no puede superar 80 caracteres."
    );
  }

  if (
    mensajeLimpio.length >
    500
  ) {
    throw new Error(
      "El mensaje no puede superar 500 caracteres."
    );
  }

  const tipoNormalizado =
    [
      "informacion",
      "precio",
      "urgente",
    ].includes(
      tipo
    )
      ? tipo
      : "informacion";

  const referencia =
    await addDoc(
      collection(
        db,
        "notificaciones"
      ),
      {
        titulo:
          tituloLimpio,

        mensaje:
          mensajeLimpio,

        tipo:
          tipoNormalizado,

        tiendaDestinoId:
          destino,

        activo:
          true,

        fechaCreacion:
          serverTimestamp(),

        creadoPor:
          uid,

        creadoPorNombre:
          textoLimpio(
            creadoPorNombre
          ),
      }
    );

  return referencia.id;
}


export async function confirmarRecepcion({
  notificacionId,
  tiendaId,
  usuarioNombre = "",
}) {
  const uid =
    auth.currentUser?.uid;

  if (!uid) {
    throw new Error(
      "Debes iniciar sesión."
    );
  }

  if (
    !notificacionId ||
    !tiendaId ||
    tiendaId === "todas"
  ) {
    throw new Error(
      "No se pudo identificar la tienda que confirma el mensaje."
    );
  }

  const confirmacionId =
    `${notificacionId}_${tiendaId}`;

  await setDoc(
    doc(
      db,
      "notificacionesConfirmaciones",
      confirmacionId
    ),
    {
      notificacionId,

      tiendaId,

      confirmado:
        true,

      usuarioId:
        uid,

      usuarioNombre:
        textoLimpio(
          usuarioNombre
        ),

      fechaConfirmacion:
        serverTimestamp(),
    },
    {
      merge:
        true,
    }
  );
}


export async function desactivarNotificacion(
  notificacionId
) {
  if (!notificacionId) {
    return;
  }

  const uid =
    auth.currentUser?.uid;

  if (!uid) {
    throw new Error(
      "Debes iniciar sesión."
    );
  }

  await updateDoc(
    doc(
      db,
      "notificaciones",
      notificacionId
    ),
    {
      activo:
        false,

      fechaDesactivacion:
        serverTimestamp(),

      desactivadoPor:
        uid,
    }
  );
}


export function suscribirseNotificaciones(
  callback
) {
  return onSnapshot(
    collection(
      db,
      "notificaciones"
    ),

    (snapshot) => {
      const lista =
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
              fechaMs(
                b.fechaCreacion
              ) -
              fechaMs(
                a.fechaCreacion
              )
          );

      callback(
        lista
      );
    },

    (error) => {
      console.error(
        "Error leyendo notificaciones:",
        error
      );

      callback([]);
    }
  );
}


export function suscribirseConfirmaciones({
  callback,
  esAdministrador = false,
  tiendaId = "",
}) {
  if (
    !esAdministrador &&
    (
      !tiendaId ||
      tiendaId === "todas"
    )
  ) {
    callback([]);

    return () => {};
  }

  const referencia =
    esAdministrador
      ? collection(
          db,
          "notificacionesConfirmaciones"
        )
      : query(
          collection(
            db,
            "notificacionesConfirmaciones"
          ),
          where(
            "tiendaId",
            "==",
            tiendaId
          )
        );

  return onSnapshot(
    referencia,

    (snapshot) => {
      const lista =
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
              fechaMs(
                b.fechaConfirmacion
              ) -
              fechaMs(
                a.fechaConfirmacion
              )
          );

      callback(
        lista
      );
    },

    (error) => {
      console.error(
        "Error leyendo confirmaciones de notificaciones:",
        error
      );

      callback([]);
    }
  );
}