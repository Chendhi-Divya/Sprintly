
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  Search,
  Plus,
  Bell,
  UserRound,
  CheckCheck,
  X,
} from "lucide-react";

import {
  useGetProjectsQuery,
  useGetTasksQuery,
  useCreateTaskMutation,
  useGetProjectMembersQuery,
} from "../services/taskApi";

type TaskType = "Epic" | "Story" | "Task" | "Bug";
type TaskPriority = "Low" | "Medium" | "High";

type Task = {
  _id: string;
  title: string;
  project?: string | { _id: string };
  projectId?: string;
};

type NavbarProps = {
  selectedProjectId?: string;
};

function getTasks(response: unknown): Task[] {
  if (Array.isArray(response)) {
    return response as Task[];
  }

  if (!response || typeof response !== "object") {
    return [];
  }

  const data = response as Record<string, unknown>;

  if (Array.isArray(data.tasks)) {
    return data.tasks as Task[];
  }

  if (Array.isArray(data.data)) {
    return data.data as Task[];
  }

  if (data.data && typeof data.data === "object") {
    const nestedData = data.data as Record<string, unknown>;

    if (Array.isArray(nestedData.tasks)) {
      return nestedData.tasks as Task[];
    }
  }

  return [];
}

function getProjectId(task: Task): string {
  if (typeof task.project === "string") {
    return task.project;
  }

  if (task.project && typeof task.project === "object") {
    return task.project._id;
  }

  return task.projectId ?? "";
}

