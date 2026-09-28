import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
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


function numero(valor) {
  const convertido = Number(valor);

  return Number.isFinite(convertido)
    ? convertido
    : 0;
}


function fechaMs(fecha) {
  if (!fecha) {
    return 0;
  }

  if (
    typeof fecha.toDate ===
    "function"
  ) {
    return fecha.toDate().getTime();
  }

  const convertida =
    new Date(fecha);

  return Number.isNaN(
    convertida.getTime()
  )
    ? 0
    : convertida.getTime();
}


function movimientoValido(item) {
  return ![
    "anulada",
    "anulado",
    "eliminada",
    "eliminado",
    "cancelada",
    "cancelado",
  ].includes(
    String(
      item?.estado || ""
    ).toLowerCase()
  );
}


function esMovimientoEfectivo(
  item
) {
  const metodo =
    String(
      item?.metodoPago ||
        "efectivo"
    )
      .trim()
      .toLowerCase();

  /*
    Compatibilidad con registros antiguos:
    si no tenían metodoPago, se consideran efectivo.
  */
  return metodo ===
    "efectivo";
}


function sumarPorCaja(
  lista,
  cajaId
) {
  return lista
    .filter(
      (item) =>
        item.cajaId ===
          cajaId &&
        movimientoValido(
          item
        ) &&
        esMovimientoEfectivo(
          item
        )
    )
    .reduce(
      (total, item) =>
        total +
        numero(
          item.monto
        ),
      0
    );
}


function resumenPlataformaPorCaja({
  ventas,
  cajaId,
  plataforma,
  saldoInicial,
}) {
  const tipoVenta =
    plataforma === "recargas"
      ? "recarga"
      : "recaudacion";

  const lista = ventas.filter(
    (item) =>
      item.cajaId === cajaId &&
      movimientoValido(item) &&
      String(
        item.tipoVenta || ""
      )
        .trim()
        .toLowerCase() ===
        tipoVenta
  );

  const usado = lista.reduce(
    (total, item) =>
      total +
      numero(item.monto),
    0
  );

  const inicial =
    numero(saldoInicial);

  return {
    saldoInicial: inicial,
    usado,
    saldoActual:
      inicial - usado,
    movimientos:
      lista.length,
  };
}

export function calcularCajaEsperada({
  cajaInicial = 0,
  ventas = 0,
  ingresos = 0,
  gastos = 0,
  retiros = 0,
}) {
  return (
    numero(cajaInicial) +
    numero(ventas) +
    numero(ingresos) -
    numero(gastos) -
    numero(retiros)
  );
}


export async function obtenerCajaAbierta(
  tiendaId
) {
  if (
    !tiendaId ||
    tiendaId === "todas"
  ) {
    return null;
  }

  const snapshot =
    await getDocs(
      query(
        collection(
          db,
          "cajas"
        ),
        where(
          "tiendaId",
          "==",
          tiendaId
        ),
        where(
          "estado",
          "==",
          "abierta"
        )
      )
    );

  const cajas =
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
            b.fechaApertura
          ) -
          fechaMs(
            a.fechaApertura
          )
      );

  return (
    cajas[0] ||
    null
  );
}


async function obtenerColeccionPorCaja(
  nombreColeccion,
  cajaId
) {
  const snapshot =
    await getDocs(
      query(
        collection(
          db,
          nombreColeccion
        ),
        where(
          "cajaId",
          "==",
          cajaId
        )
      )
    );

  return snapshot.docs.map(
    (documento) => ({
      id:
        documento.id,

      ...documento.data(),
    })
  );
}


export async function obtenerResumenCaja(
  caja
) {
  if (!caja?.id) {
    return null;
  }

  const [
    ventas,
    ingresos,
    gastos,
    retiros,
  ] = await Promise.all([
    obtenerColeccionPorCaja(
      "ventas",
      caja.id
    ),
    obtenerColeccionPorCaja(
      "ingresos",
      caja.id
    ),
    obtenerColeccionPorCaja(
      "gastos",
      caja.id
    ),
    obtenerColeccionPorCaja(
      "retiros",
      caja.id
    ),
  ]);

  const totalVentas =
    ventas
      .filter(
        (item) =>
          movimientoValido(
            item
          ) &&
          esMovimientoEfectivo(
            item
          )
      )
      .reduce(
        (total, item) =>
          total +
          numero(
            item.monto
          ),
        0
      );

  const totalIngresos =
    ingresos
      .filter(
        (item) =>
          movimientoValido(
            item
          ) &&
          esMovimientoEfectivo(
            item
          )
      )
      .reduce(
        (total, item) =>
          total +
          numero(
            item.monto
          ),
        0
      );

  const totalGastos =
    gastos
      .filter(
        (item) =>
          movimientoValido(
            item
          ) &&
          esMovimientoEfectivo(
            item
          )
      )
      .reduce(
        (total, item) =>
          total +
          numero(
            item.monto
          ),
        0
      );

  const totalRetiros =
    retiros
      .filter(
        (item) =>
          movimientoValido(
            item
          ) &&
          esMovimientoEfectivo(
            item
          )
      )
      .reduce(
        (total, item) =>
          total +
          numero(
            item.monto
          ),
        0
      );

  const cajaInicial =
    numero(
      caja.cajaInicial ??
        caja.montoInicial ??
        caja.saldoInicial ??
        0
    );

  const recargas =
    resumenPlataformaPorCaja({
      ventas,
      cajaId:
        caja.id,
      plataforma:
        "recargas",
      saldoInicial:
        caja.recargasSaldoInicial,
    });

  const recaudacion =
    resumenPlataformaPorCaja({
      ventas,
      cajaId:
        caja.id,
      plataforma:
        "recaudacion",
      saldoInicial:
        caja.recaudacionSaldoInicial,
    });

  return {
    caja,

    cajaInicial,

    ventas:
      totalVentas,

    ingresos:
      totalIngresos,

    gastos:
      totalGastos,

    retiros:
      totalRetiros,

    recargas,

    recaudacion,

    cajaEsperada:
      calcularCajaEsperada({
        cajaInicial,

        ventas:
          totalVentas,

        ingresos:
          totalIngresos,

        gastos:
          totalGastos,

        retiros:
          totalRetiros,
      }),
  };
}


