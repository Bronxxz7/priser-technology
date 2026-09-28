import {
  collection,
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

import { auth, db } from "../firebase/firebaseConfig";

const equiposRef = collection(db, "equipos");

function texto(valor) {
  return String(valor ?? "").trim();
}

function numeroNoNegativo(valor, nombre) {
  if (valor === "" || valor === null || valor === undefined) return 0;

  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero < 0) {
    throw new Error(`${nombre} debe ser un número válido.`);
  }

  return numero;
}

function numeroPositivo(valor, nombre) {
  const numero = Number(valor);

  if (!Number.isFinite(numero) || numero <= 0) {
    throw new Error(`${nombre} debe ser mayor que cero.`);
  }

  return numero;
}

function normalizarImei(valor) {
  return texto(valor).replace(/\s+/g, "");
}

function validarBaseEquipo(datos) {
  const marca = texto(datos.marca).toUpperCase();
  const modelo = texto(datos.modelo);
  const color = texto(datos.color);
  const ubicacionActual = texto(datos.ubicacionActual);
  const tipo = texto(datos.tipo || "celular").toLowerCase();

  const ram = numeroPositivo(
    datos.ram,
    "La RAM"
  );

  const almacenamiento = numeroPositivo(
    datos.almacenamiento,
    "El almacenamiento"
  );

  const precioVenta = numeroNoNegativo(
    datos.precioVenta,
    "El precio de venta"
  );

  const precioFinanciamiento = numeroNoNegativo(
    datos.precioFinanciamiento,
    "El precio de financiamiento"
  );

  if (!marca) {
    throw new Error("La marca es obligatoria.");
  }

  if (!modelo) {
    throw new Error("El modelo es obligatorio.");
  }

  if (!color) {
    throw new Error("El color es obligatorio.");
  }

  if (!ubicacionActual) {
    throw new Error("Selecciona una tienda.");
  }

  if (!["celular", "tablet", "otro"].includes(tipo)) {
    throw new Error(
      "Selecciona un tipo de equipo válido."
    );
  }

  return {
    marca,
    modelo,
    tipo,
    ram,
    almacenamiento,
    color,
    ubicacionActual,
    precioVenta,
    precioFinanciamiento,
  };
}


/* =========================================================
   ESCUCHAR EQUIPOS EN TIEMPO REAL
========================================================= */

export function suscribirseEquipos(callback) {
  return onSnapshot(
    equiposRef,

    (snapshot) => {
      const equipos = snapshot.docs
        .map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }))
        .filter(
          (equipo) =>
            equipo.activo !== false
        )
        .sort((a, b) => {
          const marca = String(
            a.marca || ""
          ).localeCompare(
            String(b.marca || ""),
            "es"
          );

          if (marca !== 0) {
            return marca;
          }

          return String(
            a.modelo || ""
          ).localeCompare(
            String(b.modelo || ""),
            "es"
          );
        });

      callback(equipos);
    },

    (error) => {
      console.error(
        "Error leyendo equipos:",
        error
      );

      callback([]);
    }
  );
}


/* =========================================================
   VERIFICAR IMEI
========================================================= */

export async function existeImei(
  imei,
  excluirEquipoId = null
) {
  const imeiLimpio =
    normalizarImei(imei);

  if (!imeiLimpio) {
    return false;
  }

  const consulta = query(
    equiposRef,
    where(
      "imei",
      "==",
      imeiLimpio
    )
  );

  const resultado =
    await getDocs(consulta);

  return resultado.docs.some(
    (documento) =>
      documento.id !==
      excluirEquipoId
  );
}


/* =========================================================
   REGISTRAR UNO O VARIOS EQUIPOS
========================================================= */

