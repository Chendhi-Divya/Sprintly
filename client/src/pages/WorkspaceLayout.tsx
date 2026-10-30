
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import Navbar from "../components/Navbar";
import Dashboard from "./Dashboard";

type DashboardLocationState = {
  selectedProjectId?: string;
};

export default function WorkspaceLayout() {
  const location = useLocation();

  const [selectedProjectId, setSelectedProjectId] = useState("");

  useEffect(() => {
    const state = location.state as DashboardLocationState | null;

    if (state?.selectedProjectId) {
      setSelectedProjectId(state.selectedProjectId);
    }
  }, [location.state]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar selectedProjectId={selectedProjectId} />

      <Dashboard
        selectedProjectId={selectedProjectId}
        onProjectChange={setSelectedProjectId}
      />
    </div>
  );
}
