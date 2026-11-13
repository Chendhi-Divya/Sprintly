
import { useMemo, useState } from "react";
import { ChevronDown, LoaderCircle } from "lucide-react";

import {
  taskApi,
  useGetTasksQuery,
  useUpdateTaskMutation,
  useGetProjectSprintsQuery,
  type TaskStatus,
} from "../services/taskApi";

import type { TaskFilters } from "./Dashboard";
import TaskCard from "../components/TaskCard";
import TaskDetailsPanel from "../components/TaskDetailsPanel";
import SprintsView from "../components/SprintsView";

type ViewType = "List" | "Board" | "Sprints";

type TaskBoardProps = {
  selectedProjectId: string;
  activeView: ViewType;
  searchText: string;
  filters: TaskFilters;
  selectedSprintAssigneeId: string;
  selectedTaskId: string | null;
  onTaskOpen: (taskId: string) => void;
  onTaskClose: () => void;
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
  selectedSprintAssigneeId,
  selectedTaskId,
  onTaskOpen,
  onTaskClose,
}: TaskBoardProps) {
  const { data, isLoading, isError } = useGetTasksQuery();

  // Fetch all project sprints, including completed sprints.
  const { data: sprintData } = useGetProjectSprintsQuery(
    selectedProjectId,
    {
      skip: !selectedProjectId,
    }
  );

  const [updateTask] = useUpdateTaskMutation();
  const prefetchTask = taskApi.usePrefetch("getTaskById");

  const [message, setMessage] = useState("");

  const [updatingTaskIds, setUpdatingTaskIds] = useState<Set<string>>(
    () => new Set()
  );

  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  const [dragOverStatus, setDragOverStatus] =
    useState<TaskStatus | null>(null);

  const allTasks = data?.tasks ?? [];
  const projectSprints = sprintData?.sprints ?? [];

  // Get tasks belonging to the selected project.
  const tasks = useMemo(() => {
    return allTasks.filter((task) => {
      const projectId =
        typeof task.project === "string"
          ? task.project
          : task.project?._id;

      return projectId === selectedProjectId;
    });
  }, [allTasks, selectedProjectId]);

  // Map every task to its sprint title.
  // Completed sprint associations are retained for the List view.
  const sprintByTaskId = useMemo(() => {
    const sprintMap = new Map<string, string>();

    projectSprints.forEach((sprint) => {
      sprint.tasks.forEach((sprintTask) => {
        sprintMap.set(sprintTask._id, sprint.title);
      });
    });

    return sprintMap;
  }, [projectSprints]);

  // Find the current Active Sprint.
  const activeSprint = useMemo(() => {
    return projectSprints.find(
      (sprint) => sprint.status === "Active"
    );
  }, [projectSprints]);

  // Get only the task IDs belonging to the Active Sprint.
  const activeSprintTaskIds = useMemo(() => {
    return new Set(
      activeSprint?.tasks.map((task) => task._id) ?? []
    );
  }, [activeSprint]);

  // Apply search and filters for List and Board views.
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

  // Board view: only tasks belonging to the Active Sprint.
  const activeSprintTasks = useMemo(() => {
    return filteredTasks.filter((task) =>
      activeSprintTaskIds.has(task._id)
    );
  }, [filteredTasks, activeSprintTaskIds]);

  // Prefetch task details before the user clicks.
  function handleTaskHover(taskId: string) {
    prefetchTask(taskId, { ifOlderThan: 30 });
  }

  // Update task status.
  async function handleStatusChange(
    taskId: string,
    status: TaskStatus
  ) {
    setMessage("");

    setUpdatingTaskIds((current) => {
      const next = new Set(current);
      next.add(taskId);
      return next;
    });

    try {
      await updateTask({
        id: taskId,
        status,
      }).unwrap();
    } catch {
      setMessage("Failed to update task status.");
    } finally {
      setUpdatingTaskIds((current) => {
        const next = new Set(current);
        next.delete(taskId);
        return next;
      });
    }
  }

  // Find the selected task in the complete task list.
  // This also works when a notification opens a task from another project.
  const selectedTask = allTasks.find(
    (task) => task._id === selectedTaskId
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 p-10 text-gray-500">
        <LoaderCircle size={18} className="animate-spin" />
        Loading tasks...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-6 text-sm text-red-600">
        Failed to load tasks. Please refresh and try again.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white p-6 text-gray-900">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold">
          {activeView === "List"
            ? "Task List"
            : activeView === "Sprints"
              ? "Project Sprints"
              : "Task Board"}
        </h2>

        <p className="mt-1 text-sm text-gray-500">
          Manage and track your tasks.
        </p>
      </div>

      {/* Error message */}
      {message && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {message}
        </p>
      )}

      {/* Task count */}
      {activeView !== "Sprints" && (
        <p className="mb-4 text-sm text-gray-500">
          {activeView === "Board"
            ? `Showing ${activeSprintTasks.length} Active Sprint tasks`
            : `Showing ${filteredTasks.length} of ${tasks.length} tasks`}
        </p>
      )}

      {activeView === "Sprints" ? (
        <SprintsView
          projectId={selectedProjectId}
          searchText={searchText}
          selectedAssigneeId={selectedSprintAssigneeId}
          onTaskOpen={onTaskOpen}
        />
      ) : activeView === "List" ? (
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="w-28 px-4 py-3 font-semibold">Key</th>
                <th className="px-4 py-3 font-semibold">Task</th>
                <th className="px-4 py-3 font-semibold">Sprint</th>
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
                  task.assignee !== null
                    ? task.assignee.name
                    : "Unassigned";

                const reporter =
                  typeof task.reporter === "object" &&
                  task.reporter !== null
                    ? task.reporter.name
                    : "—";

                const sprintName =
                  sprintByTaskId.get(task._id) ?? "Backlog";

                return (
                  <tr
                    key={task._id}
                    className="transition hover:bg-gray-50"
                  >
                    <td className="px-4 py-4 font-mono text-xs font-medium text-blue-700">
                      {task.taskKey ?? "—"}
                    </td>

                    <td className="max-w-xs px-4 py-4">
                      <button
                        type="button"
                        onMouseEnter={() => handleTaskHover(task._id)}
                        onFocus={() => handleTaskHover(task._id)}
                        onClick={() => onTaskOpen(task._id)}
                        className="text-left font-medium text-gray-900 hover:text-blue-600 hover:underline"
                      >
                        {task.title}
                      </button>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-medium ${
                          sprintName === "Backlog"
                            ? "bg-gray-100 text-gray-600"
                            : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {sprintName}
                      </span>
                    </td>

                    <td className="px-4 py-4">{task.type}</td>

                    <td className="px-4 py-4">
                      <div className="relative w-fit">
                        <select
                          value={task.status}
                          disabled={updatingTaskIds.has(task._id)}
                          onChange={(event) =>
                            handleStatusChange(
                              task._id,
                              event.target.value as TaskStatus
                            )
                          }
                          className="min-w-[140px] appearance-none rounded-md border bg-white py-1.5 pl-3 pr-10 text-xs disabled:opacity-50"
                          aria-label={`Status for ${task.title}`}
                        >
                          {columns.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>

                        {updatingTaskIds.has(task._id) ? (
                          <LoaderCircle
                            size={13}
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-500"
                          />
                        ) : (
                          <ChevronDown
                            size={13}
                            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                          />
                        )}
                      </div>
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
                        ? new Date(task.dueDate).toLocaleDateString()
                        : "—"}
                    </td>
                  </tr>
                );
              })}

              {filteredTasks.length === 0 && (
                <tr>
                  <td
                    colSpan={9}
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
        /* Board view: Active Sprint tasks only */
        !activeSprint ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-12 text-center">
            <h3 className="font-semibold text-gray-800">
              No Active Sprint
            </h3>

            <p className="mt-2 text-sm text-gray-500">
              Start a planning sprint to display its tasks on the Board.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-center gap-2">
              <span className="rounded-md bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
                {activeSprint.title}
              </span>

              <span className="text-xs text-gray-500">
                Active Sprint
              </span>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {columns.map((status) => {
                const columnTasks = activeSprintTasks.filter(
                  (task) => task.status === status
                );

                return (
                  <section
                    key={status}
                    onDragOver={(event) => {
                      event.preventDefault();
                      event.dataTransfer.dropEffect = "move";
                      setDragOverStatus(status);
                    }}
                    onDragLeave={(event) => {
                      if (
                        !event.currentTarget.contains(
                          event.relatedTarget as Node | null
                        )
                      ) {
                        setDragOverStatus(null);
                      }
                    }}
                    onDrop={(event) => {
                      event.preventDefault();

                      const taskId =
                        event.dataTransfer.getData("text/plain") ||
                        draggedTaskId;

                      // Only allow status changes for Active Sprint tasks.
                      const task = activeSprintTasks.find(
                        (item) => item._id === taskId
                      );

                      setDragOverStatus(null);
                      setDraggedTaskId(null);

                      if (task && task.status !== status) {
                        void handleStatusChange(taskId, status);
                      }
                    }}
                    className={`min-h-80 rounded-xl border p-3 transition-colors ${
                      dragOverStatus === status
                        ? "border-blue-400 bg-blue-50 ring-2 ring-blue-100"
                        : "bg-gray-50"
                    }`}
                  >
                    <div className="mb-4 flex justify-between">
                      <h3 className="font-semibold">{status}</h3>

                      <span className="rounded-full border bg-white px-2">
                        {columnTasks.length}
                      </span>
                    </div>

                    <div className="min-h-56 space-y-3">
                      {columnTasks.map((task) => (
                        <div
                          key={task._id}
                          draggable={!updatingTaskIds.has(task._id)}
                          onMouseEnter={() => handleTaskHover(task._id)}
                          onFocus={() => handleTaskHover(task._id)}
                          onDragStart={(event) => {
                            event.dataTransfer.effectAllowed = "move";
                            event.dataTransfer.setData(
                              "text/plain",
                              task._id
                            );
                            setDraggedTaskId(task._id);
                          }}
                          onDragEnd={() => {
                            setDraggedTaskId(null);
                            setDragOverStatus(null);
                          }}
                          className={`cursor-grab transition-opacity active:cursor-grabbing ${
                            draggedTaskId === task._id ? "opacity-40" : ""
                          }`}
                          aria-label={`Drag ${task.title} to another status column`}
                        >
                          <TaskCard
                            task={{
                              ...task,
                              assignee:
                                typeof task.assignee === "object" &&
                                task.assignee !== null
                                  ? task.assignee
                                  : undefined,
                            }}
                            isUpdating={updatingTaskIds.has(task._id)}
                            onStatusChange={handleStatusChange}
                            onClick={() => onTaskOpen(task._id)}
                          />
                        </div>
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
          </>
        )
      )}

      {/* Task details panel */}
      {selectedTaskId && (
        <TaskDetailsPanel
          taskId={selectedTaskId}
          initialTask={selectedTask}
          onClose={onTaskClose}
        />
      )}
    </div>
  );
}
