import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";

import { auth, db } from "../firebase/firebaseConfig";


/* =========================================================
   OBTENER CAJA ABIERTA
========================================================= */

export async function obtenerCajaAbierta(tiendaId) {
  if (!tiendaId || tiendaId === "todas") {
    return null;
  }

  const consulta = query(
    collection(db, "cajas"),
    where("tiendaId", "==", tiendaId),
    where("estado", "==", "abierta")
  );

  const resultado = await getDocs(consulta);

  if (resultado.empty) {
    return null;
  }

  const documento = resultado.docs[0];

  return {
    id: documento.id,
    ...documento.data(),
  };
}


/* =========================================================
   REGISTRAR RETIRO
========================================================= */

export async function registrarRetiro({
  tiendaId,
  categoria,
  descripcion,
  monto,
  metodoSalida,
}) {
  if (!tiendaId || tiendaId === "todas") {
    throw new Error("Selecciona una tienda específica.");
  }

  const caja = await obtenerCajaAbierta(tiendaId);

  if (!caja) {
    throw new Error("Esta tienda no tiene una caja abierta.");
  }

  const descripcionLimpia = String(descripcion || "").trim();
  const montoNumero = Number(monto);

  if (!descripcionLimpia) {
    throw new Error("Ingresa una descripción.");
  }

  if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
    throw new Error("El monto debe ser mayor que cero.");
  }

  if (!metodoSalida) {
    throw new Error("Selecciona un método de salida.");
  }

  const retiroRef = doc(collection(db, "retiros"));
  const batch = writeBatch(db);

  const retiro = {
    tiendaId,
    cajaId: caja.id,
    categoria: categoria || "otros",
    descripcion: descripcionLimpia,
    monto: montoNumero,
    metodoSalida,
    estado: "completado",
    fecha: serverTimestamp(),
  };

  if (auth.currentUser?.uid) {
    retiro.usuarioId = auth.currentUser.uid;
  }

  batch.set(retiroRef, retiro);

  await batch.commit();

  return retiroRef.id;
}


/* =========================================================
   EDITAR RETIRO
========================================================= */

export async function editarRetiro(
  retiroId,
  {
    categoria,
    descripcion,
    monto,
    metodoSalida,
  }
) {
  if (!retiroId) {
    throw new Error("No se encontró el retiro.");
  }

  const descripcionLimpia = String(descripcion || "").trim();
  const montoNumero = Number(monto);

  if (!descripcionLimpia) {
    throw new Error("La descripción es obligatoria.");
  }

  if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
    throw new Error("El monto debe ser mayor que cero.");
  }

  if (!metodoSalida) {
    throw new Error("Selecciona un método de salida.");
  }

  const cambios = {
    categoria: categoria || "otros",
    descripcion: descripcionLimpia,
    monto: montoNumero,
    metodoSalida,
    fechaActualizacion: serverTimestamp(),
  };

  if (auth.currentUser?.uid) {
    cambios.usuarioActualizacionId = auth.currentUser.uid;
  }

  const batch = writeBatch(db);

  batch.update(
    doc(db, "retiros", retiroId),
    cambios
  );

  await batch.commit();
}


/* =========================================================
   ELIMINAR RETIRO DEFINITIVAMENTE
========================================================= */

export async function eliminarRetiro(retiroId) {
  if (!retiroId) {
    throw new Error("No se encontró el retiro.");
  }

  const batch = writeBatch(db);

  batch.delete(
    doc(db, "retiros", retiroId)
  );

  await batch.commit();
}


/* =========================================================
   ESCUCHAR RETIROS EN TIEMPO REAL
========================================================= */

export function suscribirseRetiros(
  callback,
  tiendaId,
  esSuperAdmin = false
) {
  /*
    Firestore Rules NO filtran una colección automáticamente.
    Una cuenta de tienda no puede escuchar todos los retiros
    y filtrarlos después en React.

    Por eso:
    - Super Admin + TODAS => colección completa.
    - Cuenta de tienda => query por tiendaId.
  */
  let referencia = null;

  if (
    esSuperAdmin &&
    (
      !tiendaId ||
      tiendaId ===
        "todas"
    )
  ) {
    referencia =
      collection(
        db,
        "retiros"
      );
  } else if (
    tiendaId &&
    tiendaId !==
      "todas"
  ) {
    referencia =
      query(
        collection(
          db,
          "retiros"
        ),
        where(
          "tiendaId",
          "==",
          tiendaId
        )
      );
  } else {
    callback([]);
    return () => {};
  }

  return onSnapshot(
    referencia,

    (snapshot) => {
      const retiros =
        snapshot.docs
          .map(
            (documento) => ({
              id:
                documento.id,
              ...documento.data(),
            })
          )
          .sort(
            (a, b) => {
              const fechaA =
                a.fecha
                  ?.toMillis?.() ||
                0;

              const fechaB =
                b.fecha
                  ?.toMillis?.() ||
                0;

              return (
                fechaB -
                fechaA
              );
            }
          );

      callback(
        retiros
      );
    },

    (error) => {
      console.error(
        "Error leyendo retiros:",
        error
      );

      callback([]);
    }
  );
}