export async function abrirCaja({
  tiendaId,
  cajaInicial,
  recargasSaldoInicial = 0,
  recaudacionSaldoInicial = 0,
  observacion = "",
}) {
  if (
    !tiendaId ||
    tiendaId === "todas"
  ) {
    throw new Error(
      "Selecciona una tienda específica."
    );
  }

  const inicial =
    numero(
      cajaInicial
    );

  const saldoInicialRecargas =
    numero(
      recargasSaldoInicial
    );

  const saldoInicialRecaudacion =
    numero(
      recaudacionSaldoInicial
    );

  if (
    inicial < 0 ||
    saldoInicialRecargas < 0 ||
    saldoInicialRecaudacion < 0
  ) {
    throw new Error(
      "Los saldos iniciales no pueden ser negativos."
    );
  }

  const existente =
    await obtenerCajaAbierta(
      tiendaId
    );

  if (existente) {
    throw new Error(
      "Esta tienda ya tiene una caja abierta."
    );
  }

  const datos = {
    tiendaId,

    cajaInicial:
      inicial,

    recargasSaldoInicial:
      saldoInicialRecargas,

    recaudacionSaldoInicial:
      saldoInicialRecaudacion,

    estado:
      "abierta",

    observacionApertura:
      String(
        observacion || ""
      ).trim(),

    fechaApertura:
      serverTimestamp(),
  };

  if (
    auth.currentUser?.uid
  ) {
    datos.abiertoPor =
      auth.currentUser.uid;
  }

  const referencia =
    await addDoc(
      collection(
        db,
        "cajas"
      ),
      datos
    );

  return referencia.id;
}



export async function editarAperturaCaja(
  cajaId,
  {
    cajaInicial,
    recargasSaldoInicial = 0,
    recaudacionSaldoInicial = 0,
    observacion = "",
  }
) {
  if (!cajaId) {
    throw new Error(
      "No se encontró la caja."
    );
  }

  const inicial =
    numero(
      cajaInicial
    );

  const saldoInicialRecargas =
    numero(
      recargasSaldoInicial
    );

  const saldoInicialRecaudacion =
    numero(
      recaudacionSaldoInicial
    );

  if (
    inicial < 0 ||
    saldoInicialRecargas < 0 ||
    saldoInicialRecaudacion < 0
  ) {
    throw new Error(
      "Los saldos iniciales no pueden ser negativos."
    );
  }

  const referencia =
    doc(
      db,
      "cajas",
      cajaId
    );

  const snapshot =
    await getDoc(
      referencia
    );

  if (!snapshot.exists()) {
    throw new Error(
      "La caja ya no existe."
    );
  }

  const datos =
    snapshot.data();

  if (
    datos.estado !==
    "abierta"
  ) {
    throw new Error(
      "Solo se puede editar una caja que todavía está abierta."
    );
  }

  await updateDoc(
    referencia,
    {
      cajaInicial:
        inicial,

      recargasSaldoInicial:
        saldoInicialRecargas,

      recaudacionSaldoInicial:
        saldoInicialRecaudacion,

      observacionApertura:
        String(
          observacion || ""
        ).trim(),

      fechaActualizacionApertura:
        serverTimestamp(),

      actualizadoPor:
        auth.currentUser?.uid ||
        null,
    }
  );
}


async function contarRegistrosPorCaja(
  nombreColeccion,
  cajaId
) {
  const snapshot =
    await getDocs(
      query(
        collection(
          db,
          nombreColeccion
        ),
        where(
          "cajaId",
          "==",
          cajaId
        )
      )
    );

  return snapshot.size;
}


