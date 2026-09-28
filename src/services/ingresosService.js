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

export async function obtenerCajaAbierta(tiendaId) {
  if (!tiendaId || tiendaId === "todas") return null;

  const consulta = query(
    collection(db, "cajas"),
    where("tiendaId", "==", tiendaId),
    where("estado", "==", "abierta")
  );

  const resultado = await getDocs(consulta);
  if (resultado.empty) return null;

  const documento = resultado.docs[0];

  return {
    id: documento.id,
    ...documento.data(),
  };
}

export async function registrarIngreso({
  tiendaId,
  categoria,
  descripcion,
  monto,
  metodoPago,
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

  if (!metodoPago) {
    throw new Error("Selecciona un método de pago.");
  }

  const ingresoRef = doc(collection(db, "ingresos"));
  const batch = writeBatch(db);

  const ingreso = {
    tiendaId,
    cajaId: caja.id,
    categoria: categoria || "otros",
    descripcion: descripcionLimpia,
    monto: montoNumero,
    metodoPago,
    estado: "completado",
    fecha: serverTimestamp(),
  };

  if (auth.currentUser?.uid) {
    ingreso.usuarioId = auth.currentUser.uid;
  }

  batch.set(ingresoRef, ingreso);
  await batch.commit();

  return ingresoRef.id;
}

export async function editarIngreso(
  ingresoId,
  {
    categoria,
    descripcion,
    monto,
    metodoPago,
  }
) {
  if (!ingresoId) {
    throw new Error("No se encontró el ingreso.");
  }

  const descripcionLimpia = String(descripcion || "").trim();
  const montoNumero = Number(monto);

  if (!descripcionLimpia) {
    throw new Error("La descripción es obligatoria.");
  }

  if (!Number.isFinite(montoNumero) || montoNumero <= 0) {
    throw new Error("El monto debe ser mayor que cero.");
  }

  if (!metodoPago) {
    throw new Error("Selecciona un método de pago.");
  }

  const cambios = {
    categoria: categoria || "otros",
    descripcion: descripcionLimpia,
    monto: montoNumero,
    metodoPago,
    fechaActualizacion: serverTimestamp(),
  };

  if (auth.currentUser?.uid) {
    cambios.usuarioActualizacionId = auth.currentUser.uid;
  }

  const batch = writeBatch(db);

  batch.update(
    doc(db, "ingresos", ingresoId),
    cambios
  );

  await batch.commit();
}

export async function eliminarIngreso(ingresoId) {
  if (!ingresoId) {
    throw new Error("No se encontró el ingreso.");
  }

  const batch = writeBatch(db);
  batch.delete(doc(db, "ingresos", ingresoId));
  await batch.commit();
}

export function suscribirseIngresos(callback) {
  return onSnapshot(
    collection(db, "ingresos"),
    (snapshot) => {
      const ingresos = snapshot.docs
        .map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }))
        .sort((a, b) => {
          const fechaA = a.fecha?.toMillis?.() || 0;
          const fechaB = b.fecha?.toMillis?.() || 0;
          return fechaB - fechaA;
        });

      callback(ingresos);
    },
    (error) => {
      console.error("Error leyendo ingresos:", error);
      callback([]);
    }
  );
}
