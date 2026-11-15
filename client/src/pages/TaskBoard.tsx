
import { useMemo, useState } from "react";
import { ChevronDown, LoaderCircle } from "lucide-react";

import {
  taskApi,
  useGetTasksQuery,
  useUpdateTaskMutation,
  useGetProjectSprintsQuery,
  useGetProjectMembersQuery,
  type TaskStatus,
  type TaskType,
} from "../services/taskApi";

import type { TaskFilters } from "./Dashboard";
import TaskCard from "../components/TaskCard";
import TaskDetailsPanel from "../components/TaskDetailsPanel";
import SprintsView from "../components/SprintsView";
import DatePicker from "../components/DatePicker";

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

const taskTypes: TaskType[] = [
  "Epic",
  "Story",
  "Task",
  "Bug",
];

const dropdownClass =
  "h-9 w-full min-w-[120px] appearance-none rounded-md border border-gray-200 bg-white px-3 pr-9 text-xs font-medium text-gray-700 shadow-sm outline-none transition-all hover:border-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-400";

function EditableDropdown({
  value,
  disabled,
  onChange,
  ariaLabel,
  children,
}: {
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative w-full min-w-[120px]">
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-label={ariaLabel}
        className={dropdownClass}
      >
        {children}
      </select>

      <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
        {disabled ? (
          <LoaderCircle
            size={14}
            className="animate-spin text-gray-400"
          />
        ) : (
          <ChevronDown
            size={14}
            className="text-gray-500"
          />
        )}
      </div>
    </div>
  );
}

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

  const { data: sprintData } = useGetProjectSprintsQuery(
    selectedProjectId,
    {
      skip: !selectedProjectId,
    }
  );

  const { data: projectMembersData } = useGetProjectMembersQuery(
    selectedProjectId,
    {
      skip: !selectedProjectId,
    }
  );

  const projectMembers = projectMembersData?.members ?? [];

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

  const tasks = useMemo(() => {
    return allTasks.filter((task) => {
      const projectId =
        typeof task.project === "string"
          ? task.project
          : task.project?._id;

      return projectId === selectedProjectId;
    });
  }, [allTasks, selectedProjectId]);

  const sprintByTaskId = useMemo(() => {
    const sprintMap = new Map<string, string>();

    projectSprints.forEach((sprint) => {
      sprint.tasks.forEach((sprintTask) => {
        sprintMap.set(sprintTask._id, sprint.title);
      });
    });

    return sprintMap;
  }, [projectSprints]);

  const activeSprint = useMemo(() => {
    return projectSprints.find(
      (sprint) => sprint.status === "Active"
    );
  }, [projectSprints]);

  const activeSprintTaskIds = useMemo(() => {
    return new Set(
      activeSprint?.tasks.map((task) => task._id) ?? []
    );
  }, [activeSprint]);

  // Filter tasks by search, status, priority, assignee, type and due date.
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

      const taskDueDate = task.dueDate
        ? task.dueDate.slice(0, 10)
        : "";

      const matchesDueDate =
        !filters.dueDate || taskDueDate === filters.dueDate;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesPriority &&
        matchesAssignee &&
        matchesType &&
        matchesDueDate
      );
    });
  }, [tasks, searchText, filters]);

  const activeSprintTasks = useMemo(() => {
    return filteredTasks.filter((task) =>
      activeSprintTaskIds.has(task._id)
    );
  }, [filteredTasks, activeSprintTaskIds]);

  function handleTaskHover(taskId: string) {
    prefetchTask(taskId, { ifOlderThan: 30 });
  }

  function setTaskUpdating(taskId: string, updating: boolean) {
    setUpdatingTaskIds((current) => {
      const next = new Set(current);

      if (updating) {
        next.add(taskId);
      } else {
        next.delete(taskId);
      }

      return next;
    });
  }

  async function handleStatusChange(
    taskId: string,
    status: TaskStatus
  ) {
    setMessage("");
    setTaskUpdating(taskId, true);

    try {
      await updateTask({
        id: taskId,
        status,
      }).unwrap();
    } catch {
      setMessage("Failed to update task status.");
    } finally {
      setTaskUpdating(taskId, false);
    }
  }

  async function handleTypeChange(
    taskId: string,
    type: TaskType
  ) {
    setMessage("");
    setTaskUpdating(taskId, true);

    try {
      await updateTask({
        id: taskId,
        type,
      }).unwrap();
    } catch {
      setMessage("Failed to update task type.");
    } finally {
      setTaskUpdating(taskId, false);
    }
  }

  async function handleAssigneeChange(
    taskId: string,
    assignee: string
  ) {
    setMessage("");
    setTaskUpdating(taskId, true);

    try {
      await updateTask({
        id: taskId,
        assignee: assignee || null,
      }).unwrap();
    } catch {
      setMessage("Failed to update task assignee.");
    } finally {
      setTaskUpdating(taskId, false);
    }
  }

  async function handleDueDateChange(
    taskId: string,
    dueDate: string
  ) {
    setMessage("");
    setTaskUpdating(taskId, true);

    try {
      await updateTask({
        id: taskId,
        dueDate: dueDate || null,
      }).unwrap();
    } catch {
      setMessage("Failed to update due date.");
    } finally {
      setTaskUpdating(taskId, false);
    }
  }

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
      {activeView !== "Sprints" && (
        <div className="mb-6">
          <h2 className="text-2xl font-bold">
            {activeView === "List" ? "Task List" : "Task Board"}
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Manage and track your tasks.
          </p>
        </div>
      )}

      {message && (
        <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {message}
        </p>
      )}

      {activeView !== "Sprints" && (
        <p className="mb-4 text-sm text-gray-500">

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
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full min-w-[1100px] border-collapse text-left text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="w-28 px-4 py-3 font-semibold">Key</th>
                <th className="px-4 py-3 font-semibold">Task</th>
                <th className="px-4 py-3 font-semibold">Sprint</th>
                <th className="w-36 px-4 py-3 font-semibold">Type</th>
                <th className="w-40 px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Priority</th>
                <th className="w-48 px-4 py-3 font-semibold">Assignee</th>
                <th className="px-4 py-3 font-semibold">Reporter</th>
                <th className="px-4 py-3 font-semibold">Due Date</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredTasks.map((task) => {
                const assigneeId =
                  typeof task.assignee === "string"
                    ? task.assignee
                    : task.assignee?._id ?? "";

                const assigneeName =
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

                const isUpdating = updatingTaskIds.has(task._id);

                return (
                  <tr
                    key={task._id}
                    className="transition-colors hover:bg-gray-50"
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

                    {/* Editable Type */}
                    <td className="px-4 py-4">
                      <EditableDropdown
                        value={task.type}
                        disabled={isUpdating}
                        ariaLabel={`Type for ${task.title}`}
                        onChange={(value) =>
                          void handleTypeChange(
                            task._id,
                            value as TaskType
                          )
                        }
                      >
                        {taskTypes.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </EditableDropdown>
                    </td>

                    {/* Editable Status */}
                    <td className="px-4 py-4">
                      <EditableDropdown
                        value={task.status}
                        disabled={isUpdating}
                        ariaLabel={`Status for ${task.title}`}
                        onChange={(value) =>
                          void handleStatusChange(
                            task._id,
                            value as TaskStatus
                          )
                        }
                      >
                        {columns.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </EditableDropdown>
                    </td>

                    {/* Read-only Priority */}
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

                    {/* Editable Assignee */}
                    <td className="px-4 py-4">
                      <EditableDropdown
                        value={assigneeId}
                        disabled={isUpdating}
                        ariaLabel={`Assignee for ${task.title}`}
                        onChange={(value) =>
                          void handleAssigneeChange(task._id, value)
                        }
                      >
                        <option value="">Unassigned</option>

                        {projectMembers.map((member) => (
                          <option key={member._id} value={member._id}>
                            {member.name}
                          </option>
                        ))}

                        {assigneeId &&
                          !projectMembers.some(
                            (member) => member._id === assigneeId
                          ) && (
                            <option value={assigneeId}>
                              {assigneeName}
                            </option>
                          )}
                      </EditableDropdown>
                    </td>

                    <td className="px-4 py-4">{reporter}</td>

                    {/* Editable Due Date */}
                    <td className="whitespace-nowrap px-4 py-4">
                      <DatePicker
                        value={
                          task.dueDate
                            ? task.dueDate.slice(0, 10)
                            : ""
                        }
                        onChange={(value) =>
                          void handleDueDateChange(task._id, value)
                        }
                        disabled={isUpdating}
                        placeholder="Select date"
                        className="w-[150px]"
                      />
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
      ) : !activeSprint ? (
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

                    const task = activeSprintTasks.find(
                      (item) => item._id === taskId
                    );

                    setDragOverStatus(null);
                    setDraggedTaskId(null);

                    if (task && task.status !== status) {
                      void handleStatusChange(task._id, status);
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
      )}

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
