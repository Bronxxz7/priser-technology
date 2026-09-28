import { Outlet } from "react-router-dom";

import Sidebar from "./Sidebar";
import Header from "./Header";

import "./WebLayout.css";

function WebLayout() {
  return (
    <div className="web-layout">

      <Sidebar />

      <div className="web-layout__body">

        <Header />

        <main className="web-layout__main">
          <Outlet />
        </main>

      </div>

    </div>
  );
}

export default WebLayout;