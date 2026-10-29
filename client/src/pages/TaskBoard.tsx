import { useMemo, useState } from "react";

import {
  useGetTasksQuery,
  useUpdateTaskMutation,
  type TaskStatus,
} from "../services/taskApi";

import type { TaskFilters } from "./Dashboard";
import TaskCard from "../components/TaskCard";

type ViewType = "List" | "Board";

type TaskBoardProps = {
  selectedProjectId: string;
  activeView: ViewType;
  searchText: string;
  filters: TaskFilters;
};

const columns: TaskStatus[] = [
  "To Do",
  "In Progress",
  "In Review",
  "Done",
];

export default function TaskBoard({
  selectedProjectId,
  activeView,
  searchText,
  filters,
}: TaskBoardProps) {
  const { data, isLoading } = useGetTasksQuery();

  const [updateTask, { isLoading: isUpdatingTask }] =
    useUpdateTaskMutation();

  const [message, setMessage] = useState("");

  // Get tasks belonging to the selected project.
  const tasks = useMemo(() => {
    return (data?.tasks ?? []).filter((task) => {
      const projectId =
        typeof task.project === "string"
          ? task.project
          : task.project?._id;

      return projectId === selectedProjectId;
    });
  }, [data?.tasks, selectedProjectId]);

  // Apply the shared search and filters.
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const search = searchText.trim().toLowerCase();

      const matchesSearch =
        task.title.toLowerCase().includes(search) ||
        (task.description ?? "").toLowerCase().includes(search);

      const matchesStatus =
        !filters.status || task.status === filters.status;

      const matchesPriority =
        !filters.priority || task.priority === filters.priority;

      const assigneeId =
        typeof task.assignee === "string"
          ? task.assignee
          : task.assignee?._id ?? "";

      const matchesAssignee =
        !filters.assignee ||
        (filters.assignee === "unassigned"
          ? !task.assignee
          : assigneeId === filters.assignee);

      const matchesType =
        !filters.type || task.type === filters.type;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesAssignee &&
        matchesType
      );
    });
  }, [tasks, searchText, filters]);

  // Update task status through the existing API.
  async function handleStatusChange(
    taskId: string,
    status: TaskStatus
  ) {
    setMessage("");

    try {
      await updateTask({ id: taskId, status }).unwrap();
    } catch {
      setMessage("Failed to update task status.");
    }
  }

  if (isLoading) {
    return <p className="p-6">Loading tasks...</p>;
  }

  return (
    <div className="min-h-screen bg-white p-6 text-gray-900">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">
          {activeView === "List" ? "Task List" : "Task Board"}
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Manage and track your tasks.
        </p>
      </div>

      {message && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {message}
        </p>
      )}

      <p className="mb-4 text-sm text-gray-500">
        Showing {filteredTasks.length} of {tasks.length} tasks
      </p>

      {/* List view */}
      {activeView === "List" ? (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[950px] border-collapse text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="w-28 px-4 py-3 font-semibold">Key</th>
                <th className="px-4 py-3 font-semibold">Task</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Priority</th>
                <th className="px-4 py-3 font-semibold">Assignee</th>
                <th className="px-4 py-3 font-semibold">Reporter</th>
                <th className="px-4 py-3 font-semibold">Due Date</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredTasks.map((task) => {
                const assignee =
                  typeof task.assignee === "object" &&
                  task.assignee
                    ? task.assignee.name
                    : "Unassigned";

                const reporter =
                  typeof task.reporter === "object" &&
                  task.reporter
                    ? task.reporter.name
                    : "—";

                return (
                  <tr
                    key={task._id}
                    className="transition hover:bg-gray-50"
                  >
                    <td className="px-4 py-4 font-mono text-xs font-medium text-blue-700">
                      {task.taskKey ?? "—"}
                    </td>

                    <td className="max-w-xs px-4 py-4">
                      <p className="font-medium text-gray-900">
                        {task.title}
                      </p>
                    </td>

                    <td className="px-4 py-4">{task.type}</td>

                    <td className="px-4 py-4">
                      <select
                        value={task.status}
                        disabled={isUpdatingTask}
                        onChange={(event) =>
                          handleStatusChange(
                            task._id,
                            event.target.value as TaskStatus
                          )
                        }
                        className="rounded-md border bg-white px-2 py-1.5 text-xs disabled:opacity-50"
                        aria-label={`Status for ${task.title}`}
                      >
                        {columns.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                          task.priority === "High"
                            ? "bg-orange-100 text-orange-700"
                            : task.priority === "Medium"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {task.priority}
                      </span>
                    </td>

                    <td className="px-4 py-4">{assignee}</td>
                    <td className="px-4 py-4">{reporter}</td>

                    <td className="whitespace-nowrap px-4 py-4 text-gray-600">
                      {task.dueDate
                        ? new Date(
                            task.dueDate
                          ).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                );
              })}

              {filteredTasks.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    No tasks match your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Board view: preserve the four-column layout */
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((status) => {
            const columnTasks = filteredTasks.filter(
              (task) => task.status === status
            );

            return (
              <section
                key={status}
                className="min-h-80 rounded-xl border bg-gray-50 p-3"
              >
                <div className="mb-4 flex justify-between">
                  <h3 className="font-semibold">{status}</h3>

                  <span className="rounded-full border bg-white px-2">
                    {columnTasks.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {columnTasks.map((task) => (
                    <TaskCard
                      key={task._id}
                      task={{
                        ...task,
                        assignee:
                          typeof task.assignee === "object" &&
                          task.assignee !== null
                            ? task.assignee
                            : undefined,
                      }}
                      isUpdating={isUpdatingTask}
                      onStatusChange={handleStatusChange}
                    />
                  ))}

                  {columnTasks.length === 0 && (
                    <p className="rounded-lg border border-dashed bg-white p-4 text-center text-sm text-gray-500">
                      No tasks in this column
                    </p>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}