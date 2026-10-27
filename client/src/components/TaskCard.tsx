
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

// Possible task statuses
type TaskStatus =
  | "To Do"
  | "In Progress"
  | "In Review"
  | "Done";

// Possible task types
type TaskType =
  | "Epic"
  | "Story"
  | "Task"
  | "Bug";

// Possible priorities
type TaskPriority =
  | "Low"
  | "Medium"
  | "High";
  

// Data that this component receives
interface TaskCardProps {
  task: {
    _id: string;
    taskKey?: string;
    title: string;
    description?: string;
    type: TaskType;
    status: TaskStatus;
    priority: TaskPriority;
    assignee?: {
      _id: string;
      name: string;
      email: string;
    } | string | null;
    project?: {
      _id: string;
      name: string;
    } | string | null;
    dueDate?: string;
  };

  onStatusChange: (
    taskId: string,
    status: TaskStatus
  ) => void;

  isUpdating: boolean;
}

// Statuses shown in the dropdown
const statusOptions: TaskStatus[] = [
  "To Do",
  "In Progress",
  "In Review",
  "Done",
];

// Colors for each priority
const priorityColors: Record<TaskPriority, string> = {
  Low: "bg-gray-100 text-gray-700",
  Medium: "bg-blue-100 text-blue-700",
  High: "bg-orange-100 text-orange-700",
  
};

// Icon for each task type
const typeIcons = {
  Epic: Layers,
  Story: BookOpen,
  Task: CheckSquare,
  Bug: Bug,

};

function TaskCard({
  task,
  onStatusChange,
  isUpdating,
}: TaskCardProps) {
  // Select the icon for this task type
  const TypeIcon = typeIcons[task.type];

  // Get the assignee only when the API returns a user object
  const assignee =
    typeof task.assignee === "object" && task.assignee !== null
      ? task.assignee
      : null;

  // Get the project only when the API returns a project object
  const project =
    typeof task.project === "object" && task.project !== null
      ? task.project
      : null;

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md">

      {/* Task title and priority */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900">
          {task.title}
        </h3>

        <span
          className={`flex shrink-0 items-center gap-1 rounded-md px-2 py-1 text-xs font-medium ${priorityColors[task.priority]}`}
        >
          <Flag size={12} />
          {task.priority}
        </span>
      </div>

      {/* Task description */}
      {task.description && (
        <p className="mb-3 text-xs text-gray-500">
          {task.description}
        </p>
      )}

      {/* Task type and readable ID */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs text-gray-700">
          <TypeIcon size={14} />
          {task.type}
        </span>

        <span className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
          {task.taskKey ?? "ID not available"}
        </span>
      </div>

      {/* Project name */}
      <p className="mb-3 text-xs text-gray-600">
        Project: {project?.name ?? "Project unavailable"}
      </p>

      {/* Assignee name */}
      <div className="mb-3 flex items-center gap-2 border-t border-gray-100 pt-3">
        <CircleUserRound size={20} className="text-gray-500" />

        <div>
          <p className="text-xs text-gray-400">Assignee</p>
          <p className="text-sm font-medium text-gray-700">
            {assignee?.name ?? "Unassigned"}
          </p>
        </div>
      </div>

    {/* Due Date */}

{task.dueDate && (
  <div className="mt-2 flex items-center gap-2 text-sm">
    <CalendarDays size={15} className="shrink-0" />

    <span>
      Due {new Date(task.dueDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })}
    </span>
  </div>
)}


      {/* Change task status */}
      <div className="relative">
        <select
          value={task.status}
          aria-label={`Status for ${task.title}`}
          onChange={(event) =>
            onStatusChange(
              task._id,
              event.target.value as TaskStatus
            )
          }
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

export default TaskCard;
