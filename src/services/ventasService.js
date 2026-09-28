import {
  collection,
  deleteField,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";

import {
  auth,
  db,
} from "../firebase/firebaseConfig";

import {
  obtenerCajaAbierta,
} from "./cajaService";


function numero(valor) {
  const convertido = Number(valor);

  return Number.isFinite(convertido)
    ? convertido
    : 0;
}


function fechaMs(fecha) {
  if (!fecha) return 0;

  if (typeof fecha.toDate === "function") {
    return fecha.toDate().getTime();
  }

  const valor = new Date(fecha);
  return Number.isNaN(valor.getTime())
    ? 0
    : valor.getTime();
}


function modalidadNormalizada({
  tipoVenta,
  modalidadVenta,
}) {
  if (tipoVenta !== "equipo") {
    return "";
  }

  return modalidadVenta === "financiado"
    ? "financiado"
    : "contado";
}


function esTipoPlataforma(tipoVenta) {
  return ["recarga", "recaudacion"].includes(
    String(tipoVenta || "").trim().toLowerCase()
  );
}


function campoSaldoInicial(tipoVenta) {
  return tipoVenta === "recarga"
    ? "recargasSaldoInicial"
    : "recaudacionSaldoInicial";
}


function nombrePlataforma(tipoVenta) {
  return tipoVenta === "recarga"
    ? "R. Recargas"
    : "Recaudación";
}


function ventaValida(venta) {
  return ![
    "anulada",
    "anulado",
    "eliminada",
    "eliminado",
    "cancelada",
    "cancelado",
  ].includes(
    String(venta?.estado || "").trim().toLowerCase()
  );
}


async function obtenerSaldoDisponiblePlataforma({
  caja,
  tipoVenta,
  excluirVentaId = "",
}) {
  if (!caja?.id || !esTipoPlataforma(tipoVenta)) {
    return null;
  }

  const saldoInicial = numero(
    caja[campoSaldoInicial(tipoVenta)]
  );

  const snapshot = await getDocs(
    query(
      collection(db, "ventas"),
      where("cajaId", "==", caja.id)
    )
  );

  const usado = snapshot.docs
    .map((documento) => ({
      id: documento.id,
      ...documento.data(),
    }))
    .filter(
      (venta) =>
        venta.id !== excluirVentaId &&
        ventaValida(venta) &&
        String(venta.tipoVenta || "")
          .trim()
          .toLowerCase() === tipoVenta
    )
    .reduce(
      (total, venta) =>
        total + numero(venta.monto),
      0
    );

  return {
    saldoInicial,
    usado,
    saldoDisponible: saldoInicial - usado,
  };
}


export async function registrarVenta({
  tiendaId,
  tipoVenta,
  descripcion,
  monto,
  metodoPago,
  modalidadVenta = "contado",
  bonoFinanciamiento = 0,
  equipo = null,
}) {
  if (!tiendaId || tiendaId === "todas") {
    throw new Error(
      "Selecciona una tienda específica."
    );
  }

  const caja = await obtenerCajaAbierta(
    tiendaId
  );

  if (!caja) {
    throw new Error(
      "La tienda no tiene una caja abierta."
    );
  }

  const montoNumero = numero(monto);

  if (montoNumero <= 0) {
    throw new Error(
      "Ingresa un monto válido."
    );
  }

  if (esTipoPlataforma(tipoVenta)) {
    const saldo =
      await obtenerSaldoDisponiblePlataforma({
        caja,
        tipoVenta,
      });

    if (
      montoNumero >
      numero(saldo?.saldoDisponible)
    ) {
      throw new Error(
        `Saldo insuficiente en ${nombrePlataforma(
          tipoVenta
        )}. Disponible: S/ ${numero(
          saldo?.saldoDisponible
        ).toFixed(2)}.`
      );
    }
  }

  const modalidad = modalidadNormalizada({
    tipoVenta,
    modalidadVenta,
  });

  const financiado =
    tipoVenta === "equipo" &&
    modalidad === "financiado";

  const bono = financiado
    ? numero(bonoFinanciamiento)
    : 0;

  if (financiado && bono <= 0) {
    throw new Error(
      "Una venta financiada debe registrar su bono de financiamiento."
    );
  }

  if (tipoVenta === "equipo") {
    if (!equipo?.id) {
      throw new Error(
        "Selecciona el equipo vendido."
      );
    }

    if (equipo.estado === "vendido") {
      throw new Error(
        "El equipo ya figura como vendido."
      );
    }

    if (equipo.ubicacionActual !== tiendaId) {
      throw new Error(
        "El equipo ya no pertenece a la tienda seleccionada."
      );
    }
  }

  const ventaRef = doc(
    collection(db, "ventas")
  );

  const batch = writeBatch(db);

  const venta = {
    tiendaId,
    cajaId: caja.id,
    usuarioId:
      auth.currentUser?.uid || null,
    tipoVenta:
      tipoVenta || "otro",
    plataforma:
      tipoVenta === "recarga"
        ? "recargas"
        : tipoVenta === "recaudacion"
        ? "recaudacion"
        : "",
    descripcion:
      String(descripcion || "").trim(),
    monto: montoNumero,
    metodoPago:
      String(metodoPago || "efectivo")
        .trim()
        .toLowerCase(),
    modalidadVenta: modalidad,
    esFinanciado: financiado,
    bonoFinanciamiento: bono,
    estado: "registrada",
    fecha: serverTimestamp(),
    equipoId:
      tipoVenta === "equipo"
        ? equipo.id
        : "",
    nombreEquipo:
      tipoVenta === "equipo"
        ? String(descripcion || "").trim()
        : "",
    imei:
      tipoVenta === "equipo"
        ? equipo.imei || ""
        : "",
  };

  batch.set(
    ventaRef,
    venta
  );

  if (tipoVenta === "equipo") {
    batch.update(
      doc(db, "equipos", equipo.id),
      {
        estado: "vendido",
        fechaVenta: serverTimestamp(),
        ventaId: ventaRef.id,
        fechaActualizacion:
          serverTimestamp(),
      }
    );

    const movimientoRef = doc(
      collection(
        db,
        "movimientosEquipos"
      )
    );

    batch.set(
      movimientoRef,
      {
        equipoId: equipo.id,
        ventaId: ventaRef.id,
        origenTiendaId: tiendaId,
        destinoTiendaId: "cliente",
        tipo: "venta",
        cantidad: 1,
        estado: "registrado",
        descripcion:
          String(descripcion || "").trim(),
        imei: equipo.imei || "",
        modalidadVenta: modalidad,
        esFinanciado: financiado,
        bonoFinanciamiento: bono,
        usuarioId:
          auth.currentUser?.uid || null,
        fecha: serverTimestamp(),
      }
    );
  }

  await batch.commit();

  return {
    id: ventaRef.id,
    ...venta,
  };
}


export async function editarVenta(
  ventaId,
  datos
) {
  if (!ventaId) {
    throw new Error(
      "No se encontró la venta."
    );
  }

  const ventaRef = doc(
    db,
    "ventas",
    ventaId
  );

  const ventaSnap =
    await getDoc(
      ventaRef
    );

  if (!ventaSnap.exists()) {
    throw new Error(
      "La venta ya no existe."
    );
  }

  const ventaActual = {
    id: ventaSnap.id,
    ...ventaSnap.data(),
  };

  const nuevoMonto =
    numero(datos.monto);

  if (nuevoMonto <= 0) {
    throw new Error(
      "Ingresa un monto válido."
    );
  }

  if (
    esTipoPlataforma(
      ventaActual.tipoVenta
    )
  ) {
    const cajaSnap =
      await getDoc(
        doc(
          db,
          "cajas",
          ventaActual.cajaId
        )
      );

    if (!cajaSnap.exists()) {
      throw new Error(
        "La caja asociada a esta venta ya no existe."
      );
    }

    const saldo =
      await obtenerSaldoDisponiblePlataforma({
        caja: {
          id: cajaSnap.id,
          ...cajaSnap.data(),
        },
        tipoVenta:
          ventaActual.tipoVenta,
        excluirVentaId:
          ventaId,
      });

    if (
      nuevoMonto >
      numero(
        saldo?.saldoDisponible
      )
    ) {
      throw new Error(
        `Saldo insuficiente en ${nombrePlataforma(
          ventaActual.tipoVenta
        )}. Disponible para esta operación: S/ ${numero(
          saldo?.saldoDisponible
        ).toFixed(2)}.`
      );
    }
  }

  const modalidad =
    ventaActual.tipoVenta === "equipo"
      ? datos.modalidadVenta === "financiado"
        ? "financiado"
        : "contado"
      : "";

  const financiado =
    modalidad === "financiado";

  const bono =
    financiado
      ? numero(
          datos.bonoFinanciamiento
        )
      : 0;

  if (
    financiado &&
    bono <= 0
  ) {
    throw new Error(
      "Una venta financiada debe registrar su bono de financiamiento."
    );
  }

  await updateDoc(
    ventaRef,
    {
      descripcion:
        String(
          datos.descripcion || ""
        ).trim(),
      monto:
        nuevoMonto,
      metodoPago:
        String(
          datos.metodoPago ||
            "efectivo"
        )
          .trim()
          .toLowerCase(),
      modalidadVenta:
        modalidad,
      esFinanciado:
        financiado,
      bonoFinanciamiento:
        bono,
      fechaActualizacion:
        serverTimestamp(),
      actualizadoPor:
        auth.currentUser?.uid ||
        null,
    }
  );

  if (
    ventaActual.tipoVenta ===
    "equipo"
  ) {
    const movimientosSnap =
      await getDocs(
        query(
          collection(
            db,
            "movimientosEquipos"
          ),
          where(
            "ventaId",
            "==",
            ventaId
          )
        )
      );

    const batch =
      writeBatch(db);

    movimientosSnap.docs.forEach(
      (movimiento) => {
        batch.update(
          movimiento.ref,
          {
            descripcion:
              String(
                datos.descripcion ||
                  ""
              ).trim(),
            modalidadVenta:
              modalidad,
            esFinanciado:
              financiado,
            bonoFinanciamiento:
              bono,
            fechaActualizacion:
              serverTimestamp(),
          }
        );
      }
    );

    await batch.commit();
  }
}

export async function eliminarVenta(
  venta
) {
  if (!venta?.id) {
    throw new Error(
      "No se encontró la venta."
    );
  }

  const batch = writeBatch(db);

  if (
    venta.tipoVenta === "equipo" &&
    venta.equipoId
  ) {
    batch.update(
      doc(
        db,
        "equipos",
        venta.equipoId
      ),
      {
        estado: "disponible",
        fechaVenta: deleteField(),
        ventaId: deleteField(),
        fechaActualizacion:
          serverTimestamp(),
      }
    );

    const movimientosSnap = await getDocs(
      query(
        collection(
          db,
          "movimientosEquipos"
        ),
        where(
          "ventaId",
          "==",
          venta.id
        )
      )
    );

    movimientosSnap.docs.forEach(
      (movimiento) => {
        batch.delete(
          movimiento.ref
        );
      }
    );
  }

  batch.delete(
    doc(
      db,
      "ventas",
      venta.id
    )
  );

  await batch.commit();
}


export function suscribirseVentas(
  callback,
  tiendaId = ""
) {
  const referencia =
    tiendaId &&
    tiendaId !==
      "todas"
      ? query(
          collection(
            db,
            "ventas"
          ),
          where(
            "tiendaId",
            "==",
            tiendaId
          )
        )
      : collection(
          db,
          "ventas"
        );

  return onSnapshot(
    referencia,
    (snapshot) => {
      const ventas = snapshot.docs
        .map(
          (documento) => ({
            id: documento.id,
            ...documento.data(),
          })
        )
        .sort(
          (a, b) =>
            fechaMs(b.fecha) -
            fechaMs(a.fecha)
        );

      callback(ventas);
    },
    (error) => {
      console.error(
        "Error leyendo ventas:",
        error
      );
      callback([]);
    }
  );
}