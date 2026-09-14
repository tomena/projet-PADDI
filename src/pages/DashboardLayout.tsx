import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";

export default function DashboardLayout() {
  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        overflow: "hidden",
        background: "#f3f4f6",
      }}
    >
      <Sidebar />

      <main
        style={{
          flex: 1,
          overflowY: "auto",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
