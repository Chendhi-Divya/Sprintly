
import { useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Plus,
  Rocket,
  Trash2,
  Pencil,
  UserRound,
  X,
} from "lucide-react";

import {
  useCompleteSprintMutation,
  useCreateSprintMutation,
  useDeleteSprintMutation,
  useGetProjectSprintsQuery,
  useSetTaskSprintMutation,
  useStartSprintMutation,
  useUpdateSprintMutation,
  useUpdateTaskMutation,
  type ProjectSprint,
  type SprintStatus,
  type Task,
  type TaskStatus,
} from "../services/taskApi";

type SprintsViewProps = {
  projectId: string;
  searchText: string;
  selectedAssigneeId: string;
  onTaskOpen: (taskId: string) => void;
};

const statusStyles: Record<SprintStatus, string> = {
  Planning: "bg-amber-50 text-amber-700",
  Active: "bg-blue-50 text-blue-700",
  Completed: "bg-emerald-50 text-emerald-700",
};

const taskStatuses: TaskStatus[] = [
  "To Do",
  "In Progress",
  "In Review",
  "Done",
];

function getErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as { data?: unknown }).data;

    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }
  }

  return fallback;
}

function formatDate(value?: string) {
  if (!value) return "Date not set";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "Date not set"
    : date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
}

function getDateInputValue(value?: string) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getAssigneeId(task: Task) {
  return typeof task.assignee === "string"
    ? task.assignee
    : task.assignee?._id ?? "";
}

function getAssigneeName(task: Task) {
  if (typeof task.assignee === "object" && task.assignee !== null) {
    return task.assignee.name || task.assignee.email || "Unassigned";
  }

  return "Unassigned";
}

function getInitials(name: string) {
  if (!name || name === "Unassigned") return "?";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function isTaskOverdue(task: Task) {
  if (!task.dueDate || task.status === "Done") return false;

  const dueDate = new Date(task.dueDate);

  if (Number.isNaN(dueDate.getTime())) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueDate.setHours(0, 0, 0, 0);

  return dueDate < today;
}

// Shared column headings for Sprint tasks and Backlog.
function TaskColumnHeader() {
  return (
    <div className="grid min-w-[850px] grid-cols-[minmax(260px,1fr)_150px_100px_150px_140px] items-center gap-4 border-b border-gray-100 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
      <span>Task</span>
      <span>Status</span>
      <span>Priority</span>
      <span>Assignee</span>
      <span>Due date</span>
    </div>
  );
}

function TaskRow({
  task,
  onTaskOpen,
  onStatusChange,
  updatingStatus,
  moving,
  onDragStart,
}: {
  task: Task;
  onTaskOpen: (taskId: string) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  updatingStatus: boolean;
  moving: boolean;
  onDragStart: (taskId: string) => void;
}) {
  const assigneeName = getAssigneeName(task);
  const overdue = isTaskOverdue(task);

  return (
    <div
      draggable={!moving}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", task._id);
        onDragStart(task._id);
      }}
      className="grid min-w-[850px] grid-cols-[minmax(260px,1fr)_150px_100px_150px_140px] items-center gap-4 px-5 py-3 transition hover:bg-gray-50"
    >
      {/* Task */}
      <button
        type="button"
        onClick={() => onTaskOpen(task._id)}
        className="min-w-0 text-left"
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 font-mono text-xs font-semibold text-blue-600">
            {task.taskKey ?? "Task"}
          </span>

          <span className="truncate text-sm font-medium text-gray-800 hover:text-blue-600">
            {task.title}
          </span>
        </div>
      </button>

      {/* Editable Status */}
      <div className="relative">
        <select
          value={task.status}
          disabled={updatingStatus || moving}
          onChange={(event) =>
            onStatusChange(task._id, event.target.value as TaskStatus)
          }
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          className="w-full cursor-pointer appearance-none rounded-md border border-gray-200 bg-white py-1.5 pl-3 pr-9 text-xs font-medium text-gray-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60"
          aria-label={`Change status for ${task.title}`}
        >
          {taskStatuses.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        <ChevronDown
          size={14}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
        />
      </div>

      {/* Priority */}
      <div>
        <span className="text-xs font-medium text-gray-700">
          {task.priority}
        </span>
      </div>

      {/* Assignee */}
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700">
          {assigneeName === "Unassigned" ? (
            <UserRound size={14} />
          ) : (
            getInitials(assigneeName)
          )}
        </div>

        <span className="truncate text-xs text-gray-600">
          {assigneeName}
        </span>
      </div>

      {/* Due date */}
      <div
        className={`flex items-center gap-2 text-xs ${
          overdue ? "font-semibold text-red-600" : "text-gray-500"
        }`}
      >
        <CalendarDays size={14} className="shrink-0" />

        <span>
          {task.dueDate ? formatDate(task.dueDate) : "No due date"}
        </span>
      </div>
    </div>
  );
}

