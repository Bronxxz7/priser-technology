import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";


function convertirSnapshot(snapshot) {
  return snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data(),
  }));
}


/* =========================================================
   ESCUCHAR TODOS LOS DATOS NECESARIOS PARA REPORTES
========================================================= */

export function suscribirseDatosReportes(callback) {
  const datos = {
    ventas: [],
    ingresos: [],
    gastos: [],
    retiros: [],
    equipos: [],
  };

  const emitir = () => {
    callback({
      ventas: [...datos.ventas],
      ingresos: [...datos.ingresos],
      gastos: [...datos.gastos],
      retiros: [...datos.retiros],
      equipos: [...datos.equipos],
    });
  };

  const canceladores = [];

  const escuchar = (nombreColeccion, clave) => {
    const cancelar = onSnapshot(
      collection(db, nombreColeccion),

      (snapshot) => {
        datos[clave] = convertirSnapshot(snapshot);
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

    canceladores.push(cancelar);
  };

  escuchar("ventas", "ventas");
  escuchar("ingresos", "ingresos");
  escuchar("gastos", "gastos");
  escuchar("retiros", "retiros");
  escuchar("equipos", "equipos");

  return () => {
    canceladores.forEach((cancelar) => {
      cancelar?.();
    });
  };
}
