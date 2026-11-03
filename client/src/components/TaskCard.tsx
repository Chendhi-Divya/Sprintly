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

import type {
  Task,
  TaskStatus,
  TaskPriority,
} from "../services/taskApi";

interface TaskCardProps {
  task: Task;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  isUpdating: boolean;
  onClick?: () => void;
}

const statusOptions: TaskStatus[] = [
  "To Do",
  "In Progress",
  "In Review",
  "Done",
];

const priorityColors: Record<TaskPriority, string> = {
  Low: "bg-gray-100 text-gray-700",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-orange-100 text-orange-700",
};

const typeIcons = {
  Epic: Layers,
  Story: BookOpen,
  Task: CheckSquare,
  Bug: Bug,
};

export default function TaskCard({
  task,
  onStatusChange,
  isUpdating,
  onClick,
}: TaskCardProps) {
  const TypeIcon = typeIcons[task.type];

  const assignee =
    typeof task.assignee === "object" && task.assignee
      ? task.assignee
      : null;

  return (
    <article
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick?.();
        }
      }}
      className="cursor-pointer rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">
          {task.title}
        </h3>

        <span
          className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${
            priorityColors[task.priority]
          }`}
        >
          <Flag size={12} />
          {task.priority}
        </span>
      </div>

      {task.description && (
        <p className="mb-3 line-clamp-2 text-xs text-gray-500">
          {task.description}
        </p>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700">
          <TypeIcon size={14} />
          {task.type}
        </span>

        <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
          {task.taskKey ?? "ID not available"}
        </span>
      </div>

      <div className="mb-3 flex items-center gap-2 border-t border-gray-100 pt-3">
        <CircleUserRound size={20} className="text-gray-500" />

        <div>
          <p className="text-xs text-gray-400">Assignee</p>
          <p className="text-sm font-medium text-gray-700">
            {assignee?.name ?? "Unassigned"}
          </p>
        </div>
      </div>

      {task.dueDate && (
        <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
          <CalendarDays size={15} />

          <span>
            Due{" "}
            {new Date(task.dueDate).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </span>
        </div>
      )}

      <div className="relative mt-3">
        <select
          value={task.status}
          aria-label={`Status for ${task.title}`}
          onClick={(event) => event.stopPropagation()}
          onChange={(event) => {
            event.stopPropagation();
            onStatusChange(
              task._id,
              event.target.value as TaskStatus
            );
          }}
          disabled={isUpdating}
          className="w-full appearance-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 focus:border-indigo-500 focus:outline-none disabled:opacity-60"
        >
          {statusOptions.map((status) => (
            <option key={status} value={status}>
              {status}
            </option>
          ))}
        </select>

        {isUpdating ? (
          <LoaderCircle
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-indigo-500"
          />
        ) : (
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
          />
        )}
      </div>
    </article>
  );
}
