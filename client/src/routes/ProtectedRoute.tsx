import { useEffect } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useDispatch } from "react-redux";
import { useGetCurrentUserQuery } from "../services/authApi";
import { logout, setCredentials } from "../store/authSlice";

export default function ProtectedRoute() {
  const dispatch = useDispatch();
  const { data, isLoading, isError } = useGetCurrentUserQuery();
  const user = data?.user;

  useEffect(() => {
    if (user) {
      dispatch(setCredentials({ user }));
    } else if (isError) {
      dispatch(logout());
    }
  }, [dispatch, isError, user]);

  if (isLoading) {
    return <p className="p-6 text-center">Checking your session…</p>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  return <Outlet />;
}