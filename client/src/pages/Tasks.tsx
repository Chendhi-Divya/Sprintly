
import { useGetTasksQuery } from "../services/taskApi";
import type { Task } from "../services/taskApi";

function Tasks() {
  const { data, isLoading, isError } = useGetTasksQuery();

  if (isLoading) {
    return <div className="p-6">Loading tasks...</div>;
  }

  if (isError) {
    return (
      <div className="p-6 text-red-500">
        Unable to fetch tasks. Please check your login and backend.
      </div>
    );
  }

  const tasks = data?.tasks ?? [];

  return (
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
                    Parent Task:{" "}
                    {parent?.title ?? "No parent task"}
                  </p>

                  <p>Type: {task.type}</p>
                  <p>Status: {task.status}</p>
                  <p>Priority: {task.priority}</p>

                  <p>
                    Assignee:{" "}
                    {assignee?.name ?? "Unassigned"}
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
  );
}

export default Tasks;
