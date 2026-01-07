import { createBrowserRouter } from "react-router-dom";
import App from "../app/App";

import LoginPage from "../pages/Login/LoginPage";
import TwoFAPage from "../pages/TwoFA/TwoFAPage";
import ApprovalPage from "../pages/Approval/ApprovalPage";
import DashboardPage from "../pages/Dashboard/DashboardPage";
import AdminProtectedRoute from "../pages/Dashboard/sections/AdminProtectedRoute";

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <LoginPage /> },
      { path: "2fa", element: <TwoFAPage /> },
      { path: "approval", element: <ApprovalPage /> },
      {
        element: <AdminProtectedRoute />,
        children: [{ path: "dashboard", element: <DashboardPage /> }],
      },
    ],
  },
]);

export default router;
