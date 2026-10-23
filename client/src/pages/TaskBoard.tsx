
import { useState } from "react";

import {
  useGetTasksQuery,
  useUpdateTaskMutation,
} from "../services/taskApi";

import TaskCard from "../components/TaskCard";

type TaskStatus =
  | "To Do"
  | "In Progress"
  | "In Review"
  | "Done";

type TaskBoardProps = {
  selectedProjectId: string;
};

const columns: { title: string; status: TaskStatus }[] = [
  { title: "To Do", status: "To Do" },
  { title: "In Progress", status: "In Progress" },
  { title: "In Review", status: "In Review" },
  { title: "Done", status: "Done" },
];

function getApiErrorMessage(error: unknown): string {
  if (typeof error !== "object" || error === null) {
    return "Unable to update task status. Please try again.";
  }

  const apiError = error as {
    status?: number | string;
    data?: {
      message?: string;
      error?: string;
    };
    error?: string;
  };

  if (apiError.data?.message) return apiError.data.message;
  if (apiError.data?.error) return apiError.data.error;

  if (apiError.status === 401) {
    return "Your session may have expired. Please log in again.";
  }

  if (apiError.status === 403) {
    return "You are not authorized to update this task.";
  }

  if (apiError.error) return apiError.error;

  return "Unable to update task status. Please try again.";
}

export default function TaskBoard({
  selectedProjectId,
}: TaskBoardProps) {
  const { data, isLoading, isError, error } = useGetTasksQuery();

  const [updateTask, { isLoading: isUpdating }] =
    useUpdateTaskMutation();

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // All tasks returned by the API.
  const allTasks = data?.tasks ?? [];

  // Keep only tasks belonging to the selected project.
  const tasks = allTasks.filter((task) => {
    const taskProjectId =
      typeof task.project === "string"
        ? task.project
        : task.project?._id;

    return (
      selectedProjectId !== "" &&
      taskProjectId === selectedProjectId
    );
  });

  async function handleStatusChange(
    taskId: string,
    status: TaskStatus
  ) {
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await updateTask({
        id: taskId,
        status,
      }).unwrap();

    } catch (error: unknown) {
      console.error("Failed to update task status:", error);
      setErrorMessage(getApiErrorMessage(error));
    }
  }

  const statusChangeProps = {
    onStatusChange: handleStatusChange,
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white p-6 text-sm text-gray-600">
        Loading task board...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-white p-6 text-red-600">
        <h2 className="text-xl font-bold">
          Failed to load tasks
        </h2>

        <pre className="mt-3 whitespace-pre-wrap text-sm">
          {JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-4 text-gray-900 sm:p-6">
      {/* Board heading */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Task Board
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Manage and track your tasks across all stages.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm">
          <span className="text-sm text-gray-500">
            Total tasks:{" "}
          </span>

          <span className="font-semibold text-gray-900">
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Success message */}
      {successMessage && (
        <p
          role="status"
          className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700"
        >
          {successMessage}
        </p>
      )}

      {/* Error message */}
      {errorMessage && (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      )}

      {isUpdating && (
        <p className="mb-4 text-sm text-blue-600">
          Saving task status...
        </p>
      )}

      {/* Four task columns */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((column) => {
          const columnTasks = tasks.filter(
            (task) => task.status === column.status
          );

          return (
            <section
              key={column.status}
              className="min-h-80 rounded-xl border border-gray-200 bg-gray-50 p-3"
            >
              {/* Column heading */}
              <div className="mb-4 flex items-center justify-between px-1">
                <h3 className="font-semibold text-gray-800">
                  {column.title}
                </h3>

                <span className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-600">
                  {columnTasks.length}
                </span>
              </div>

              {/* Task cards */}
              <div className="space-y-3">
                {columnTasks.map((task) => (
                  <TaskCard
                    key={task._id}
                    task={task}
                    {...statusChangeProps}
                    isUpdating={isUpdating}
                  />
                ))}

                {columnTasks.length === 0 && (
                  <p className="rounded-lg border border-dashed border-gray-300 bg-white p-4 text-center text-sm text-gray-500">
                    No tasks in this column
                  </p>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