export default function SprintsView({
  projectId,
  searchText,
  selectedAssigneeId,
  onTaskOpen,
}: SprintsViewProps) {
  const { data, isLoading, isError } = useGetProjectSprintsQuery(projectId, {
    skip: !projectId,
  });

  const [createSprint, { isLoading: isCreating }] =
    useCreateSprintMutation();

  const [updateSprint, { isLoading: isUpdating }] =
    useUpdateSprintMutation();

  const [updateTask, { isLoading: isUpdatingTask }] =
    useUpdateTaskMutation();

  const [startSprint, { isLoading: isStarting }] =
    useStartSprintMutation();

  const [completeSprint, { isLoading: isCompleting }] =
    useCompleteSprintMutation();

  const [deleteSprint, { isLoading: isDeleting }] =
    useDeleteSprintMutation();

  const [setTaskSprint, { isLoading: isMovingTask }] =
    useSetTaskSprintMutation();

  const [showForm, setShowForm] = useState(false);
  const [editingSprintId, setEditingSprintId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [errorMessage, setErrorMessage] = useState("");

  const [sprintToComplete, setSprintToComplete] =
    useState<ProjectSprint | null>(null);

  const [sprintToDelete, setSprintToDelete] =
    useState<ProjectSprint | null>(null);

  const [moveDestinationId, setMoveDestinationId] = useState("");
  const [draggedTaskId, setDraggedTaskId] = useState("");

  const sprints = data?.sprints ?? [];

  // Hide completed sprints from this page.
  // Their records and task associations remain saved.
  const visibleSprints = sprints.filter(
    (sprint) => sprint.status !== "Completed"
  );

  // Show Active sprint first, followed by Planning sprints.
  const orderedSprints = [...visibleSprints].sort((a, b) => {
    const rank: Record<SprintStatus, number> = {
      Active: 0,
      Planning: 1,
      Completed: 2,
    };

    return (
      rank[a.status] - rank[b.status] ||
      new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );
  });

  const activeSprint = sprints.find(
    (sprint) => sprint.status === "Active"
  );

  const search = searchText.trim().toLowerCase();

  function filterTasks(tasks: Task[]) {
    return tasks.filter((task) => {
      const matchesSearch =
        !search ||
        `${task.title} ${task.taskKey ?? ""} ${task.description ?? ""}`
          .toLowerCase()
          .includes(search);

      const matchesAssignee =
        !selectedAssigneeId ||
        getAssigneeId(task) === selectedAssigneeId;

      return matchesSearch && matchesAssignee;
    });
  }

  function resetForm() {
    setName("");
    setGoal("");
    setStartDate("");
    setEndDate("");
    setEditingSprintId(null);
    setShowForm(false);
    setErrorMessage("");
  }

  function handleEditSprint(sprint: ProjectSprint) {
    setName(sprint.title);
    setGoal(sprint.description ?? "");
    setStartDate(getDateInputValue(sprint.startDate));
    setEndDate(getDateInputValue(sprint.endDate));
    setEditingSprintId(sprint._id);
    setShowForm(true);
    setErrorMessage("");
  }

  async function handleCreateSprint(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setErrorMessage("");

    if (
      startDate &&
      endDate &&
      new Date(endDate).getTime() < new Date(startDate).getTime()
    ) {
      setErrorMessage("End date must be after or equal to the start date.");
      return;
    }

    try {
      if (editingSprintId) {
        await updateSprint({
          projectId,
          sprintId: editingSprintId,
          title: name.trim(),
          description: goal.trim(),
          startDate: startDate || null,
          endDate: endDate || null,
        }).unwrap();
      } else {
        await createSprint({
          projectId,
          title: name.trim(),
          description: goal.trim(),
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
        }).unwrap();
      }

      resetForm();
    } catch (error: unknown) {
      setErrorMessage(
        getErrorMessage(
          error,
          editingSprintId
            ? "Could not update sprint."
            : "Could not create sprint."
        )
      );
    }
  }

  async function handleStatusChange(
    taskId: string,
    status: TaskStatus
  ) {
    setErrorMessage("");

    try {
      await updateTask({
        id: taskId,
        status,
      }).unwrap();
    } catch (error: unknown) {
      setErrorMessage(
        getErrorMessage(error, "Could not update task status.")
      );
    }
  }

  async function handleMoveTask(
    taskId: string,
    sprintId: string | null
  ) {
    setErrorMessage("");

    try {
      await setTaskSprint({
        projectId,
        taskId,
        sprintId,
      }).unwrap();
    } catch (error: unknown) {
      setErrorMessage(
        getErrorMessage(error, "Could not update sprint task.")
      );
    }
  }

  function handleDrop(
    event: React.DragEvent,
    sprintId: string | null
  ) {
    event.preventDefault();

    const taskId =
      event.dataTransfer.getData("text/plain") || draggedTaskId;

    setDraggedTaskId("");

    if (taskId) {
      void handleMoveTask(taskId, sprintId);
    }
  }

  async function handleStart(sprint: ProjectSprint) {
    setErrorMessage("");

    try {
      await startSprint({
        projectId,
        sprintId: sprint._id,
      }).unwrap();
    } catch (error: unknown) {
      setErrorMessage(
        getErrorMessage(error, "Could not start sprint.")
      );
    }
  }

  async function handleComplete(sprint: ProjectSprint) {
    setErrorMessage("");

    try {
      await completeSprint({
        projectId,
        sprintId: sprint._id,
        moveIncompleteToSprintId:
          moveDestinationId === "__backlog__"
            ? null
            : moveDestinationId || null,
      }).unwrap();

      setSprintToComplete(null);
      setMoveDestinationId("");
    } catch (error: unknown) {
      setErrorMessage(
        getErrorMessage(error, "Could not complete sprint.")
      );
    }
  }

  async function handleDelete(sprint: ProjectSprint) {
    setErrorMessage("");

    try {
      await deleteSprint({
        projectId,
        sprintId: sprint._id,
        moveTasksToSprintId:
          moveDestinationId === "__backlog__"
            ? null
            : moveDestinationId || null,
      }).unwrap();

      setSprintToDelete(null);
      setMoveDestinationId("");
    } catch (error: unknown) {
      setErrorMessage(
        getErrorMessage(error, "Could not delete sprint.")
      );
    }
  }

  if (isLoading) {
    return (
      <p className="rounded-xl border bg-white p-8 text-sm text-gray-500">
        Loading sprints…
      </p>
    );
  }

  if (isError) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700"
      >
        Could not load project sprints.
      </p>
    );
  }

  const backlogTasks = filterTasks(data?.backlog ?? []);

  return (
    <section className="w-full space-y-5">
      {/* Project Sprints heading and New Sprint button */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">
         
        </h2>

        <button
          type="button"
          onClick={() => {
            if (showForm) {
              resetForm();
            } else {
              setEditingSprintId(null);
              setName("");
              setGoal("");
              setStartDate("");
              setEndDate("");
              setErrorMessage("");
              setShowForm(true);
            }
          }}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Close form" : "New sprint"}
        </button>
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      )}

      {/* Create / Edit Sprint form */}
      {showForm && (
        <form
          onSubmit={handleCreateSprint}
          className="grid gap-3 rounded-xl border border-gray-200 bg-white p-4 sm:grid-cols-2"
        >
          <div className="flex items-center justify-between sm:col-span-2">
            <h3 className="font-semibold text-gray-900">
              {editingSprintId ? "Edit sprint" : "Create sprint"}
            </h3>

            <button
              type="button"
              onClick={resetForm}
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
              aria-label="Close sprint form"
            >
              <X size={18} />
            </button>
          </div>

          <label className="space-y-1 text-sm font-medium text-gray-700">
            Sprint title
            <input
              required
              maxLength={100}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Sprint 1"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-gray-700">
            Description (optional)
            <textarea
              maxLength={2000}
              rows={3}
              value={goal}
              onChange={(event) => setGoal(event.target.value)}
              placeholder="Describe the sprint objective"
              className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-gray-700">
            From
            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
            />
          </label>

          <label className="space-y-1 text-sm font-medium text-gray-700">
            To
            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              min={startDate || undefined}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500"
            />
          </label>

          <div className="flex justify-end gap-2 sm:col-span-2">
            <button
              type="button"
              onClick={resetForm}
              disabled={isCreating || isUpdating}
              className="rounded-lg border px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={isCreating || isUpdating || !name.trim()}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreating || isUpdating
                ? "Saving…"
                : editingSprintId
                  ? "Save changes"
                  : "Create sprint"}
            </button>
          </div>
        </form>
      )}

      {/* Active and Planning sprint cards only */}
      {orderedSprints.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          No active or planning sprints. Create a new sprint to get started.
        </div>
      ) : (
        <div className="w-full space-y-4">
          {orderedSprints.map((sprint) => {
            const visibleTasks = filterTasks(sprint.tasks);

            const isBusy =
              isStarting || isCompleting || isDeleting;

            return (
              <section
                key={sprint._id}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  handleDrop(event, sprint._id);
                }}
                className={`w-full overflow-hidden rounded-xl border bg-white ${
                  draggedTaskId
                    ? "border-blue-300"
                    : "border-gray-200"
                }`}
              >
                {/* Sprint header */}
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2">
                    <h3 className="font-semibold text-gray-900">
                      {sprint.title}
                    </h3>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[sprint.status]}`}
                    >
                      {sprint.status}
                    </span>

                    <span className="flex items-center gap-1.5 text-xs text-gray-500">
                      <CalendarDays size={14} />
                      {formatDate(sprint.startDate)}
                      <span>–</span>
                      {formatDate(sprint.endDate)}
                    </span>
                  </div>

                  {/* Sprint actions */}
                  <div className="flex shrink-0 items-center gap-2">
                    {sprint.status === "Planning" && (
                      <button
                        type="button"
                        onClick={() => void handleStart(sprint)}
                        disabled={
                          isBusy ||
                          Boolean(activeSprint) ||
                          !sprint.startDate ||
                          !sprint.endDate
                        }
                        title={
                          activeSprint
                            ? "Complete the active sprint first"
                            : "Start sprint"
                        }
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Rocket size={14} />
                        Start
                      </button>
                    )}

                    {sprint.status === "Active" && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setMoveDestinationId("");
                            setSprintToComplete(sprint);
                          }}
                          disabled={isBusy}
                          className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Complete sprint
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEditSprint(sprint)}
                          disabled={isBusy || isCreating || isUpdating}
                          title="Edit sprint"
                          aria-label={`Edit ${sprint.title}`}
                          className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <Pencil size={15} />
                        </button>
                      </>
                    )}

                    {sprint.status === "Planning" && (
                      <button
                        type="button"
                        onClick={() => handleEditSprint(sprint)}
                        disabled={isBusy || isCreating || isUpdating}
                        title="Edit sprint"
                        aria-label={`Edit ${sprint.title}`}
                        className="rounded-lg border border-gray-200 bg-white p-2 text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Pencil size={15} />
                      </button>
                    )}

                    {sprint.status !== "Active" && (
                      <button
                        type="button"
                        onClick={() => {
                          setMoveDestinationId("");
                          setSprintToDelete(sprint);
                        }}
                        disabled={isBusy}
                        title="Delete sprint"
                        className="rounded-lg border border-gray-200 bg-white p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                        aria-label={`Delete ${sprint.title}`}
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </header>

                {/* Sprint task columns */}
                <div className="w-full overflow-x-auto">
                  <TaskColumnHeader />

                  <div className="divide-y divide-gray-100">
                    {visibleTasks.length === 0 ? (
                      <p className="m-3 rounded-lg border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500">
                        {draggedTaskId
                          ? "Drop task here"
                          : selectedAssigneeId
                            ? "No tasks assigned to this member."
                            : `No tasks in ${sprint.title}${search ? " match your search" : ""}.`}
                      </p>
                    ) : (
                      visibleTasks.map((task) => (
                        <TaskRow
                          key={task._id}
                          task={task}
                          onTaskOpen={onTaskOpen}
                          onStatusChange={handleStatusChange}
                          updatingStatus={isUpdatingTask}
                          moving={isMovingTask}
                          onDragStart={setDraggedTaskId}
                        />
                      ))
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Backlog */}
      <section
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => handleDrop(event, null)}
        className={`w-full overflow-hidden rounded-xl border bg-white ${
          draggedTaskId
            ? "border-blue-300"
            : "border-gray-200"
        }`}
      >
        <header className="border-b border-gray-100 px-5 py-4">
          <h3 className="font-semibold text-gray-900">
            Backlog
          </h3>

          <p className="mt-1 text-xs text-gray-500">
            Unscheduled project tasks
          </p>
        </header>

        <div className="w-full overflow-x-auto">
          <TaskColumnHeader />

          <div className="divide-y divide-gray-100">
            {backlogTasks.length === 0 ? (
              <p className="m-3 rounded-lg border border-dashed border-gray-200 p-5 text-center text-sm text-gray-500">
                {draggedTaskId
                  ? "Drop task here"
                  : selectedAssigneeId
                    ? "No backlog tasks assigned to this member."
                    : `Your backlog is empty${search ? " (no matching tasks)" : ""}.`}
              </p>
            ) : (
              backlogTasks.map((task) => (
                <TaskRow
                  key={task._id}
                  task={task}
                  onTaskOpen={onTaskOpen}
                  onStatusChange={handleStatusChange}
                  updatingStatus={isUpdatingTask}
                  moving={isMovingTask}
                  onDragStart={setDraggedTaskId}
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Complete / Delete dialogs */}
      {(sprintToComplete || sprintToDelete) && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !isCompleting &&
              !isDeleting
            ) {
              setSprintToComplete(null);
              setSprintToDelete(null);
            }
          }}
        >
          <div className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-2xl">
            {sprintToComplete ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900">
                  Complete “{sprintToComplete.title}”?
                </h3>

                <p className="mt-2 text-sm text-gray-600">
                  Choose where unfinished tasks should go. Completed tasks
                  remain in this sprint’s history.
                </p>

                {sprintToComplete.tasks.filter(
                  (task) => task.status !== "Done"
                ).length > 0 ? (
                  <div className="mt-4">
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Move{" "}
                      {
                        sprintToComplete.tasks.filter(
                          (task) => task.status !== "Done"
                        ).length
                      }{" "}
                      unfinished task(s) to
                    </label>

                    <div className="relative">
                      <select
                        value={moveDestinationId}
                        onChange={(event) =>
                          setMoveDestinationId(event.target.value)
                        }
                        className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2.5 pl-3 pr-10 text-sm outline-none focus:border-blue-500"
                      >
                        <option value="" disabled>
                          Choose a destination
                        </option>

                        <option value="__backlog__">Backlog</option>

                        {sprints
                          .filter(
                            (item) =>
                              item._id !== sprintToComplete._id &&
                              item.status === "Planning"
                          )
                          .map((item) => (
                            <option key={item._id} value={item._id}>
                              {item.title} (next sprint)
                            </option>
                          ))}
                      </select>

                      <ChevronDown
                        size={16}
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                    </div>

                    <ul className="mt-3 max-h-32 space-y-1 overflow-y-auto rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                      {sprintToComplete.tasks
                        .filter((task) => task.status !== "Done")
                        .map((task) => (
                          <li key={task._id}>
                            <span className="font-mono text-blue-600">
                              {task.taskKey ?? "Task"}
                            </span>{" "}
                            · {task.title}
                          </li>
                        ))}
                    </ul>
                  </div>
                ) : (
                  <p className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
                    All tasks are complete. No task movement is needed.
                  </p>
                )}

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSprintToComplete(null)}
                    disabled={isCompleting}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleComplete(sprintToComplete)}
                    disabled={
                      isCompleting ||
                      (sprintToComplete.tasks.some(
                        (task) => task.status !== "Done"
                      ) &&
                        !moveDestinationId)
                    }
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {isCompleting ? "Completing…" : "Complete sprint"}
                  </button>
                </div>
              </>
            ) : sprintToDelete ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete sprint “{sprintToDelete.title}”?
                </h3>

                <p className="mt-2 text-sm text-gray-600">
                  {sprintToDelete.tasks.length > 0
                    ? `Choose where its ${sprintToDelete.tasks.length} task(s) should go before deleting this sprint.`
                    : "This sprint has no tasks and can be deleted."}
                </p>

                {sprintToDelete.tasks.length > 0 && (
                  <div className="relative mt-4">
                    <select
                      value={moveDestinationId}
                      onChange={(event) =>
                        setMoveDestinationId(event.target.value)
                      }
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white py-2.5 pl-3 pr-10 text-sm outline-none focus:border-blue-500"
                    >
                      <option value="" disabled>
                        Choose a destination
                      </option>

                      <option value="__backlog__">Backlog</option>

                      {sprints
                        .filter(
                          (item) =>
                            item._id !== sprintToDelete._id &&
                            item.status !== "Completed"
                        )
                        .map((item) => (
                          <option key={item._id} value={item._id}>
                            {item.title} ({item.status})
                          </option>
                        ))}
                    </select>

                    <ChevronDown
                      size={16}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    />
                  </div>
                )}

                <div className="mt-6 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setSprintToDelete(null)}
                    disabled={isDeleting}
                    className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => void handleDelete(sprintToDelete)}
                    disabled={
                      isDeleting ||
                      (sprintToDelete.tasks.length > 0 &&
                        !moveDestinationId)
                    }
                    className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {isDeleting
                      ? "Deleting…"
                      : sprintToDelete.tasks.length > 0
                        ? "Move tasks and delete"
                        : "Delete sprint"}
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}
