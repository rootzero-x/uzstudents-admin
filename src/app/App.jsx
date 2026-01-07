import { Outlet } from "react-router-dom";
import { AdminAuthProvider } from "../context/AdminAuthContext";

export default function App() {
  return (
    <AdminAuthProvider>
      <Outlet />
    </AdminAuthProvider>
  );
}
