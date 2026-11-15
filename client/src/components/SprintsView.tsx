import { useEffect, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  Plus,
  Rocket,
  Trash2,
  Pencil,
  UserRound,
  X,
  ListChecks,
} from "lucide-react";

import {
  useCompleteSprintMutation,
  useCreateSprintMutation,
  useDeleteSprintMutation,
  useGetProjectSprintsQuery,
  useGetProjectMembersQuery,
  useStartSprintMutation,
  useUpdateSprintMutation,
  useUpdateTaskMutation,
  useBulkUpdateTasksMutation,
  useBulkSetTaskSprintMutation,
  type ProjectSprint,
  type SprintStatus,
  type Task,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
  type BulkTaskField,
} from "../services/taskApi";

type SprintsViewProps = {
  projectId: string;
  searchText: string;
  selectedAssigneeId: string;
  onTaskOpen: (taskId: string) => void;
};

type DropPosition = "before" | "after";

type DropTarget = {
  taskId: string;
  position: DropPosition;
  destinationId: string;
};

type ProjectMember = {
  _id: string;
  name: string;
  email: string;
};

type EditableTaskFields = {
  title?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string | null;
  dueDate?: string | null;
};

const BACKLOG_ID = "__backlog__";
const UNASSIGNED_VALUE = "__unassigned__";
const CLEAR_DATE_VALUE = "__clear_date__";

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

const taskPriorities: TaskPriority[] = ["Low", "Medium", "High"];

const taskTypes: TaskType[] = ["Epic", "Story", "Task", "Bug"];

const emptyBulkValues: Record<BulkTaskField, string> = {
  status: "",
  priority: "",
  type: "",
  assignee: "",
  dueDate: "",
};

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

function TaskColumnHeader() {
  return (
    <div className="grid min-w-[1000px] grid-cols-[minmax(270px,1fr)_145px_110px_165px_145px] items-center gap-4 border-b border-gray-100 bg-gray-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
      <span>Task</span>
      <span>Status</span>
      <span>Priority</span>
      <span>Assignee</span>
      <span>Due date</span>
    </div>
  );
}

// ==========================================
// EDITABLE SPRINT DETAILS
// ==========================================

