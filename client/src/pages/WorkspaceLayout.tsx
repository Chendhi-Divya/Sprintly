import { useState } from "react";
import Navbar from "../components/Navbar";
import Dashboard from "./Dashboard";

export default function WorkspaceLayout() {
  const [selectedProjectId, setSelectedProjectId] =
    useState("");

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