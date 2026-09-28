import {
  addDoc,
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase/firebaseConfig";

const gastosRef = collection(db, "gastos");

async function obtenerCajaAbierta(tiendaId) {
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

export async function registrarGasto({
  tiendaId,
  categoria,
  descripcion,
  monto,
}) {
  if (!tiendaId) {
    throw new Error(
      "No se ha seleccionado una tienda."
    );
  }

  const categoriaLimpia =
    String(categoria || "").trim();

  const descripcionLimpia =
    String(descripcion || "").trim();

  const montoNumero =
    Number(monto);

  if (!categoriaLimpia) {
    throw new Error(
      "La categoría es obligatoria."
    );
  }

  if (!descripcionLimpia) {
    throw new Error(
      "La descripción es obligatoria."
    );
  }

  if (
    !Number.isFinite(montoNumero) ||
    montoNumero <= 0
  ) {
    throw new Error(
      "El monto debe ser mayor que cero."
    );
  }

  if (tiendaId === "general") {
    const datos = {
      tiendaId: "general",
      cajaId: "",
      tipoGasto: "general",
      categoria: categoriaLimpia,
      descripcion: descripcionLimpia,
      monto: montoNumero,
      estado: "registrado",
      fecha: serverTimestamp(),
    };

    if (auth.currentUser?.uid) {
      datos.usuarioId =
        auth.currentUser.uid;
    }

    const referencia =
      await addDoc(
        gastosRef,
        datos
      );

    return referencia.id;
  }

  const caja =
    await obtenerCajaAbierta(
      tiendaId
    );

  if (!caja) {
    throw new Error(
      "La tienda seleccionada no tiene una caja abierta."
    );
  }

  const datos = {
    tiendaId,
    cajaId: caja.id,
    tipoGasto: "tienda",
    categoria: categoriaLimpia,
    descripcion: descripcionLimpia,
    monto: montoNumero,
    estado: "registrado",
    fecha: serverTimestamp(),
  };

  if (auth.currentUser?.uid) {
    datos.usuarioId =
      auth.currentUser.uid;
  }

  const referencia =
    await addDoc(
      gastosRef,
      datos
    );

  return referencia.id;
}

export async function anularGasto(gastoId) {
  if (!gastoId) {
    throw new Error(
      "No se encontró el gasto."
    );
  }

  const cambios = {
    estado: "anulado",
    fechaAnulacion:
      serverTimestamp(),
  };

  if (auth.currentUser?.uid) {
    cambios.usuarioAnulacionId =
      auth.currentUser.uid;
  }

  await updateDoc(
    doc(
      db,
      "gastos",
      gastoId
    ),
    cambios
  );
}

export function suscribirseGastos(callback) {
  return onSnapshot(
    gastosRef,

    (snapshot) => {
      const lista =
        snapshot.docs
          .map((documento) => ({
            id: documento.id,
            ...documento.data(),
          }))
          .filter(
            (gasto) =>
              gasto.estado !== "anulado" &&
              gasto.estado !== "eliminado"
          )
          .sort((a, b) => {
            const fechaA =
              a.fecha?.toMillis?.() || 0;

            const fechaB =
              b.fecha?.toMillis?.() || 0;

            return fechaB - fechaA;
          });

      callback(lista);
    },

    (error) => {
      console.error(
        "Error al leer los gastos:",
        error
      );

      callback([]);
    }
  );
}