function EditableSprintDetails({
  sprint,
  onUpdate,
  disabled,
}: {
  sprint: ProjectSprint;
  onUpdate: (updates: {
    title?: string;
    description?: string;
    startDate?: string | null;
    endDate?: string | null;
  }) => void;
  disabled: boolean;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);

  const [title, setTitle] = useState(sprint.title);
  const [description, setDescription] = useState(
    sprint.description ?? ""
  );

  useEffect(() => {
    setTitle(sprint.title);
    setDescription(sprint.description ?? "");
  }, [sprint.title, sprint.description]);

  function saveTitle() {
    const updatedTitle = title.trim();

    setEditingTitle(false);

    if (updatedTitle && updatedTitle !== sprint.title) {
      onUpdate({ title: updatedTitle });
    } else {
      setTitle(sprint.title);
    }
  }

  function saveDescription() {
    setEditingDescription(false);

    if (description !== (sprint.description ?? "")) {
      onUpdate({ description: description.trim() });
    }
  }

  return (
    <div className="min-w-0 space-y-2">
      <div className="flex min-w-0 items-center gap-2">
        {editingTitle ? (
          <input
            autoFocus
            value={title}
            disabled={disabled}
            onChange={(event) => setTitle(event.target.value)}
            onBlur={saveTitle}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();

              if (event.key === "Escape") {
                setTitle(sprint.title);
                setEditingTitle(false);
              }
            }}
            className="min-w-[120px] max-w-[280px] rounded-md border border-blue-300 px-2 py-1 text-sm font-semibold text-gray-900 outline-none focus:ring-2 focus:ring-blue-100"
          />
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setEditingTitle(true)}
            className="group inline-flex min-w-0 items-center gap-2 text-left"
            title="Edit sprint title"
          >
            <span className="truncate font-semibold text-gray-900">
              {sprint.title}
            </span>
            <Pencil
              size={13}
              className="shrink-0 text-gray-400 opacity-0 transition group-hover:opacity-100"
            />
          </button>
        )}

        <span
          className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[sprint.status]}`}
        >
          {sprint.status}
        </span>
      </div>

      <div className="flex min-w-0 items-center gap-2">
        {editingDescription ? (
          <textarea
            autoFocus
            rows={2}
            value={description}
            disabled={disabled}
            onChange={(event) => setDescription(event.target.value)}
            onBlur={saveDescription}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setDescription(sprint.description ?? "");
                setEditingDescription(false);
              }
            }}
            placeholder="Add sprint description..."
            className="w-full max-w-md resize-y rounded-md border border-blue-300 px-2 py-1 text-xs text-gray-600 outline-none focus:ring-2 focus:ring-blue-100"
          />
        ) : (
          <button
            type="button"
            disabled={disabled}
            onClick={() => setEditingDescription(true)}
            className="group inline-flex min-w-0 items-center gap-2 text-left"
            title="Edit sprint description"
          >
            <span className="truncate text-xs text-gray-500">
              {sprint.description || "Add description"}
            </span>
            <Pencil
              size={12}
              className="shrink-0 text-gray-400 opacity-0 transition group-hover:opacity-100"
            />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
        <label className="inline-flex items-center gap-1.5">
          <CalendarDays size={13} />
          <span>From</span>
          <input
            type="date"
            value={getDateInputValue(sprint.startDate)}
            disabled={disabled}
            onChange={(event) =>
              onUpdate({ startDate: event.target.value || null })
            }
            className="max-w-[135px] rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 outline-none focus:border-blue-500 disabled:opacity-50"
          />
        </label>

        <label className="inline-flex items-center gap-1.5">
          <span>To</span>
          <input
            type="date"
            value={getDateInputValue(sprint.endDate)}
            min={getDateInputValue(sprint.startDate) || undefined}
            disabled={disabled}
            onChange={(event) =>
              onUpdate({ endDate: event.target.value || null })
            }
            className="max-w-[135px] rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-600 outline-none focus:border-blue-500 disabled:opacity-50"
          />
        </label>
      </div>
    </div>
  );
}

// ==========================================
// TASK ROW
// ==========================================

function TaskRow({
  task,
  members,
  onTaskOpen,
  onTaskUpdate,
  onStatusChange,
  updatingStatus,
  moving,
  selected,
  onSelect,
  onDragStart,
  onDragEnd,
  onTaskDragOver,
  onTaskDrop,
  dropPosition,
}: {
  task: Task;
  members: ProjectMember[];
  onTaskOpen: (taskId: string) => void;
  onTaskUpdate: (
    taskId: string,
    updates: EditableTaskFields
  ) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  updatingStatus: boolean;
  moving: boolean;
  selected: boolean;
  onSelect: (taskId: string, checked: boolean) => void;
  onDragStart: (taskId: string) => void;
  onDragEnd: () => void;
  onTaskDragOver: (
    event: React.DragEvent<HTMLDivElement>,
    taskId: string
  ) => void;
  onTaskDrop: (
    event: React.DragEvent<HTMLDivElement>,
    taskId: string
  ) => void;
  dropPosition: DropPosition | null;
}) {
  const assigneeName = getAssigneeName(task);
  const overdue = isTaskOverdue(task);

  const selectClass =
    "w-full min-w-0 cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-10 text-xs font-medium text-gray-700 outline-none transition hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50";

  return (
    <div
      draggable={!moving}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", task._id);
        onDragStart(task._id);
      }}
      onDragEnd={onDragEnd}
      onDragOver={(event) => onTaskDragOver(event, task._id)}
      onDrop={(event) => onTaskDrop(event, task._id)}
      className={`relative grid min-w-[1000px] grid-cols-[minmax(270px,1fr)_145px_110px_165px_145px] items-center gap-4 border-b border-gray-100 px-5 py-3 transition ${
        selected ? "bg-blue-50/60" : "hover:bg-gray-50"
      } ${
        dropPosition === "before"
          ? "border-t-2 border-t-blue-500"
          : dropPosition === "after"
            ? "border-b-2 border-b-blue-500"
            : ""
      }`}
    >
      <div className="flex min-w-0 items-center gap-3">
        <input
          type="checkbox"
          checked={selected}
          disabled={moving}
          onChange={(event) => onSelect(task._id, event.target.checked)}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          aria-label={`Select ${task.title}`}
          className="h-4 w-4 shrink-0 cursor-pointer rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:cursor-not-allowed"
        />

        <button
          type="button"
          onClick={() => onTaskOpen(task._id)}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <span className="shrink-0 font-mono text-xs font-semibold text-blue-600">
            {task.taskKey ?? "Task"}
          </span>
          <span className="truncate text-sm font-medium text-gray-800 transition hover:text-blue-600">
            {task.title}
          </span>
        </button>
      </div>

      <div className="relative">
        <select
          value={task.status}
          disabled={updatingStatus || moving}
          onChange={(event) =>
            onStatusChange(task._id, event.target.value as TaskStatus)
          }
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          className={selectClass}
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

      <div className="relative">
        <select
          value={task.priority}
          disabled={moving}
          onChange={(event) =>
            onTaskUpdate(task._id, {
              priority: event.target.value as TaskPriority,
            })
          }
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          className={selectClass}
          aria-label={`Change priority for ${task.title}`}
        >
          {taskPriorities.map((priority) => (
            <option key={priority} value={priority}>
              {priority}
            </option>
          ))}
        </select>
        <ChevronDown
          size={14}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
        />
      </div>

      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-100 text-[10px] font-semibold text-blue-700">
          {assigneeName === "Unassigned" ? (
            <UserRound size={15} />
          ) : (
            getInitials(assigneeName)
          )}
        </div>

        <div className="relative min-w-0 flex-1">
          <select
            value={getAssigneeId(task)}
            disabled={moving}
            onChange={(event) =>
              onTaskUpdate(task._id, {
                assignee: event.target.value || null,
              })
            }
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
            className="w-full min-w-0 cursor-pointer appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-9 text-xs text-gray-700 outline-none transition hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={`Change assignee for ${task.title}`}
          >
            <option value="">Unassigned</option>
            {members.map((member) => (
              <option key={member._id} value={member._id}>
                {member.name || member.email}
              </option>
            ))}
            {getAssigneeId(task) &&
              !members.some(
                (member) => member._id === getAssigneeId(task)
              ) && (
                <option value={getAssigneeId(task)}>
                  {assigneeName}
                </option>
              )}
          </select>
          <ChevronDown
            size={13}
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
        </div>
      </div>

      <div
        className={`flex min-w-0 items-center gap-2 text-xs ${
          overdue ? "font-semibold text-red-600" : "text-gray-500"
        }`}
      >
        <CalendarDays size={14} className="shrink-0" />
        <input
          type="date"
          value={getDateInputValue(task.dueDate)}
          disabled={moving}
          onChange={(event) =>
            onTaskUpdate(task._id, {
              dueDate: event.target.value || null,
            })
          }
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          className="min-w-0 w-full cursor-pointer rounded-md border border-gray-200 bg-white px-2 py-2 text-xs text-gray-600 outline-none transition hover:border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
          aria-label={`Change due date for ${task.title}`}
        />
      </div>
    </div>
  );
}

// ==========================================
// MAIN SPRINTS VIEW
// ==========================================

export default function SprintsView({
  projectId,
  searchText,
  selectedAssigneeId,
  onTaskOpen,
}: SprintsViewProps) {
  const {
    data,
    isLoading,
    isError,
    refetch: refetchSprints,
  } = useGetProjectSprintsQuery(projectId, {
    skip: !projectId,
  });

  const { data: membersData } = useGetProjectMembersQuery(projectId, {
    skip: !projectId,
  });

  const members: ProjectMember[] = membersData?.members ?? [];

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

  const [bulkUpdateTasks, { isLoading: isBulkUpdating }] =
    useBulkUpdateTasksMutation();

  const [bulkSetTaskSprint, { isLoading: isBulkMoving }] =
    useBulkSetTaskSprintMutation();

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

  // ==========================================
  // MULTI-SELECT AND BULK EDIT STATE
  // ==========================================

  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);
  const [selectionSourceId, setSelectionSourceId] = useState<string | null>(
    null
  );

  const [showBulkEdit, setShowBulkEdit] = useState(false);

  const [bulkValues, setBulkValues] = useState<
    Record<BulkTaskField, string>
  >({ ...emptyBulkValues });

  const [bulkError, setBulkError] = useState("");

  const draggedTaskIdsRef = useRef<string[]>([]);

  const [draggedTaskId, setDraggedTaskId] = useState("");

  const [dragOverDestinationId, setDragOverDestinationId] = useState<
    string | null
  >(null);

  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const [moveDestinationId, setMoveDestinationId] = useState("");

  const sprints = data?.sprints ?? [];

  const visibleSprints = sprints.filter(
    (sprint) => sprint.status !== "Completed"
  );

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

  const isMoving = isBulkMoving;
  const isBusyWithBulk = isBulkUpdating || isBulkMoving;

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

  function getTasksForSource(sourceId: string): Task[] {
    if (sourceId === BACKLOG_ID) {
      return filterTasks(data?.backlog ?? []);
    }

    const sprint = sprints.find((item) => item._id === sourceId);

    return filterTasks(sprint?.tasks ?? []);
  }

  function getOrderedSelectedIds(taskIds: string[], sourceId: string) {
    const visibleTasks = getTasksForSource(sourceId);
    const selected = new Set(taskIds);

    return visibleTasks
      .filter((task) => selected.has(task._id))
      .map((task) => task._id);
  }

  function clearSelection() {
    setSelectedTaskIds([]);
    setSelectionSourceId(null);
    setShowBulkEdit(false);
    setBulkError("");
    setBulkValues({ ...emptyBulkValues });
  }

  function handleSelectTask(
    taskId: string,
    checked: boolean,
    sourceId: string
  ) {
    if (checked) {
      if (selectionSourceId !== sourceId) {
        setSelectedTaskIds([taskId]);
        setSelectionSourceId(sourceId);
        setBulkError("");
        setBulkValues({ ...emptyBulkValues });
        setShowBulkEdit(false);
        return;
      }

      setSelectedTaskIds((previous) =>
        previous.includes(taskId) ? previous : [...previous, taskId]
      );

      setBulkError("");
      return;
    }

    setSelectedTaskIds((previous) => {
      const updatedIds = previous.filter((id) => id !== taskId);

      if (updatedIds.length === 0) {
        setSelectionSourceId(null);
        setShowBulkEdit(false);
        setBulkValues({ ...emptyBulkValues });
        setBulkError("");
      }

      return updatedIds;
    });
  }

  function resetDragState() {
    setDraggedTaskId("");
    draggedTaskIdsRef.current = [];
    setDragOverDestinationId(null);
    setDropTarget(null);
  }

  useEffect(() => {
    clearSelection();
    resetDragState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, searchText, selectedAssigneeId]);

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

  // ==========================================
  // UPDATE SPRINT DETAILS
  // ==========================================

  async function handleInlineSprintUpdate(
    sprint: ProjectSprint,
    updates: {
      title?: string;
      description?: string;
      startDate?: string | null;
      endDate?: string | null;
    }
  ) {
    setErrorMessage("");

    const updatedStartDate =
      updates.startDate !== undefined
        ? updates.startDate
        : getDateInputValue(sprint.startDate);

    const updatedEndDate =
      updates.endDate !== undefined
        ? updates.endDate
        : getDateInputValue(sprint.endDate);

    if (
      updatedStartDate &&
      updatedEndDate &&
      new Date(updatedEndDate).getTime() <
        new Date(updatedStartDate).getTime()
    ) {
      setErrorMessage("End date must be after or equal to the start date.");
      await refetchSprints();
      return;
    }

    try {
      await updateSprint({
        projectId,
        sprintId: sprint._id,
        ...updates,
      }).unwrap();

      await refetchSprints();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Could not update sprint."));
      await refetchSprints();
    }
  }

  // ==========================================
  // UPDATE TASK DETAILS
  // ==========================================

  async function handleTaskUpdate(
    taskId: string,
    updates: EditableTaskFields
  ) {
    setErrorMessage("");

    try {
      await updateTask({
        id: taskId,
        ...updates,
      }).unwrap();

      await refetchSprints();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Could not update task."));
      await refetchSprints();
    }
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
      await refetchSprints();
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
    await handleTaskUpdate(taskId, { status });
  }

  // ==========================================
  // BULK UPDATE TASK FIELDS
  // ==========================================

  function updateBulkValue(field: BulkTaskField, value: string) {
    setBulkValues((previous) => ({
      ...previous,
      [field]: value,
    }));

    setBulkError("");
  }

  async function handleBulkUpdate() {
    setBulkError("");

    if (selectedTaskIds.length === 0 || !selectionSourceId) {
      setBulkError("Select at least one task.");
      return;
    }

    const orderedTaskIds = getOrderedSelectedIds(
      selectedTaskIds,
      selectionSourceId
    );

    if (orderedTaskIds.length === 0) {
      setBulkError("No selected tasks were found.");
      return;
    }

    const fieldsToUpdate = (
      Object.keys(bulkValues) as BulkTaskField[]
    ).filter((field) => bulkValues[field] !== "");

    if (fieldsToUpdate.length === 0) {
      setBulkError("Choose at least one field to update.");
      return;
    }

    try {
      for (const field of fieldsToUpdate) {
        let valueToSend: string | null = bulkValues[field];

        if (
          field === "assignee" &&
          bulkValues[field] === UNASSIGNED_VALUE
        ) {
          valueToSend = null;
        }

        if (
          field === "dueDate" &&
          bulkValues[field] === CLEAR_DATE_VALUE
        ) {
          valueToSend = null;
        }

        await bulkUpdateTasks({
          taskIds: orderedTaskIds,
          field,
          value: valueToSend,
        }).unwrap();
      }

      setBulkValues({ ...emptyBulkValues });
      setBulkError("");
      await refetchSprints();
    } catch (error: unknown) {
      setBulkError(
        getErrorMessage(
          error,
          "Could not update all selected tasks. Please check the changes and try again."
        )
      );

      await refetchSprints();
    }
  }

  // ==========================================
  // GROUP DRAG AND DROP
  // ==========================================

  function handleTaskDragStart(taskId: string, sourceId: string) {
    const idsToMove =
      selectionSourceId === sourceId &&
      selectedTaskIds.includes(taskId)
        ? getOrderedSelectedIds(selectedTaskIds, sourceId)
        : [taskId];

    draggedTaskIdsRef.current = idsToMove;
    setDraggedTaskId(taskId);
    setDragOverDestinationId(null);
    setDropTarget(null);
  }

  async function handleMoveTasks(
    taskIds: string[],
    sprintId: string | null,
    targetTaskId?: string,
    position?: DropPosition
  ) {
    if (taskIds.length === 0 || isBulkMoving) return;

    const orderedTaskIds = [...taskIds];

    setErrorMessage("");

    try {
      await bulkSetTaskSprint({
        projectId,
        taskIds: orderedTaskIds,
        sprintId,
        ...(targetTaskId ? { targetTaskId } : {}),
        ...(position ? { position } : {}),
      }).unwrap();

      clearSelection();
      await refetchSprints();
    } catch (error: unknown) {
      setErrorMessage(
        getErrorMessage(error, "Could not move the selected tasks.")
      );
    } finally {
      resetDragState();
    }
  }

  function handleContainerDragOver(
    event: React.DragEvent<HTMLDivElement>,
    destinationId: string | null
  ) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";

    setDragOverDestinationId(destinationId ?? BACKLOG_ID);
    setDropTarget(null);
  }

  function handleTaskDragOver(
    event: React.DragEvent<HTMLDivElement>,
    taskId: string,
    destinationId: string | null
  ) {
    event.preventDefault();
    event.stopPropagation();

    const currentDraggedIds = draggedTaskIdsRef.current;

    if (
      currentDraggedIds.length === 0 ||
      currentDraggedIds.includes(taskId)
    ) {
      return;
    }

    event.dataTransfer.dropEffect = "move";

    const bounds = event.currentTarget.getBoundingClientRect();
    const midpoint = bounds.top + bounds.height / 2;

    const position: DropPosition =
      event.clientY < midpoint ? "before" : "after";

    const destination = destinationId ?? BACKLOG_ID;

    setDragOverDestinationId(destination);
    setDropTarget({
      taskId,
      position,
      destinationId: destination,
    });
  }

  async function handleTaskDrop(
    event: React.DragEvent<HTMLDivElement>,
    targetTaskId: string,
    destinationSprintId: string | null
  ) {
    event.preventDefault();
    event.stopPropagation();

    const taskIds = [...draggedTaskIdsRef.current];

    if (
      taskIds.length === 0 ||
      taskIds.includes(targetTaskId) ||
      isBulkMoving
    ) {
      resetDragState();
      return;
    }

    const destinationSprint = destinationSprintId
      ? sprints.find((sprint) => sprint._id === destinationSprintId)
      : null;

    if (destinationSprint?.status === "Completed") {
      resetDragState();
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const midpoint = bounds.top + bounds.height / 2;

    const position: DropPosition =
      event.clientY < midpoint ? "before" : "after";

    await handleMoveTasks(
      taskIds,
      destinationSprintId,
      targetTaskId,
      position
    );
  }

  async function handleDropOnEmptyArea(
    event: React.DragEvent<HTMLDivElement>,
    destinationSprintId: string | null
  ) {
    event.preventDefault();
    event.stopPropagation();

    const taskIds = [...draggedTaskIdsRef.current];

    if (taskIds.length === 0 || isBulkMoving) {
      resetDragState();
      return;
    }

    const destinationSprint = destinationSprintId
      ? sprints.find((sprint) => sprint._id === destinationSprintId)
      : null;

    if (destinationSprint?.status === "Completed") {
      resetDragState();
      return;
    }

    await handleMoveTasks(taskIds, destinationSprintId);
  }

  // ==========================================
  // START / COMPLETE / DELETE SPRINT
  // ==========================================

  async function handleStart(sprint: ProjectSprint) {
    setErrorMessage("");

    try {
      await startSprint({
        projectId,
        sprintId: sprint._id,
      }).unwrap();

      await refetchSprints();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Could not start sprint."));
    }
  }

  async function handleComplete(sprint: ProjectSprint) {
    setErrorMessage("");

    try {
      await completeSprint({
        projectId,
        sprintId: sprint._id,
        moveIncompleteToSprintId:
          moveDestinationId === BACKLOG_ID
            ? null
            : moveDestinationId || null,
      }).unwrap();

      setSprintToComplete(null);
      setMoveDestinationId("");
      await refetchSprints();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Could not complete sprint."));
    }
  }

  async function handleDelete(sprint: ProjectSprint) {
    setErrorMessage("");

    try {
      await deleteSprint({
        projectId,
        sprintId: sprint._id,
        moveTasksToSprintId:
          moveDestinationId === BACKLOG_ID
            ? null
            : moveDestinationId || null,
      }).unwrap();

      setSprintToDelete(null);
      setMoveDestinationId("");
      await refetchSprints();
    } catch (error: unknown) {
      setErrorMessage(getErrorMessage(error, "Could not delete sprint."));
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

  // ==========================================
  // BULK EDIT PANEL FIELDS
  // ==========================================

  const bulkFieldLabels: Record<BulkTaskField, string> = {
    status: "Status",
    priority: "Priority",
    type: "Task type",
    assignee: "Assignee",
    dueDate: "Due date",
  };

  const bulkSelectClass =
    "w-full appearance-none rounded-lg border border-gray-200 bg-white py-2.5 pl-3 pr-10 text-sm text-gray-700 outline-none transition hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50";

  function renderBulkSelect(
    field: BulkTaskField,
    children: React.ReactNode
  ) {
    return (
      <div className="relative">
        <select
          id={`bulk-${field}`}
          value={bulkValues[field]}
          onChange={(event) =>
            updateBulkValue(field, event.target.value)
          }
          disabled={isBulkUpdating}
          className={bulkSelectClass}
        >
          {children}
        </select>

        <ChevronDown
          size={15}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
        />
      </div>
    );
  }

  function renderBulkField(field: BulkTaskField) {
    return (
      <div key={field} className="min-w-0 space-y-2">
        <label
          htmlFor={`bulk-${field}`}
          className="block text-sm font-semibold text-gray-800"
        >
          {bulkFieldLabels[field]}
        </label>

        {field === "status" &&
          renderBulkSelect(
            "status",
            <>
              <option value="">Keep existing status</option>
              {taskStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </>
          )}

        {field === "priority" &&
          renderBulkSelect(
            "priority",
            <>
              <option value="">Keep existing priority</option>
              {taskPriorities.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </>
          )}

        {field === "type" &&
          renderBulkSelect(
            "type",
            <>
              <option value="">Keep existing task type</option>
              {taskTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </>
          )}

        {field === "assignee" &&
          renderBulkSelect(
            "assignee",
            <>
              <option value="">Keep existing assignee</option>
              <option value={UNASSIGNED_VALUE}>Unassigned</option>
              {members.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name || member.email}
                </option>
              ))}
            </>
          )}

        {field === "dueDate" && (
          <div className="space-y-2">
            <input
              id="bulk-dueDate"
              type="date"
              value={
                bulkValues.dueDate === CLEAR_DATE_VALUE
                  ? ""
                  : bulkValues.dueDate
              }
              onChange={(event) =>
                updateBulkValue("dueDate", event.target.value)
              }
              disabled={isBulkUpdating}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none transition hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50"
            />

            <button
              type="button"
              onClick={() =>
                updateBulkValue("dueDate", CLEAR_DATE_VALUE)
              }
              disabled={isBulkUpdating}
              className={`w-full rounded-lg border px-3 py-2 text-xs font-medium transition ${
                bulkValues.dueDate === CLEAR_DATE_VALUE
                  ? "border-blue-300 bg-blue-50 text-blue-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              Clear due date
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <section className="w-full space-y-5">
      {/* PAGE HEADER */}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Project Sprints
          </h2>

          {selectedTaskIds.length > 0 && (
            <p className="mt-1 text-xs text-blue-600">
              {selectedTaskIds.length} task(s) selected
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedTaskIds.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => {
                  setShowBulkEdit(true);
                  setBulkError("");
                }}
                disabled={isBusyWithBulk}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
              >
                <Pencil size={15} />
                Edit Fields
              </button>

              <button
                type="button"
                onClick={clearSelection}
                disabled={isBusyWithBulk}
                className="rounded-lg border border-gray-200 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              >
                Clear selection
              </button>
            </>
          )}

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
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {errorMessage}
        </p>
      )}

      {/* CREATE / EDIT SPRINT FORM */}

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

      {/* SPRINTS */}

      {orderedSprints.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500">
          No active or planning sprints. Create a new sprint to get started.
        </div>
      ) : (
        <div className="w-full space-y-4">
          {orderedSprints.map((sprint) => {
            const visibleTasks = filterTasks(sprint.tasks);
            const isBusy = isStarting || isCompleting || isDeleting;

            return (
              <section
                key={sprint._id}
                className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white"
              >
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <EditableSprintDetails
                      sprint={sprint}
                      onUpdate={(updates) =>
                        void handleInlineSprintUpdate(sprint, updates)
                      }
                      disabled={isBusy || isUpdating}
                    />
                  </div>

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

                <div className="w-full overflow-x-auto">
                  <TaskColumnHeader />

                  <div
                    onDragOver={(event) =>
                      handleContainerDragOver(event, sprint._id)
                    }
                    onDragLeave={(event) => {
                      if (
                        !event.currentTarget.contains(
                          event.relatedTarget as Node
                        )
                      ) {
                        setDragOverDestinationId(null);
                        setDropTarget(null);
                      }
                    }}
                    onDrop={(event) =>
                      void handleDropOnEmptyArea(event, sprint._id)
                    }
                    className={`min-h-16 divide-y divide-gray-100 border-t-2 transition-colors ${
                      dragOverDestinationId === sprint._id
                        ? "border-blue-500"
                        : "border-transparent"
                    }`}
                  >
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
                          members={members}
                          onTaskOpen={onTaskOpen}
                          onTaskUpdate={handleTaskUpdate}
                          onStatusChange={handleStatusChange}
                          updatingStatus={isUpdatingTask}
                          moving={isMoving}
                          selected={selectedTaskIds.includes(task._id)}
                          onSelect={(taskId, checked) =>
                            handleSelectTask(taskId, checked, sprint._id)
                          }
                          onDragStart={(taskId) =>
                            handleTaskDragStart(taskId, sprint._id)
                          }
                          onDragEnd={resetDragState}
                          onTaskDragOver={(event, taskId) =>
                            handleTaskDragOver(event, taskId, sprint._id)
                          }
                          onTaskDrop={(event, taskId) =>
                            void handleTaskDrop(event, taskId, sprint._id)
                          }
                          dropPosition={
                            dropTarget?.taskId === task._id &&
                            dropTarget.destinationId === sprint._id
                              ? dropTarget.position
                              : null
                          }
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

      {/* BACKLOG */}

      <section className="w-full overflow-hidden rounded-xl border border-gray-200 bg-white">
        <header className="border-b border-gray-100 px-5 py-4">
          <h3 className="font-semibold text-gray-900">Backlog</h3>
          <p className="mt-1 text-xs text-gray-500">
            Unscheduled project tasks
          </p>
        </header>

        <div className="w-full overflow-x-auto">
          <TaskColumnHeader />

          <div
            onDragOver={(event) => handleContainerDragOver(event, null)}
            onDragLeave={(event) => {
              if (
                !event.currentTarget.contains(
                  event.relatedTarget as Node
                )
              ) {
                setDragOverDestinationId(null);
                setDropTarget(null);
              }
            }}
            onDrop={(event) => void handleDropOnEmptyArea(event, null)}
            className={`min-h-16 divide-y divide-gray-100 border-t-2 transition-colors ${
              dragOverDestinationId === BACKLOG_ID
                ? "border-blue-500"
                : "border-transparent"
            }`}
          >
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
                  members={members}
                  onTaskOpen={onTaskOpen}
                  onTaskUpdate={handleTaskUpdate}
                  onStatusChange={handleStatusChange}
                  updatingStatus={isUpdatingTask}
                  moving={isMoving}
                  selected={selectedTaskIds.includes(task._id)}
                  onSelect={(taskId, checked) =>
                    handleSelectTask(taskId, checked, BACKLOG_ID)
                  }
                  onDragStart={(taskId) =>
                    handleTaskDragStart(taskId, BACKLOG_ID)
                  }
                  onDragEnd={resetDragState}
                  onTaskDragOver={(event, taskId) =>
                    handleTaskDragOver(event, taskId, null)
                  }
                  onTaskDrop={(event, taskId) =>
                    void handleTaskDrop(event, taskId, null)
                  }
                  dropPosition={
                    dropTarget?.taskId === task._id &&
                    dropTarget.destinationId === BACKLOG_ID
                      ? dropTarget.position
                      : null
                  }
                />
              ))
            )}
          </div>
        </div>
      </section>

      {/* BULK EDIT SIDE PANEL */}

      {showBulkEdit && selectedTaskIds.length > 0 && (
        <div className="fixed inset-0 z-[150]">
          <button
            type="button"
            aria-label="Close bulk edit panel"
            onClick={() => setShowBulkEdit(false)}
            disabled={isBusyWithBulk}
            className="absolute inset-0 bg-gray-950/40 backdrop-blur-[2px]"
          />

          <aside className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl">
            {/* PANEL HEADER */}

            <header className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <ListChecks size={20} />
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Edit selected tasks
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Update multiple tasks at once
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowBulkEdit(false)}
                disabled={isBusyWithBulk}
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
                aria-label="Close bulk edit panel"
              >
                <X size={20} />
              </button>
            </header>

            {/* PANEL CONTENT */}

            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              
              {bulkError && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
                >
                  {bulkError}
                </p>
              )}

              <div className="space-y-5">
                {renderBulkField("status")}
                {renderBulkField("priority")}
                {renderBulkField("type")}
                {renderBulkField("assignee")}
                {renderBulkField("dueDate")}
              </div>
            </div>

            {/* PANEL FOOTER */}

            <footer className="space-y-3 border-t border-gray-100 bg-white px-6 py-5">
              <button
                type="button"
                onClick={() => void handleBulkUpdate()}
                disabled={
                  isBulkUpdating ||
                  Object.values(bulkValues).every((value) => value === "")
                }
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isBulkUpdating ? "Applying changes…" : "Apply changes"}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowBulkEdit(false);
                  setBulkError("");
                }}
                disabled={isBulkUpdating}
                className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-gray-800 disabled:opacity-50"
              >
                Close
              </button>
            </footer>
          </aside>
        </div>
      )}

      {/* COMPLETE / DELETE SPRINT MODAL */}

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

                        <option value={BACKLOG_ID}>Backlog</option>

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

                      <option value={BACKLOG_ID}>Backlog</option>

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