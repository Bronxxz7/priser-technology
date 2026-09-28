import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import { db } from "../firebase/firebaseConfig";


/* =========================================================
   ESCUCHAR EQUIPOS PARA INVENTARIO
========================================================= */

export function suscribirseInventario(callback) {
  return onSnapshot(
    collection(db, "equipos"),

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
          const marcaA = String(
            a.marca || ""
          );

          const marcaB = String(
            b.marca || ""
          );

          const marca = marcaA.localeCompare(
            marcaB,
            "es"
          );

          if (marca !== 0) {
            return marca;
          }

          return String(
            a.modelo || ""
          ).localeCompare(
            String(
              b.modelo || ""
            ),
            "es"
          );
        });

      callback(equipos);
    },

    (error) => {
      console.error(
        "Error leyendo inventario:",
        error
      );

      callback([]);
    }
  );
}


/* =========================================================
   ESCUCHAR MOVIMIENTOS DE EQUIPOS
========================================================= */

export function suscribirseMovimientosInventario(
  callback
) {
  return onSnapshot(
    collection(
      db,
      "movimientosEquipos"
    ),

    (snapshot) => {
      const movimientos =
        snapshot.docs
          .map(
            (documento) => ({
              id:
                documento.id,

              ...documento.data(),
            })
          )
          .sort((a, b) => {
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
          });

      callback(
        movimientos
      );
    },

    (error) => {
      console.error(
        "Error leyendo movimientos de inventario:",
        error
      );

      callback([]);
    }
  );
}
