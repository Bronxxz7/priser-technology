import {
  addDoc,
  collection,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase/firebaseConfig";

import {
  obtenerCajaAbierta,
  obtenerResumenCaja,
} from "./cajaService";


export const PLATAFORMAS_SALDO = {
  RECARGAS: "recargas",
  RECAUDACION: "recaudacion",
};

export const TIPOS_MOVIMIENTO_PLATAFORMA = {
  USO: "uso",
};


function numero(valor) {
  const convertido = Number(valor);

  return Number.isFinite(convertido)
    ? convertido
    : 0;
}


export function normalizarPlataforma(valor) {
  const plataforma = String(
    valor || ""
  )
    .trim()
    .toLowerCase();

  if (
    plataforma !== "recargas" &&
    plataforma !== "recaudacion"
  ) {
    throw new Error(
      "Plataforma no válida."
    );
  }

  return plataforma;
}


export function normalizarTipoMovimientoPlataforma(
  valor
) {
  const tipo = String(
    valor || "uso"
  )
    .trim()
    .toLowerCase();

  if (tipo !== "uso") {
    throw new Error(
      "Solo se permite registrar uso de saldo."
    );
  }

  return "uso";
}


export async function registrarMovimientoPlataforma({
  tiendaId,
  plataforma,
  tipo = "uso",
  monto,
  descripcion = "",
}) {
  if (
    !tiendaId ||
    tiendaId === "todas"
  ) {
    throw new Error(
      "Selecciona una tienda específica."
    );
  }

  const plataformaNormalizada =
    normalizarPlataforma(
      plataforma
    );

  const tipoNormalizado =
    normalizarTipoMovimientoPlataforma(
      tipo
    );

  const valor = numero(
    monto
  );

  if (valor <= 0) {
    throw new Error(
      "Ingresa un monto mayor a 0."
    );
  }

  const caja =
    await obtenerCajaAbierta(
      tiendaId
    );

  if (!caja) {
    throw new Error(
      "La tienda no tiene una caja abierta."
    );
  }

  if (tipoNormalizado === "uso") {
    const resumen =
      await obtenerResumenCaja(
        caja
      );

    const saldoActual =
      plataformaNormalizada === "recargas"
        ? resumen?.recargas?.saldoActual || 0
        : resumen?.recaudacion?.saldoActual || 0;

    if (valor > saldoActual) {
      throw new Error(
        `El uso supera el saldo disponible (${Number(saldoActual).toFixed(2)}).`
      );
    }
  }

  await addDoc(
    collection(
      db,
      "movimientosPlataformas"
    ),
    {
      tiendaId,
      cajaId:
        caja.id,
      plataforma:
        plataformaNormalizada,
      tipo:
        tipoNormalizado,
      monto:
        valor,
      descripcion:
        String(
          descripcion || ""
        ).trim(),
      estado:
        "registrado",
      usuarioId:
        auth.currentUser?.uid ||
        null,
      fecha:
        serverTimestamp(),
    }
  );
}


export function suscribirseMovimientosPlataformas({
  tiendaId,
  callback,
}) {
  const referencia =
    tiendaId &&
    tiendaId !== "todas"
      ? query(
          collection(
            db,
            "movimientosPlataformas"
          ),
          where(
            "tiendaId",
            "==",
            tiendaId
          )
        )
      : collection(
          db,
          "movimientosPlataformas"
        );

  return onSnapshot(
    referencia,
    (snapshot) => {
      callback(
        snapshot.docs.map(
          (documento) => ({
            id:
              documento.id,
            ...documento.data(),
          })
        )
      );
    },
    (error) => {
      console.error(
        "Error leyendo movimientos de plataformas:",
        error
      );
      callback([]);
    }
  );
}