export async function crearEquipo(datos) {
  const base =
    validarBaseEquipo(datos);

  const cantidad =
    Number(datos.cantidad || 1);

  if (
    !Number.isInteger(cantidad) ||
    cantidad < 1 ||
    cantidad > 100
  ) {
    throw new Error(
      "La cantidad debe ser un número entero entre 1 y 100."
    );
  }

  let imeis = [];

  if (
    Array.isArray(datos.imeis)
  ) {
    imeis = datos.imeis
      .slice(0, cantidad)
      .map(normalizarImei);
  } else if (datos.imei) {
    imeis = [
      normalizarImei(
        datos.imei
      ),
    ];
  }

  if (
    imeis.length !== cantidad
  ) {
    throw new Error(
      `Debes ingresar ${cantidad} IMEI${
        cantidad === 1 ? "" : "s"
      }.`
    );
  }

  if (
    imeis.some(
      (imei) => !imei
    )
  ) {
    throw new Error(
      "Todos los IMEI son obligatorios."
    );
  }

  const unicos =
    new Set(imeis);

  if (
    unicos.size !==
    imeis.length
  ) {
    throw new Error(
      "Hay IMEI repetidos dentro del registro."
    );
  }

  const comprobaciones =
    await Promise.all(
      imeis.map(
        async (imei) => ({
          imei,
          existe:
            await existeImei(imei),
        })
      )
    );

  const repetido =
    comprobaciones.find(
      (item) => item.existe
    );

  if (repetido) {
    throw new Error(
      `El IMEI ${repetido.imei} ya está registrado.`
    );
  }

  /*
   * Cada unidad sigue siendo un documento individual.
   * Eso permite vender, editar y transferir cada IMEI
   * por separado.
   *
   * Para el usuario, "cantidad" solo agiliza el ingreso.
   */

  const lote =
    writeBatch(db);

  const ids = [];

  imeis.forEach((imei) => {
    const equipoRef =
      doc(equiposRef);

    ids.push(
      equipoRef.id
    );

    const documento = {
      ...base,

      imei,

      estado:
        "disponible",

      activo:
        true,

      fechaCreacion:
        serverTimestamp(),
    };

    if (
      auth.currentUser?.uid
    ) {
      documento.usuarioCreacionId =
        auth.currentUser.uid;
    }

    lote.set(
      equipoRef,
      documento
    );

    const movimientoRef =
      doc(
        collection(
          db,
          "movimientosEquipos"
        )
      );

    const movimiento = {
      equipoId:
        equipoRef.id,

      origenTiendaId:
        null,

      destinoTiendaId:
        base.ubicacionActual,

      tipo:
        "ingreso_inicial",

      cantidad:
        1,

      estado:
        "completado",

      observacion:
        "Registro inicial del equipo",

      fecha:
        serverTimestamp(),
    };

    if (
      auth.currentUser?.uid
    ) {
      movimiento.usuarioId =
        auth.currentUser.uid;
    }

    lote.set(
      movimientoRef,
      movimiento
    );
  });

  await lote.commit();

  return ids;
}


/* =========================================================
   EDITAR UNA UNIDAD
========================================================= */

export async function editarEquipo(
  equipoId,
  datos
) {
  if (!equipoId) {
    throw new Error(
      "No se encontró el equipo."
    );
  }

  const base =
    validarBaseEquipo(datos);

  const imei =
    normalizarImei(
      Array.isArray(datos.imeis)
        ? datos.imeis[0]
        : datos.imei
    );

  if (!imei) {
    throw new Error(
      "El IMEI es obligatorio."
    );
  }

  if (
    await existeImei(
      imei,
      equipoId
    )
  ) {
    throw new Error(
      "Ya existe otro equipo registrado con este IMEI."
    );
  }

  const cambios = {
    marca:
      base.marca,

    modelo:
      base.modelo,

    tipo:
      base.tipo,

    ram:
      base.ram,

    almacenamiento:
      base.almacenamiento,

    color:
      base.color,

    imei,

    precioVenta:
      base.precioVenta,

    precioFinanciamiento:
      base.precioFinanciamiento,

    fechaActualizacion:
      serverTimestamp(),
  };

  if (
    auth.currentUser?.uid
  ) {
    cambios.usuarioActualizacionId =
      auth.currentUser.uid;
  }

  await updateDoc(
    doc(
      db,
      "equipos",
      equipoId
    ),
    cambios
  );
}


