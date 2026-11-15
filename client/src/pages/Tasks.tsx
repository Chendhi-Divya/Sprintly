
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";

import { useGetTasksQuery, useGetProjectsQuery } from "../services/taskApi";
import type { Task } from "../services/taskApi";
import type { RootState } from "../store/store";

import Navbar from "../components/Navbar";

const getRecentProjectKey = (organizationId: string) =>
  `sprintly_recent_project_${organizationId}`;

function Tasks() {
  const selectedOrganization = useSelector(
    (state: RootState) => state.auth.selectedOrganization
  );

  const organizationId = selectedOrganization?._id || "";

  const [selectedProjectId, setSelectedProjectId] = useState("");

  const { data: projectsData } = useGetProjectsQuery(organizationId, {
    skip: !organizationId,
  });

  const projects = projectsData?.projects ?? [];

  const { data, isLoading, isError } = useGetTasksQuery();

  // Restore the last selected project when projects are loaded.
  useEffect(() => {
    if (!organizationId || projects.length === 0) {
      return;
    }

    let recentProjectId = "";

    try {
      recentProjectId =
        localStorage.getItem(
          getRecentProjectKey(organizationId)
        ) || "";
    } catch {
      recentProjectId = "";
    }

    const savedProject = projects.find(
      (project) => project._id === recentProjectId
    );

    const projectToSelect = savedProject ?? projects[0];

    setSelectedProjectId(projectToSelect._id);

    try {
      localStorage.setItem(
        getRecentProjectKey(organizationId),
        projectToSelect._id
      );
    } catch {
      // Ignore localStorage errors.
    }
  }, [organizationId, projects]);

  if (isLoading) {
    return (
      <>
        <Navbar selectedProjectId={selectedProjectId} />
        <div className="p-6">Loading tasks...</div>
      </>
    );
  }

  if (isError) {
    return (
      <>
        <Navbar selectedProjectId={selectedProjectId} />
        <div className="p-6 text-red-500">
          Unable to fetch tasks. Please check your login and backend.
        </div>
      </>
    );
  }

  const tasks = data?.tasks ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar selectedProjectId={selectedProjectId} />

      <div className="p-6">
        <h1 className="mb-2 text-2xl font-bold">Tasks</h1>

        <p className="mb-6 text-gray-500">
          Total tasks: {tasks.length}
        </p>

        {tasks.length === 0 ? (
          <p>No tasks found.</p>
        ) : (
          <div className="space-y-4">
            {tasks.map((task: Task) => {
              const parent =
                typeof task.parentTask === "object" &&
                task.parentTask !== null
                  ? task.parentTask
                  : null;

              const assignee =
                typeof task.assignee === "object" &&
                task.assignee !== null
                  ? task.assignee
                  : null;

              const project =
                typeof task.project === "object" &&
                task.project !== null
                  ? task.project
                  : null;

              return (
                <div
                  key={task._id}
                  className="rounded-lg border bg-white p-4 shadow-sm"
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold">
                      {task.title}
                    </h2>

                    <span className="rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                      {task.taskKey ?? "ID not available"}
                    </span>
                  </div>

                  {task.description && (
                    <p className="mt-1 text-sm text-gray-600">
                      {task.description}
                    </p>
                  )}

                  <div className="mt-3 space-y-1 text-sm">
                    <p>
                      Parent Task: {parent?.title ?? "No parent task"}
                    </p>

                    <p>Type: {task.type}</p>
                    <p>Status: {task.status}</p>
                    <p>Priority: {task.priority}</p>

                    <p>
                      Assignee: {assignee?.name ?? "Unassigned"}
                    </p>

                    <p>
                      Project: {project?.name ?? "No project"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default Tasks;
