
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logout } from "../store/authSlice";
import { useLogoutMutation } from "../services/authApi";
import Tasks from "./Tasks";

export default function Dashboard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [logoutRequest] = useLogoutMutation();

  const handleLogout = async () => {
    try {
      await logoutRequest().unwrap();
    } catch {
      // Always clear the local user state, even if the server is unavailable.
    } finally {
      dispatch(logout());
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top navigation */}
      <div className="flex items-center justify-between bg-white border-b px-6 py-4">
        <h1 className="text-xl font-bold">Sprintly</h1>

        <button
          onClick={handleLogout}
          className="rounded-md bg-red-500 px-4 py-2 text-white hover:bg-red-600"
        >
          Logout
        </button>
      </div>

      {/* Tasks section */}
      <Tasks />
    </div>
  );
}