/* =========================================================
   TRANSFERIR UNA UNIDAD
========================================================= */

export async function transferirEquipo(
  equipo,
  destinoTiendaId,
  observacion = ""
) {
  if (!equipo?.id) {
    throw new Error(
      "No se encontró el equipo."
    );
  }

  if (
    equipo.activo === false
  ) {
    throw new Error(
      "Este equipo está desactivado."
    );
  }

  if (
    equipo.estado === "vendido"
  ) {
    throw new Error(
      "Un equipo vendido no puede transferirse."
    );
  }

  if (
    !destinoTiendaId ||
    destinoTiendaId ===
      equipo.ubicacionActual
  ) {
    throw new Error(
      "Selecciona una tienda de destino diferente."
    );
  }

  const lote =
    writeBatch(db);

  const equipoRef =
    doc(
      db,
      "equipos",
      equipo.id
    );

  const movimientoRef =
    doc(
      collection(
        db,
        "movimientosEquipos"
      )
    );

  lote.update(
    equipoRef,
    {
      ubicacionActual:
        destinoTiendaId,

      fechaActualizacion:
        serverTimestamp(),
    }
  );

  const movimiento = {
    equipoId:
      equipo.id,

    origenTiendaId:
      equipo.ubicacionActual,

    destinoTiendaId,

    tipo:
      "transferencia",

    cantidad:
      1,

    estado:
      "completado",

    observacion:
      texto(observacion),

    fecha:
      serverTimestamp(),
  };

  if (
    auth.currentUser?.uid
  ) {
    movimiento.usuarioId =
      auth.currentUser.uid;
  }

  lote.set(
    movimientoRef,
    movimiento
  );

  await lote.commit();

  return movimientoRef.id;
}


/* =========================================================
   ELIMINAR EQUIPO DEFINITIVAMENTE
========================================================= */

export async function eliminarEquipo(equipo) {
  if (!equipo?.id) {
    throw new Error(
      "No se encontró el equipo."
    );
  }

  const equipoRef = doc(
    db,
    "equipos",
    equipo.id
  );

  /*
   * Leemos el estado real de Firestore antes de borrar.
   * Un equipo vendido no se elimina porque puede existir
   * una venta relacionada con él.
   */
  const equipoSnapshot =
    await getDoc(equipoRef);

  if (!equipoSnapshot.exists()) {
    throw new Error(
      "Este equipo ya no existe."
    );
  }

  const equipoActual =
    equipoSnapshot.data();

  if (
    equipoActual.estado ===
    "vendido"
  ) {
    throw new Error(
      "No se puede eliminar un equipo vendido. Primero debe corregirse o eliminarse la venta relacionada."
    );
  }

  /*
   * Si el equipo fue registrado o transferido por error,
   * eliminamos también sus movimientos para no dejar
   * registros innecesarios en Firestore.
   */
  const consultaMovimientos =
    query(
      collection(
        db,
        "movimientosEquipos"
      ),
      where(
        "equipoId",
        "==",
        equipo.id
      )
    );

  const movimientos =
    await getDocs(
      consultaMovimientos
    );

  if (
    movimientos.size + 1 >
    500
  ) {
    throw new Error(
      "Este equipo tiene demasiados movimientos para eliminarlo en una sola operación."
    );
  }

  const lote =
    writeBatch(db);

  movimientos.docs.forEach(
    (documento) => {
      lote.delete(
        documento.ref
      );
    }
  );

  lote.delete(
    equipoRef
  );

  await lote.commit();
}


/* =========================================================
   DESACTIVAR EQUIPO
========================================================= */

export async function desactivarEquipo(
  equipoId
) {
  if (!equipoId) {
    throw new Error(
      "No se encontró el equipo."
    );
  }

  const cambios = {
    activo:
      false,

    fechaActualizacion:
      serverTimestamp(),
  };

  if (
    auth.currentUser?.uid
  ) {
    cambios.usuarioActualizacionId =
      auth.currentUser.uid;
  }

  await updateDoc(
    doc(
      db,
      "equipos",
      equipoId
    ),
    cambios
  );
}
