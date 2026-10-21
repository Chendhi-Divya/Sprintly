
import { useGetTasksQuery } from "../services/taskApi";

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
          {tasks.map((task) => (
            <div
              key={task._id}
              className="rounded-lg border bg-white p-4 shadow-sm"
            >
              <h2 className="text-lg font-semibold">
                {task.title}
              </h2>

              {task.description && (
                <p className="mt-1 text-sm text-gray-600">
                  {task.description}
                </p>
              )}

              <div className="mt-3 space-y-1 text-sm">
                <p>Type: {task.type}</p>
                <p>Status: {task.status}</p>
                <p>Priority: {task.priority}</p>
                <p>Assignee: {task.assignee?.name ?? "Unassigned"}</p>
                <p>Project: {task.project?.name ?? "No project"}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Tasks;
