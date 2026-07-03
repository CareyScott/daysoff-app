import { createBrowserRouter, Navigate } from "react-router-dom";
import { Layout } from "@/components/app/Layout";
import { RequireAuth } from "@/components/app/RequireAuth";
import { RequireAdmin } from "@/components/app/RequireAdmin";
import { Login } from "@/routes/Login";
import { MyCalendar } from "@/routes/MyCalendar";
import { Team } from "@/routes/Team";
import { AdminUsers } from "@/routes/AdminUsers";
import { Settings } from "@/routes/Settings";

export const router = createBrowserRouter([
  { path: "/login", element: <Login /> },
  {
    path: "/",
    element: <RequireAuth />,
    children: [
      {
        element: <Layout />,
        children: [
          { index: true, element: <MyCalendar /> },
          { path: "team", element: <Team /> },
          {
            element: <RequireAdmin />,
            children: [{ path: "users", element: <AdminUsers /> }],
          },
          { path: "settings", element: <Settings /> },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
