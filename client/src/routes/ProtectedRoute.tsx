import { Navigate, Outlet } from "react-router-dom";
import { useSelector } from "react-redux";

function ProtectedRoute() {

  //Get the token from Redux.
  const token = useSelector((state: any) => state.auth.token);

  //If there is no token, send the user to login.
  if (!token) {
    return <Navigate to="/login" />;
  }

  //If token exists, allow the user to access the page.
  return <Outlet />;
}

export default ProtectedRoute;