import {
  Route,
  Routes,
} from "react-router-dom";

import WebLayout from "../components/web/WebLayout";

import Dashboard from "../web/dashboard/Dashboard";

import Caja from "../web/caja/Caja";
import Ventas from "../web/ventas/Ventas";
import Gastos from "../web/gastos/Gastos";
import Ingresos from "../web/ingresos/Ingresos";
import Retiros from "../web/retiros/Retiros";
import Inventario from "../web/inventario/Inventario";
import Equipos from "../web/equipos/Equipos";
import Cierres from "../web/cierres/Cierres";
import Reportes from "../web/reportes/Reportes";
import Tiendas from "../web/tiendas/Tiendas";
import Usuarios from "../web/usuarios/Usuarios";
import Configuracion from "../web/configuracion/Configuracion";

function AdminRoutes() {
  return (
    <Routes>

      <Route element={<WebLayout />}>

        <Route
          index
          element={<Dashboard />}
        />

        <Route
          path="caja"
          element={<Caja />}
        />

        <Route
          path="ventas"
          element={<Ventas />}
        />

        <Route
          path="gastos"
          element={<Gastos />}
        />

        <Route
          path="ingresos"
          element={<Ingresos />}
        />

        <Route
          path="retiros"
          element={<Retiros />}
        />

        <Route
          path="inventario"
          element={<Inventario />}
        />

        <Route
          path="equipos"
          element={<Equipos />}
        />

        <Route
          path="cierres"
          element={<Cierres />}
        />

        <Route
          path="reportes"
          element={<Reportes />}
        />

        <Route
          path="tiendas"
          element={<Tiendas />}
        />

        <Route
          path="usuarios"
          element={<Usuarios />}
        />

        <Route
          path="configuracion"
          element={<Configuracion />}
        />

      </Route>

    </Routes>
  );
}

export default AdminRoutes;