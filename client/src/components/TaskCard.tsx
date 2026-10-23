import {
  CalendarDays,
  CircleUserRound,
  Flag,
  Bug,
  BookOpen,
  CheckSquare,
  Layers,
  ChevronDown,
  LoaderCircle,
} from "lucide-react";

type TaskStatus =
  | "To Do"
  | "In Progress"
  | "In Review"
  | "Done";

type TaskType =
  | "Epic"
  | "Story"
  | "Task"
  | "Bug"
  | "Sub-task";

type TaskPriority =
  | "Low"
  | "Medium"
  | "High"
  | "Urgent";

interface TaskCardProps {
  task: {
    _id: string;
    title: string;
    description?: string;
    type: TaskType;
    status: TaskStatus;
    priority: TaskPriority;
    assignee?: {
      _id: string;
      name: string;
      email: string;
    };
    project?: {
      _id: string;
      name: string;
    };
    dueDate?: string;
  };
  onStatusChange: (
    taskId: string,
    status: TaskStatus
  ) => void;
  isUpdating: boolean;
}

const statusOptions: TaskStatus[] = [
  "To Do",
  "In Progress",
  "In Review",
  "Done",
];

const priorityStyles: Record<TaskPriority, string> = {
  Low: "text-gray-600 bg-gray-50 border-gray-200",
  Medium: "text-blue-700 bg-blue-50 border-blue-100",
  High: "text-orange-700 bg-orange-50 border-orange-100",
  Urgent: "text-red-700 bg-red-50 border-red-100",
};

const typeIcons = {
  Epic: Layers,
  Story: BookOpen,
  Task: CheckSquare,
  Bug: Bug,
  "Sub-task": CheckSquare,
};

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function formatDate(date: string) {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Invalid date";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
  });
}

function TaskCard({
  task,
  onStatusChange,
  isUpdating,
}: TaskCardProps) {
  const TypeIcon = typeIcons[task.type];

  return (
    <article className="group rounded-lg border border-gray-200 bg-white p-3 transition hover:border-blue-300 hover:shadow-sm">
      {/* Title and priority */}
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="min-w-0 break-words text-sm font-medium leading-5 text-gray-900">
          {task.title}
        </h3>

        <span
          className={`inline-flex shrink-0 items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] font-medium ${priorityStyles[task.priority]}`}
          title={`Priority: ${task.priority}`}
        >
          <Flag size={10} />
          {task.priority}
        </span>
      </div>

      {/* Description */}
      {task.description && (
        <p className="mb-2 line-clamp-2 text-xs leading-4 text-gray-500">
          {task.description}
        </p>
      )}

      {/* Type and task ID */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] text-gray-600">
          <TypeIcon size={12} />
          {task.type}
        </span>

        <span
          className="text-[10px] text-gray-400"
          title={`Task ID: ${task._id}`}
        >
          #{task._id.slice(-6).toUpperCase()}
        </span>
      </div>

      {/* Project */}
      {task.project?.name && (
        <p className="mb-2 truncate text-xs text-gray-500">
          {task.project.name}
        </p>
      )}

      {/* Assignee and due date */}
      <div className="mb-2 flex min-w-0 items-center justify-between gap-2 border-t border-gray-100 pt-2">
        <div
          className="flex min-w-0 items-center gap-1.5"
          title={task.assignee?.name ?? "Unassigned"}
        >
          {task.assignee?.name ? (
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-semibold text-blue-700">
              {getInitials(task.assignee.name)}
            </div>
          ) : (
            <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gray-100 text-gray-500">
              <CircleUserRound size={15} />
            </div>
          )}

          <span className="truncate text-xs text-gray-600">
            {task.assignee?.name ?? "Unassigned"}
          </span>
        </div>

        {task.dueDate && (
          <span
            className="flex shrink-0 items-center gap-1 text-[10px] text-gray-500"
            title={`Due date: ${formatDate(task.dueDate)}`}
          >
            <CalendarDays size={12} />
            {formatDate(task.dueDate)}
          </span>
        )}
      </div>

      {/* Status dropdown */}
      <div className="relative">
        <select
          aria-label={`Update status for ${task.title}`}
          value={task.status}
          onChange={(event) =>
            onStatusChange(
              task._id,
              event.target.value as TaskStatus
            )
          }
          disabled={isUpdating}
          className="w-full appearance-none rounded-md border border-gray-200 bg-gray-50 px-2.5 py-1.5 pr-8 text-xs font-medium text-gray-700 outline-none transition hover:border-blue-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-wait disabled:opacity-60"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        {isUpdating ? (
          <LoaderCircle
            size={13}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 animate-spin text-blue-500"
          />
        ) : (
          <ChevronDown
            size={13}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
        )}
      </div>
    </article>
  );
}

export default TaskCard;
