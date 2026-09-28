import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

export default function ProtectedRoute() {
  const token = useSelector(
    (state: any) => state.auth.token
  );

  if (!token) {
    return <Navigate to="/login" />;
  }

  return <Outlet />;
}