export async function eliminarAperturaCaja(
  cajaId
) {
  if (!cajaId) {
    throw new Error(
      "No se encontró la caja."
    );
  }

  const referencia =
    doc(
      db,
      "cajas",
      cajaId
    );

  const snapshot =
    await getDoc(
      referencia
    );

  if (!snapshot.exists()) {
    throw new Error(
      "La caja ya no existe."
    );
  }

  const datos =
    snapshot.data();

  if (
    datos.estado !==
    "abierta"
  ) {
    throw new Error(
      "Solo se puede eliminar una apertura que todavía está abierta."
    );
  }

  const [
    ventas,
    ingresos,
    gastos,
    retiros,
    cierres,
  ] = await Promise.all([
    contarRegistrosPorCaja(
      "ventas",
      cajaId
    ),
    contarRegistrosPorCaja(
      "ingresos",
      cajaId
    ),
    contarRegistrosPorCaja(
      "gastos",
      cajaId
    ),
    contarRegistrosPorCaja(
      "retiros",
      cajaId
    ),
    contarRegistrosPorCaja(
      "cierresCaja",
      cajaId
    ),
  ]);

  const totalRelacionados =
    ventas +
    ingresos +
    gastos +
    retiros +
    cierres;

  if (
    totalRelacionados > 0
  ) {
    throw new Error(
      "No se puede eliminar esta apertura porque ya tiene movimientos asociados. Puedes editar la caja inicial, pero no borrar la apertura."
    );
  }

  await deleteDoc(
    referencia
  );
}


export function suscribirseEstadoCajas(
  callback
) {
  const datos = {
    cajas: [],
    ventas: [],
    ingresos: [],
    gastos: [],
    retiros: [],
  };

  const emitir = () => {
    const abiertas =
      datos.cajas
        .filter(
          (caja) =>
            caja.estado ===
            "abierta"
        )
        .sort(
          (a, b) =>
            fechaMs(
              b.fechaApertura
            ) -
            fechaMs(
              a.fechaApertura
            )
        );

    const porTienda =
      new Map();

    abiertas.forEach(
      (caja) => {
        if (
          !porTienda.has(
            caja.tiendaId
          )
        ) {
          const cajaInicial =
            numero(
              caja.cajaInicial ??
                caja.montoInicial ??
                caja.saldoInicial ??
                0
            );

          const ventas =
            sumarPorCaja(
              datos.ventas,
              caja.id
            );

          const ingresos =
            sumarPorCaja(
              datos.ingresos,
              caja.id
            );

          const gastos =
            sumarPorCaja(
              datos.gastos,
              caja.id
            );

          const retiros =
            sumarPorCaja(
              datos.retiros,
              caja.id
            );

          const recargas =
            resumenPlataformaPorCaja({
              ventas:
                datos.ventas,
              cajaId:
                caja.id,
              plataforma:
                "recargas",
              saldoInicial:
                caja.recargasSaldoInicial,
            });

          const recaudacion =
            resumenPlataformaPorCaja({
              ventas:
                datos.ventas,
              cajaId:
                caja.id,
              plataforma:
                "recaudacion",
              saldoInicial:
                caja.recaudacionSaldoInicial,
            });

          porTienda.set(
            caja.tiendaId,
            {
              ...caja,

              cajaInicial,

              ventas,

              ingresos,

              gastos,

              retiros,

              recargas,

              recaudacion,

              recargasSaldoInicial:
                recargas.saldoInicial,

              recargasUsado:
                recargas.usado,

              recargasSaldoActual:
                recargas.saldoActual,

              recaudacionSaldoInicial:
                recaudacion.saldoInicial,

              recaudacionUsado:
                recaudacion.usado,

              recaudacionSaldoActual:
                recaudacion.saldoActual,

              cajaEsperada:
                calcularCajaEsperada({
                  cajaInicial,
                  ventas,
                  ingresos,
                  gastos,
                  retiros,
                }),
            }
          );
        }
      }
    );

    callback(
      Array.from(
        porTienda.values()
      )
    );
  };

  const canceladores = [];

  const escuchar = (
    nombreColeccion,
    clave
  ) => {
    const cancelar =
      onSnapshot(
        collection(
          db,
          nombreColeccion
        ),

        (snapshot) => {
          datos[clave] =
            snapshot.docs.map(
              (documento) => ({
                id:
                  documento.id,

                ...documento.data(),
              })
            );

          emitir();
        },

        (error) => {
          console.error(
            `Error leyendo ${nombreColeccion}:`,
            error
          );

          datos[clave] = [];
          emitir();
        }
      );

    canceladores.push(
      cancelar
    );
  };

  escuchar(
    "cajas",
    "cajas"
  );

  escuchar(
    "ventas",
    "ventas"
  );

  escuchar(
    "ingresos",
    "ingresos"
  );

  escuchar(
    "gastos",
    "gastos"
  );

  escuchar(
    "retiros",
    "retiros"
  );

  return () => {
    canceladores.forEach(
      (cancelar) =>
        cancelar?.()
    );
  };
}