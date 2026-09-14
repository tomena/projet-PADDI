import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "./DashboardLayout.css";

export default function DashboardLayout() {
  return (
    <div className="dashboard-layout">

      {/* MENU LATÉRAL */}
      <Sidebar />

      {/* CONTENU */}
      <main className="dashboard-content">
        <Outlet />
      </main>

    </div>
  );
}