export default function Navbar({
  selectedProjectId = "",
}: NavbarProps) {
  const [searchText, setSearchText] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TaskType>("Task");
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [assignee, setAssignee] = useState("");
  const [parentTask, setParentTask] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    isError: isProjectsError,
    refetch: refetchProjects,
  } = useGetProjectsQuery();

  const {
    data: tasksData,
    isLoading: isLoadingTasks,
    isFetching: isFetchingTasks,
    isError: isTasksError,
    refetch: refetchTasks,
  } = useGetTasksQuery();

  const [createTask, { isLoading: isCreating }] =
    useCreateTaskMutation();

  const projects = projectsData?.projects ?? [];
  const tasks = getTasks(tasksData);

  // Find the project currently selected.
  const projectId =
    selectedProjectId ||
    (projects.length === 1 ? projects[0]._id : "");

  const selectedProject = projects.find(
    (project) => project._id === projectId
  );

  // Fetch members of this project.
  const {
    data: membersData,
    isLoading: isLoadingMembers,
    isError: isMembersError,
    refetch: refetchMembers,
  } = useGetProjectMembersQuery(projectId, {
    skip: !projectId,
  });

  const members = membersData?.members ?? [];

  // Find existing tasks in this project for the Parent Task dropdown.
  const parentTasks = tasks.filter(
    (task) =>
      task._id &&
      task.title &&
      getProjectId(task) === projectId
  );

  useEffect(() => {
    setParentTask("");
    setAssignee("");
  }, [projectId]);

  function resetForm() {
    setTitle("");
    setDescription("");
    setType("Task");
    setPriority("Medium");
    setAssignee("");
    setParentTask("");
    setErrorMessage("");
  }

  function handleCreate() {
    resetForm();
    setShowCreateForm(true);

    void refetchProjects();
    void refetchTasks();

    if (projectId) {
      void refetchMembers();
    }
  }

  function handleClose() {
    if (isCreating) return;

    setShowCreateForm(false);
    setErrorMessage("");
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setErrorMessage("");

    if (isLoadingProjects) {
      setErrorMessage("Please wait while projects load.");
      return;
    }

    if (isProjectsError) {
      setErrorMessage("Could not load projects. Please try again.");
      return;
    }

    if (!title.trim()) {
      setErrorMessage("Please enter a task title.");
      return;
    }

    if (!projectId || !selectedProject) {
      setErrorMessage("Please select a project first.");
      return;
    }

    if (
      parentTask &&
      !parentTasks.some((task) => task._id === parentTask)
    ) {
      setErrorMessage("Please select a valid parent task.");
      return;
    }

    // Do not submit a selected assignee if members failed to load.
    if (assignee && !members.some((member) => member._id === assignee)) {
      setErrorMessage(
        "The selected assignee is invalid. Please reload the members."
      );
      return;
    }

    try {
      await createTask({
        title: title.trim(),
        description: description.trim(),
        type,
        priority,
        project: projectId,
        ...(assignee ? { assignee } : {}),
        ...(parentTask ? { parentTask } : {}),
      }).unwrap();

      resetForm();
      setShowCreateForm(false);
      void refetchTasks();
    } catch (error: unknown) {
      console.error("Failed to create task:", error);

      if (typeof error === "object" && error !== null) {
        const apiError = error as {
          data?: { message?: string; error?: string };
          error?: string;
        };

        setErrorMessage(
          apiError.data?.message ||
            apiError.data?.error ||
            apiError.error ||
            "Failed to create task. Please try again."
        );
      } else {
        setErrorMessage("Failed to create task. Please try again.");
      }
    }
  }

  const cannotCreate =
    isCreating ||
    isLoadingProjects ||
    isProjectsError ||
    !projectId ||
    !selectedProject;

  let parentTaskPlaceholder = "Please Select Task";

  if (!projectId) {
    parentTaskPlaceholder = "Select a project first";
  } else if (isLoadingTasks || isFetchingTasks) {
    parentTaskPlaceholder = "Loading tasks...";
  } else if (isTasksError) {
    parentTaskPlaceholder = "Could not load tasks";
  } else if (parentTasks.length === 0) {
    parentTaskPlaceholder = "No existing tasks in this project";
  }

  return (
    <>
      <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 bg-white px-5 py-3">
        <div className="flex shrink-0 items-center gap-2">
          <div className="rounded-lg bg-blue-600 p-2 text-white">
            <CheckCheck size={21} />
          </div>

          <h1 className="text-xl font-bold text-gray-900">
            Sprintly
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex w-56 items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 focus-within:border-blue-500">
            <Search size={17} className="shrink-0 text-gray-500" />

            <input
              type="text"
              placeholder="Search tasks..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className="w-full min-w-0 bg-transparent text-sm text-gray-800 outline-none"
            />
          </div>

          <button
            type="button"
            onClick={handleCreate}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus size={17} />
            Create
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <button
            type="button"
            aria-label="Notifications"
            className="text-gray-600 hover:text-blue-600"
          >
            <Bell size={21} />
          </button>

          <button
            type="button"
            aria-label="Profile"
            className="rounded-full bg-gray-100 p-2 text-gray-700 hover:bg-gray-200"
          >
            <UserRound size={20} />
          </button>
        </div>
      </nav>

      {showCreateForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
          onClick={handleClose}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-task-title"
            className="my-auto max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2
                  id="create-task-title"
                  className="text-lg font-bold text-gray-900"
                >
                  Create Task
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Enter the details for your new task.
                </p>
              </div>

              <button
                type="button"
                onClick={handleClose}
                disabled={isCreating}
                aria-label="Close create task form"
                className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            {errorMessage && (
              <p
                role="alert"
                className="mb-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"
              >
                {errorMessage}
              </p>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label
                  htmlFor="task-title"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Task Title 
                </label>

                <input
                  id="task-title"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Enter task title"
                  required
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label
                  htmlFor="task-description"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Description
                </label>

                <textarea
                  id="task-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Describe the task"
                  rows={2}
                  className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="task-type"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Task Type
                  </label>

                  <select
                    id="task-type"
                    value={type}
                    onChange={(event) =>
                      setType(event.target.value as TaskType)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="Epic">Epic</option>
                    <option value="Story">Story</option>
                    <option value="Task">Task</option>
                    <option value="Bug">Bug</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="task-priority"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Priority
                  </label>

                  <select
                    id="task-priority"
                    value={priority}
                    onChange={(event) =>
                      setPriority(event.target.value as TaskPriority)
                    }
                    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>
            
{/* Due Date */}
<div className="space-y-1">
  <label
    htmlFor="dueDate"
    className="text-sm font-medium text-gray-700"
  >
    Due Date
  </label>

  <input
    id="dueDate"
    name="dueDate"
    type="date"
    value={dueDate}
    onChange={(event) => setDueDate(event.target.value)}
    className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
  />
</div>


              {/* Assignee dropdown */}
              <div>
                <label
                  htmlFor="task-assignee"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Assignee
                </label>

                <select
                  id="task-assignee"
                  value={assignee}
                  onChange={(event) => setAssignee(event.target.value)}
                  disabled={!projectId || isLoadingMembers || isMembersError}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">
                    {!projectId
                      ? "Select a project first"
                      : isLoadingMembers
                        ? "Loading members..."
                        : isMembersError
                          ? "Could not load members"
                          : members.length === 0
                            ? "No members found"
                            : "Unassigned"}
                  </option>

                  {members.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.name} ({member.email})
                    </option>
                  ))}
                </select>

                {isMembersError && (
                  <button
                    type="button"
                    onClick={() => void refetchMembers()}
                    className="mt-1 text-xs font-medium text-blue-600 hover:underline"
                  >
                    Retry loading members
                  </button>
                )}
              </div>

              <div>
                <label
                  htmlFor="parent-task"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Parent Task{" "}
                  <span className="font-normal text-gray-400">
                   
                  </span>
                </label>

                <select
                  id="parent-task"
                  value={parentTask}
                  onChange={(event) => setParentTask(event.target.value)}
                  disabled={
                    isLoadingTasks ||
                    isFetchingTasks ||
                    isTasksError ||
                    !projectId
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                >
                  <option value="">{parentTaskPlaceholder}</option>

                  {parentTasks.map((task) => (
                    <option key={task._id} value={task._id}>
                      {task.title}
                    </option>
                  ))}
                </select>

                {isTasksError && (
                  <button
                    type="button"
                    onClick={() => void refetchTasks()}
                    className="mt-1 text-xs font-medium text-blue-600 hover:underline"
                  >
                    Retry loading tasks
                  </button>
                )}
              </div>

              <div className="flex justify-end gap-2 border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isCreating}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={cannotCreate}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isCreating ? "Creating..." : "Create Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
