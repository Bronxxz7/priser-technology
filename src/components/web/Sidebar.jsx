import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  WalletCards,
  ShoppingCart,
  ReceiptText,
  CircleDollarSign,
  ArrowUpFromLine,
  Package,
  Smartphone,
  ClipboardCheck,
  BarChart3,
  Store,
  Users,
  Settings,
} from "lucide-react";

import "./Sidebar.css";

const menuPrincipal = [
  { nombre: "Dashboard", ruta: "/admin", icono: LayoutDashboard, end: true },
  { nombre: "Caja", ruta: "/admin/caja", icono: WalletCards },
  { nombre: "Ventas", ruta: "/admin/ventas", icono: ShoppingCart },
  { nombre: "Gastos", ruta: "/admin/gastos", icono: ReceiptText },
  { nombre: "Ingresos", ruta: "/admin/ingresos", icono: CircleDollarSign },
  { nombre: "Retiros", ruta: "/admin/retiros", icono: ArrowUpFromLine },
];

const menuInventario = [
  { nombre: "Inventario", ruta: "/admin/inventario", icono: Package },
  { nombre: "Equipos", ruta: "/admin/equipos", icono: Smartphone },
];

const menuControl = [
  { nombre: "Cierres", ruta: "/admin/cierres", icono: ClipboardCheck },
  { nombre: "Reportes", ruta: "/admin/reportes", icono: BarChart3 },
];

const menuAdministracion = [
  { nombre: "Tiendas", ruta: "/admin/tiendas", icono: Store },
  { nombre: "Usuarios", ruta: "/admin/usuarios", icono: Users },
  { nombre: "Configuración", ruta: "/admin/configuracion", icono: Settings },
];

function MenuItems({ items }) {
  return items.map((item) => {
    const Icono = item.icono;

    return (
      <NavLink
        key={item.ruta}
        to={item.ruta}
        end={item.end}
        className={({ isActive }) =>
          `sidebar__link ${isActive ? "sidebar__link--active" : ""}`
        }
      >
        <Icono size={20} strokeWidth={1.8} />
        <span>{item.nombre}</span>
      </NavLink>
    );
  });
}

function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo-box">
          <img
            src="/logo-tienda.png"
            alt="Logo tienda"
            className="sidebar__logo-img"
          />
        </div>

        <div className="sidebar__brand-info">
          <strong>Priser Thecnology</strong>
         
        </div>
      </div>

      <div className="sidebar__scroll">
        <nav className="sidebar__section">
          <p className="sidebar__section-title">OPERACIONES</p>
          <MenuItems items={menuPrincipal} />
        </nav>

        <nav className="sidebar__section">
          <p className="sidebar__section-title">PRODUCTOS</p>
          <MenuItems items={menuInventario} />
        </nav>

        <nav className="sidebar__section">
          <p className="sidebar__section-title">CONTROL</p>
          <MenuItems items={menuControl} />
        </nav>

        <nav className="sidebar__section">
          <p className="sidebar__section-title">ADMINISTRACIÓN</p>
          <MenuItems items={menuAdministracion} />
        </nav>
      </div>
    </aside>
  );
}

export default Sidebar;