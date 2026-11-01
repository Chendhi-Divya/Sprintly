
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import Navbar from "../components/Navbar";
import Dashboard from "./Dashboard";
import type { RootState } from "../store/store";

type DashboardLocationState = {
  selectedProjectId?: string;
};

type ProjectSelection = {
  organizationId: string;
  projectId: string;
};

const getRecentProjectKey = (organizationId: string) =>
  `sprintly_recent_project_${organizationId}`;

export default function WorkspaceLayout() {
  const location = useLocation();

  const selectedOrganization = useSelector(
    (state: RootState) => state.auth.selectedOrganization
  );

  const organizationId = selectedOrganization?._id || "";

  const [selection, setSelection] = useState<ProjectSelection>({
    organizationId: "",
    projectId: "",
  });

  // Restore the selected project when the organization or route changes.
  useEffect(() => {
    if (!organizationId) {
      setSelection({
        organizationId: "",
        projectId: "",
      });
      return;
    }

    const state = location.state as DashboardLocationState | null;

    let projectId = state?.selectedProjectId || "";

    // If no project was passed through navigation, use the saved project.
    if (!projectId) {
      try {
        projectId =
          localStorage.getItem(
            getRecentProjectKey(organizationId)
          ) || "";
      } catch {
        projectId = "";
      }
    }

    setSelection({
      organizationId,
      projectId,
    });
  }, [organizationId, location.state]);

  // Save the selected project for the current organization.
  useEffect(() => {
    if (
      !organizationId ||
      selection.organizationId !== organizationId ||
      !selection.projectId
    ) {
      return;
    }

    try {
      localStorage.setItem(
        getRecentProjectKey(organizationId),
        selection.projectId
      );
    } catch {
      // Ignore localStorage errors.
    }
  }, [organizationId, selection]);

  // Prevent using a project belonging to a previously selected organization.
  const selectedProjectId =
    selection.organizationId === organizationId
      ? selection.projectId
      : "";

  // Called whenever the user changes the project.
  const handleProjectChange = (projectId: string) => {
    if (!organizationId || !projectId) {
      return;
    }

    setSelection({
      organizationId,
      projectId,
    });

    // Save immediately for this organization.
    try {
      localStorage.setItem(
        getRecentProjectKey(organizationId),
        projectId
      );
    } catch {
      // Ignore localStorage errors.
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar selectedProjectId={selectedProjectId} />

      <Dashboard
        selectedProjectId={selectedProjectId}
        onProjectChange={handleProjectChange}
      />
    </div>
  );
}
