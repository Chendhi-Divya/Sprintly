import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";

import { logout } from "../store/authSlice";

function Dashboard() {

  const dispatch = useDispatch();

  const navigate = useNavigate();

  //Get logged-in user from Redux.
  const user = useSelector((state: any) => state.auth.user);

  const handleLogout = () => {

    //Remove authentication information.
    dispatch(logout());

    //Go back to login page.
    navigate("/login");
  };

  return (
    <div>

      <h1>Dashboard</h1>

      {user && (
        <p>
          Welcome, {user.name}
        </p>
      )}

      <button onClick={handleLogout}>
        Logout
      </button>

    </div>
  );
}

export default Dashboard;