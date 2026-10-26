
import { useState } from "react";

import {
  useGetTasksQuery,
  useUpdateTaskMutation,
  useGetProjectMembersQuery,
  type TaskStatus,
} from "../services/taskApi";

import TaskCard from "../components/TaskCard";

type TaskBoardProps = {
  selectedProjectId: string;
};

const columns: TaskStatus[] = [
  "To Do",
  "In Progress",
  "In Review",
  "Done",
];

export default function TaskBoard({
  selectedProjectId,
}: TaskBoardProps) {
  // Fetch tasks for the board
  const { data, isLoading } = useGetTasksQuery();

  // Fetch members of the selected project
  const { data: membersData } = useGetProjectMembersQuery(
    selectedProjectId,
    {
      skip: !selectedProjectId,
    }
  );

  const [updateTask, { isLoading: isUpdatingTask }] =
    useUpdateTaskMutation();

  const [message, setMessage] = useState("");

  // Get tasks belonging to the selected project
  const tasks = (data?.tasks ?? []).filter((task) => {
    const projectId =
      typeof task.project === "string"
        ? task.project
        : task.project?._id;

    return projectId === selectedProjectId;
  });

  const members = membersData?.members ?? [];

  // Update task status
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
      {/* Heading */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">Task Board</h2>
        <p className="text-sm text-gray-500">
          Manage and track your tasks.
        </p>
      </div>

      {/* Status message */}
      {message && (
        <p className="mb-4 rounded-lg bg-gray-100 p-3 text-sm">
          {message}
        </p>
      )}

      {/* Task board columns */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {columns.map((status) => {
          const columnTasks = tasks.filter(
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
                      project:
                        typeof task.project === "object" &&
                        task.project !== null
                          ? task.project
                          : undefined,
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
    </div>
  );
}
