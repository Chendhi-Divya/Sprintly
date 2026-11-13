import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store/store";

import {
  X,
  Pencil,
  CalendarDays,
  UserRound,
  Flag,
  Paperclip,
  MessageSquare,
  Send,
  Plus,
  ChevronDown,
  Link,
  FileText,
  Image,
  Upload,
  Trash2,
} from "lucide-react";

import {
  useGetTaskByIdQuery,
  useGetTasksQuery,
  useGetProjectSprintsQuery,
  useGetOrganizationByIdQuery,
  useUpdateTaskMutation,
  useUploadTaskAttachmentMutation,
  useDeleteTaskAttachmentMutation,
  useGetTaskCommentsQuery,
  useAddTaskCommentMutation,
  type TaskPriority,
  type TaskType,
  type TaskAttachment,
  useCreateTaskMutation,
  useSetTaskSprintMutation,
} from "../services/taskApi";

type TaskItem = NonNullable<
  ReturnType<typeof useGetTasksQuery>["data"]
>["tasks"][number];

type TaskDetailsPanelProps = {
  taskId: string;
  initialTask?: TaskItem;
  onClose: () => void;
};

type ToastType = "success" | "error";

type OrganizationMember = {
  _id: string;
  name?: string;
  email?: string;
};

const priorities: TaskPriority[] = ["Low", "Medium", "High"];
const childTaskTypes: TaskType[] = ["Task", "Story", "Bug"];

function getFailureMessage(error: unknown, fallback: string): string {
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

function formatFileSize(size?: number): string {
  if (!size) return "";

  if (size < 1024) return `${size} B`;

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getAttachmentName(attachment: TaskAttachment): string {
  return (
    attachment.originalName ||
    attachment.filename ||
    "Attachment"
  );
}

export default function TaskDetailsPanel({
  taskId,
  initialTask,
  onClose,
}: TaskDetailsPanelProps) {
  const {
    data,
    isLoading,
    isError,
    refetch: refetchTask,
  } = useGetTaskByIdQuery(taskId);

  const {
    data: allTasksData,
    isLoading: isLoadingTasks,
    refetch: refetchTasks,
  } = useGetTasksQuery();

  const [updateTask, { isLoading: isSaving }] =
    useUpdateTaskMutation();

  const [createTask, { isLoading: isCreatingChild }] =
    useCreateTaskMutation();

  const [uploadTaskAttachment, { isLoading: isUploading }] =
    useUploadTaskAttachmentMutation();

  const [deleteTaskAttachment, { isLoading: isDeletingAttachment }] =
    useDeleteTaskAttachmentMutation();

  const {
    data: commentsData,
    isLoading: isLoadingComments,
    isError: isCommentsError,
  } = useGetTaskCommentsQuery(taskId);

  const [addTaskComment, { isLoading: isAddingComment }] =
    useAddTaskCommentMutation();

  const selectedOrganization = useSelector(
    (state: RootState) => state.auth.selectedOrganization
  );

  const authToken = useSelector(
    (state: RootState) => state.auth.token
  );

  const organizationCode = selectedOrganization?.org_id ?? "";

  const {
    data: organizationData,
    isLoading: isLoadingMembers,
    isError: isMembersError,
    refetch: refetchMembers,
  } = useGetOrganizationByIdQuery(organizationCode, {
    skip: !organizationCode,
  });

  const task = data?.task ?? initialTask;
  const comments = commentsData?.comments ?? [];
  const attachments: TaskAttachment[] = task?.attachments ?? [];
  const taskProjectId =
    typeof task?.project === "object" && task.project
      ? task.project._id
      : task?.project ?? "";
  const { data: projectSprintsData, isLoading: isLoadingProjectSprints } =
    useGetProjectSprintsQuery(taskProjectId, { skip: !taskProjectId });
  const [setTaskSprint, { isLoading: isUpdatingSprint }] =
    useSetTaskSprintMutation();

  const defaultChildParentId = task
    ? task.type === "Epic"
      ? task._id
      : typeof task.parentTask === "object" && task.parentTask
        ? task.parentTask._id
        : task.parentTask || task._id
    : "";

  // Organization members
  const organization = organizationData?.organization;

  const rawMembers = [
    ...(organization?.members ?? []),
    ...(organization?.memberships ?? []).map(
      (membership) => membership.user
    ),
    ...(organization?.admin ? [organization.admin] : []),
  ];

  const members: OrganizationMember[] = Array.from(
    new Map(
      rawMembers
        .filter(
          (member): member is OrganizationMember =>
            typeof member === "object" &&
            member !== null &&
            "_id" in member &&
            typeof member._id === "string"
        )
        .map((member) => [member._id, member])
    ).values()
  );

  // Local state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingDescription, setIsEditingDescription] =
    useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [commentText, setCommentText] = useState("");
  const [showChildTaskForm, setShowChildTaskForm] = useState(false);
  const [childTaskTitle, setChildTaskTitle] = useState("");
  const [childTaskType, setChildTaskType] = useState<TaskType>("Task");
  const [childTaskPriority, setChildTaskPriority] =
    useState<TaskPriority>("Medium");
  const [childParentSelection, setChildParentSelection] = useState({
    taskId,
    parentId: "",
  });
  const selectedChildParentId =
    childParentSelection.taskId === taskId && childParentSelection.parentId
      ? childParentSelection.parentId
      : defaultChildParentId;

  // Add Epic dropdown visibility
  const [showEpicInput, setShowEpicInput] = useState(false);
  const epicDropdownRef = useRef<HTMLDivElement>(null);

  // Attachment delete confirmation
  const [attachmentToDelete, setAttachmentToDelete] =
    useState<TaskAttachment | null>(null);

  const [toast, setToast] = useState<{
    text: string;
    type: ToastType;
  } | null>(null);

  function showToast(
    text: string,
    type: ToastType = "success"
  ) {
    setToast({ text, type });

    window.setTimeout(() => {
      setToast(null);
    }, 3000);
  }

  async function handleCreateChildTask(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const projectId = task
      ? typeof task.project === "object" && task.project
        ? task.project._id
        : task.project
      : "";

    if (!task || !projectId || !childTaskTitle.trim()) {
      showToast("Enter a task title before creating it.", "error");
      return;
    }

    try {
      await createTask({
        title: childTaskTitle.trim(),
        type: childTaskType,
        priority: childTaskPriority,
        project: projectId,
        parentTask: selectedChildParentId,
      }).unwrap();

      await refetchTasks();
      setChildTaskTitle("");
      setChildTaskType("Task");
      setChildTaskPriority("Medium");
      setShowChildTaskForm(false);
      showToast("Child task created successfully.");
    } catch (error: unknown) {
      showToast(
        getFailureMessage(error, "Failed to create child task."),
        "error"
      );
    }
  }

  // Close Add Epic dropdown when clicking outside
  useEffect(() => {
    if (!showEpicInput) return;

    function handleOutsideClick(event: MouseEvent) {
      if (
        epicDropdownRef.current &&
        !epicDropdownRef.current.contains(event.target as Node)
      ) {
        setShowEpicInput(false);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleOutsideClick
      );
    };
  }, [showEpicInput]);

  // Update inputs when task changes
  useEffect(() => {
    if (task) {
      setTitle(task.title ?? "");
      setDescription(task.description ?? "");
    }
  }, [task?._id, task?.title, task?.description]);

  // Escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        if (attachmentToDelete) {
          if (!isDeletingAttachment) {
            setAttachmentToDelete(null);
          }
          return;
        }

        if (showEpicInput) {
          setShowEpicInput(false);
          return;
        }

        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [
    onClose,
    showEpicInput,
    attachmentToDelete,
    isDeletingAttachment,
  ]);

  if (isLoading && !task) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="flex h-[300px] w-full max-w-6xl items-center justify-center rounded-2xl bg-white">
          <p className="text-sm text-gray-500">
            Loading task details...
          </p>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="flex h-[300px] w-full max-w-6xl flex-col items-center justify-center rounded-2xl bg-white p-6">
          <p className="text-sm text-red-600">
            {isError
              ? "Unable to load task details. Please try again."
              : "Task not found."}
          </p>

          <button
            onClick={onClose}
            className="mt-4 rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Current project ID
  const projectId = taskProjectId;

  // Only Epic tasks from the same project
  const availableEpics = (allTasksData?.tasks ?? []).filter(
    (item) => {
      const itemProjectId =
        typeof item.project === "object" && item.project
          ? item.project._id
          : item.project;

      return (
        itemProjectId === projectId &&
        item.type === "Epic" &&
        item._id !== task._id
      );
    }
  );

  // Resolve parent ID whether populated or not
  const parentTaskId =
    typeof task.parentTask === "object" && task.parentTask
      ? task.parentTask._id
      : task.parentTask;

  // Resolve parent task
  const currentParent =
    (allTasksData?.tasks ?? []).find(
      (item) => item._id === parentTaskId
    ) ??
    (typeof task.parentTask === "object" && task.parentTask
      ? task.parentTask
      : null);

  const childTasks = (allTasksData?.tasks ?? []).filter((item) => {
    const itemParentId =
      typeof item.parentTask === "object" && item.parentTask
        ? item.parentTask._id
        : item.parentTask;

    return itemParentId === selectedChildParentId;
  });

  const childParentOptions = [
    currentParent ?? task,
    ...availableEpics,
  ].filter(
    (item, index, items) =>
      items.findIndex((candidate) => candidate._id === item._id) === index
  );

  // Current assignee ID
  const currentAssigneeId =
    typeof task.assignee === "object" && task.assignee
      ? task.assignee._id
      : typeof task.assignee === "string"
        ? task.assignee
        : "";

  const modalClass =
    "relative flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl";

  const inputClass =
    "box-border w-full min-w-0 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50 disabled:cursor-not-allowed disabled:bg-gray-100";

  const labelClass =
    "mb-2 flex items-center gap-2 text-sm font-medium text-gray-600";

  // Save title
  async function saveTitle() {
    const updatedTitle = title.trim();

    if (!updatedTitle) {
      showToast("Task name cannot be empty.", "error");
      return;
    }

    try {
      await updateTask({
        id: taskId,
        title: updatedTitle,
      }).unwrap();

      await refetchTask();

      setIsEditingTitle(false);
      showToast("Task name updated successfully.");
    } catch (error: unknown) {
      showToast(
        getFailureMessage(error, "Failed to update task name."),
        "error"
      );
    }
  }

  // Save description
  async function saveDescription() {
    try {
      await updateTask({
        id: taskId,
        description,
      }).unwrap();

      await refetchTask();

      setIsEditingDescription(false);
      showToast("Description updated successfully.");
    } catch (error: unknown) {
      showToast(
        getFailureMessage(error, "Failed to update description."),
        "error"
      );
    }
  }

  // Update priority and due date
  async function updateField(values: {
    priority?: TaskPriority;
    dueDate?: string | null;
  }) {
    try {
      await updateTask({
        id: taskId,
        ...values,
      }).unwrap();

      await refetchTask();
      showToast("Task details updated successfully.");
    } catch (error: unknown) {
      showToast(
        getFailureMessage(error, "Failed to update task details."),
        "error"
      );
    }
  }

  // Update assignee
  async function handleAssigneeChange(assigneeId: string) {
    try {
      await updateTask({
        id: taskId,
        assignee: assigneeId || null,
      }).unwrap();

      await refetchTask();

      showToast(
        assigneeId
          ? "Assignee updated successfully."
          : "Assignee removed successfully."
      );
    } catch (error: unknown) {
      showToast(
        getFailureMessage(error, "Failed to update assignee."),
        "error"
      );
    }
  }

  // Assign, change, or remove selected Epic
  async function handleSelectEpic(selectedEpicId: string) {
    if (isSaving) return;

    try {
      await updateTask({
        id: taskId,
        parentTask: selectedEpicId || null,
      }).unwrap();

      await Promise.all([
        refetchTask(),
        refetchTasks(),
      ]);

      setShowEpicInput(false);

      showToast(
        selectedEpicId
          ? "Parent Epic updated successfully."
          : "Parent Epic removed successfully."
      );
    } catch (error: unknown) {
      showToast(
        getFailureMessage(error, "Failed to update parent Epic."),
        "error"
      );
    }
  }

  async function handleSprintChange(sprintId: string) {
    if (!taskProjectId || isUpdatingSprint) return;

    try {
      await setTaskSprint({
        projectId: taskProjectId,
        taskId,
        sprintId: sprintId || null,
      }).unwrap();
      await refetchTask();
      showToast("Task sprint updated successfully.");
    } catch (error: unknown) {
      showToast(
        getFailureMessage(error, "Failed to update task sprint."),
        "error"
      );
    }
  }

  // Add comment
  async function handleAddComment() {
    const text = commentText.trim();

    if (!text) {
      showToast("Please write a comment first.", "error");
      return;
    }

    try {
      await addTaskComment({
        taskId,
        text,
      }).unwrap();

      setCommentText("");
      showToast("Comment added successfully.");
    } catch (error: unknown) {
      showToast(
        getFailureMessage(
          error,
          "Failed to add comment. Please try again."
        ),
        "error"
      );
    }
  }

  // Open file picker
  function openAttachmentPicker() {
    if (isUploading) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }

  // Upload attachment
  async function handleFileUpload(file: File) {
    setSelectedFile(file);

    try {
      await uploadTaskAttachment({
        taskId,
        file,
      }).unwrap();

      await refetchTask();
      showToast("File uploaded successfully.");
    } catch (error: unknown) {
      showToast(
        getFailureMessage(
          error,
          "File upload failed. Please check the file and try again."
        ),
        "error"
      );
    } finally {
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  // Delete attachment after in-page confirmation
  async function handleDeleteAttachment() {
    if (!attachmentToDelete || isDeletingAttachment) return;

    try {
      await deleteTaskAttachment({
        taskId,
        attachmentId: attachmentToDelete.fileId,
      }).unwrap();

      await refetchTask();

      setAttachmentToDelete(null);
      showToast("Attachment deleted successfully.");
    } catch (error: unknown) {
      showToast(
        getFailureMessage(error, "Failed to delete attachment."),
        "error"
      );
    }
  }

  // Open attachment
  async function handleOpenAttachment(attachment: TaskAttachment) {
    const newTab = window.open("about:blank", "_blank");

    if (!newTab) {
      showToast("Allow pop-ups to open this attachment.", "error");
      return;
    }

    try {
      const token = authToken || localStorage.getItem("token");

      const response = await fetch(attachment.url, {
        credentials: "include",
        headers: token
          ? { Authorization: `Bearer ${token}` }
          : undefined,
      });

      if (!response.ok) {
        throw new Error("Unable to load this attachment.");
      }

      const fileUrl = URL.createObjectURL(await response.blob());

      newTab.location.href = fileUrl;

      window.setTimeout(() => URL.revokeObjectURL(fileUrl), 60_000);
    } catch (error: unknown) {
      newTab.close();

      showToast(
        getFailureMessage(error, "Unable to open this attachment."),
        "error"
      );
    }
  }

  // Copy link to a task using its ID
  async function copyTaskLink(targetTaskId: string) {
    const taskUrl = new URL("/dashboard", window.location.origin);

    taskUrl.searchParams.set("taskId", targetTaskId);

    try {
      await navigator.clipboard.writeText(taskUrl.toString());
      showToast("Task link copied to clipboard.");
    } catch {
      showToast("Unable to copy the task link.", "error");
    }
  }

  const formattedDueDate = task.dueDate
    ? new Date(task.dueDate).toISOString().slice(0, 10)
    : "";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className={modalClass}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Toast */}
        {toast && (
          <div
            role="status"
            className={`absolute right-4 top-4 z-[70] flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${
              toast.type === "success"
                ? "bg-gray-800 text-white"
                : "bg-red-600 text-white"
            }`}
          >
            {toast.type === "error" && <X size={16} />}

            <span>{toast.text}</span>

            <button
              onClick={() => setToast(null)}
              className="ml-2 rounded p-0.5 hover:bg-white/20"
              aria-label="Close notification"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Delete attachment confirmation */}
        {attachmentToDelete && (
          <div className="absolute inset-0 z-[80] flex items-center justify-center bg-black/40 p-4">
            <div
              className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900">
                Delete attachment?
              </h3>

              <p className="mt-3 break-words text-sm leading-6 text-gray-600">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-gray-800">
                  "{getAttachmentName(attachmentToDelete)}"
                </span>
                ?
              </p>

              <p className="mt-1 text-sm text-gray-500">
                This action cannot be undone.
              </p>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAttachmentToDelete(null)}
                  disabled={isDeletingAttachment}
                  className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={() => void handleDeleteAttachment()}
                  disabled={isDeletingAttachment}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isDeletingAttachment ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="relative z-30 flex shrink-0 items-center justify-between gap-4 border-b border-gray-200 px-6 py-5 sm:px-8">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            {currentParent && (
              <span className="shrink-0 text-sm font-semibold text-blue-600">
                {currentParent.taskKey ?? "Epic"}
              </span>
            )}

            {currentParent && <span className="text-gray-300">/</span>}

            <div className="group flex shrink-0 items-center gap-1">
              <span className="text-sm font-semibold text-blue-600">
                {task.taskKey ?? ""}
              </span>

              <button
                type="button"
                onClick={() => void copyTaskLink(task._id)}
                className="rounded p-1 text-gray-400 opacity-0 transition hover:bg-blue-50 hover:text-blue-600 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-blue-400 group-hover:opacity-100"
                aria-label="Copy link to this task"
                title="Copy current task link"
              >
                <Link size={15} />
              </button>
            </div>

            {/* Add Epic when no parent exists */}
            {!currentParent && task.type !== "Epic" && (
              <div
                ref={epicDropdownRef}
                className="relative shrink-0"
              >
                <button
                  type="button"
                  onClick={() =>
                    setShowEpicInput((previous) => !previous)
                  }
                  className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition ${
                    showEpicInput
                      ? "border-blue-200 bg-blue-50 text-blue-600"
                      : "border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                  }`}
                >
                  Add Epic
                  <ChevronDown size={15} />
                </button>

                {showEpicInput && (
                  <div className="absolute left-0 top-full z-50 mt-2 w-[min(340px,calc(100vw-2rem))] rounded-xl border border-gray-200 bg-white p-3 shadow-xl">
                    <p className="mb-3 px-2 text-sm font-semibold text-gray-700">
                      Select your Epic
                    </p>

                    {isLoadingTasks ? (
                      <p className="px-2 py-3 text-sm text-gray-400">
                        Loading Epic tasks...
                      </p>
                    ) : availableEpics.length === 0 ? (
                      <p className="px-2 py-3 text-sm text-gray-400">
                        No Epic tasks available in this project.
                      </p>
                    ) : (
                      <div className="max-h-64 space-y-1 overflow-y-auto">
                        {availableEpics.map((epic) => (
                          <button
                            key={epic._id}
                            type="button"
                            disabled={isSaving}
                            onClick={() =>
                              void handleSelectEpic(epic._id)
                            }
                            className="flex w-full items-center rounded-lg px-3 py-2.5 text-left transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            <span className="w-full truncate text-sm font-medium text-gray-700">
                              {epic.taskKey} - {epic.title}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900"
            aria-label="Close task details"
          >
            <X size={20} />
          </button>
        </div>

        {/* Main content */}
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Left section */}
          <div className="min-w-0 space-y-8 p-6 sm:p-8">
            {/* Task name */}
            <section>
              {isEditingTitle ? (
                <div className="space-y-3">
                  <input
                    type="text"
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        void saveTitle();
                      }
                    }}
                    autoFocus
                    className="w-full rounded-xl border border-blue-300 px-4 py-3 text-xl font-semibold text-gray-900 outline-none focus:ring-4 focus:ring-blue-50 sm:text-2xl"
                  />

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => {
                        setTitle(task.title);
                        setIsEditingTitle(false);
                      }}
                      disabled={isSaving}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={() => void saveTitle()}
                      disabled={isSaving}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <h2 className="break-words text-2xl font-semibold leading-snug text-gray-900 sm:text-3xl">
                    {task.title}
                  </h2>

                  <button
                    onClick={() => {
                      setTitle(task.title);
                      setIsEditingTitle(true);
                    }}
                    className="shrink-0 rounded-lg p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600"
                    aria-label="Edit task name"
                  >
                    <Pencil size={16} />
                  </button>
                </div>
              )}
            </section>

            {/* Description */}
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-gray-900">
                  Description
                </h3>

                {!isEditingDescription && (
                  <button
                    onClick={() => {
                      setDescription(task.description ?? "");
                      setIsEditingDescription(true);
                    }}
                    className="shrink-0 rounded-lg p-2 text-gray-500 transition hover:bg-blue-50 hover:text-blue-600"
                    aria-label="Edit description"
                  >
                    <Pencil size={16} />
                  </button>
                )}
              </div>

              {isEditingDescription ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
                  <textarea
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    rows={6}
                    placeholder="Describe the task, its requirements, and expected outcome..."
                    className="w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-800 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />

                  <div className="mt-4 flex justify-end gap-3">
                    <button
                      onClick={() => {
                        setDescription(task.description ?? "");
                        setIsEditingDescription(false);
                      }}
                      disabled={isSaving}
                      className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={() => void saveDescription()}
                      disabled={isSaving}
                      className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 sm:p-5">
                  <p className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-600">
                    {task.description ||
                      "No description added yet. Click the edit icon to add one."}
                  </p>
                </div>
              )}
            </section>

            {/* Attachments */}
            <section>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Paperclip size={18} className="text-gray-500" />

                  <h3 className="text-base font-semibold text-gray-900">
                    Attachments
                  </h3>

                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                    {attachments.length}
                  </span>
                </div>

                {attachments.length > 0 && (
                  <button
                    type="button"
                    onClick={openAttachmentPicker}
                    disabled={isUploading}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Plus size={16} />
                    New
                  </button>
                )}
              </div>

              {attachments.length > 0 && (
                <div className="space-y-2">
                  {attachments.map((attachment) => {
                    const isImage =
                      attachment.mimetype?.startsWith("image/") ??
                      /\.(png|jpe?g|gif|webp|svg)$/i.test(
                        getAttachmentName(attachment)
                      );

                    return (
                      <div
                        key={attachment._id}
                        className="flex min-w-0 items-center gap-2 rounded-xl border border-gray-200 bg-white p-3 transition hover:border-blue-300 hover:bg-blue-50/40"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            void handleOpenAttachment(attachment)
                          }
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          aria-label={`Open ${getAttachmentName(attachment)}`}
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                            {isImage ? (
                              <Image size={19} />
                            ) : (
                              <FileText size={19} />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium text-gray-800">
                              {getAttachmentName(attachment)}
                            </p>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-400">
                              {attachment.size ? (
                                <span>
                                  {formatFileSize(attachment.size)}
                                </span>
                              ) : null}

                              {attachment.uploadedAt ? (
                                <span>
                                  {new Date(
                                    attachment.uploadedAt
                                  ).toLocaleDateString()}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setAttachmentToDelete(attachment)
                          }
                          disabled={isDeletingAttachment}
                          className="shrink-0 rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label={`Delete ${getAttachmentName(attachment)}`}
                          title="Delete attachment"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {attachments.length === 0 && (
                <button
                  type="button"
                  onClick={openAttachmentPicker}
                  disabled={isUploading}
                  className="flex min-h-[170px] w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/70 px-5 py-7 text-center transition hover:border-blue-400 hover:bg-blue-50/40 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    {isUploading ? (
                      <Upload size={23} className="animate-pulse" />
                    ) : (
                      <Paperclip size={23} />
                    )}
                  </div>

                  <p className="text-sm font-semibold text-gray-700">
                    {isUploading
                      ? "Uploading your file..."
                      : "Please upload your file or image"}
                  </p>

                  <p className="mt-1 text-xs text-gray-400">
                    {isUploading
                      ? selectedFile?.name ?? "Please wait..."
                      : "Click here to browse and select a file"}
                  </p>

                  {!isUploading && (
                    <span className="mt-4 inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600">
                      <Upload size={14} />
                      Choose file
                    </span>
                  )}
                </button>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip"
                className="hidden"
                disabled={isUploading}
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (file) {
                    void handleFileUpload(file);
                  }
                }}
              />
            </section>

            {/* Child tasks */}
            <section>
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">
                    Child tasks
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Tasks under {currentParent?.title ?? task.title}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setChildParentSelection({ taskId, parentId: defaultChildParentId });
                    setShowChildTaskForm((visible) => !visible);
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                  aria-label="Create child task"
                >
                  <Plus size={16} />
                  Add task
                </button>
              </div>

              {showChildTaskForm && (
                <form
                  onSubmit={handleCreateChildTask}
                  className="mb-4 space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4"
                >
                  <input
                    value={childTaskTitle}
                    onChange={(event) => setChildTaskTitle(event.target.value)}
                    placeholder="Child task title"
                    required
                    className={inputClass}
                  />

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="relative">
                      <select
                        value={selectedChildParentId}
                        onChange={(event) => setChildParentSelection({ taskId, parentId: event.target.value })}
                        className={`${inputClass} appearance-none pr-10`}
                        aria-label="Parent task"
                      >
                        {childParentOptions.map((parent) => (
                          <option key={parent._id} value={parent._id}>
                            {parent.taskKey
                              ? `${parent.taskKey} - ${parent.title}`
                              : parent.title}
                          </option>
                        ))}
                      </select>
                      <ChevronDown
                        size={16}
                        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                    </div>

                    <div className="relative">
                      <select
                        value={childTaskType}
                        onChange={(event) =>
                          setChildTaskType(event.target.value as TaskType)
                        }
                        className={`${inputClass} appearance-none pr-10`}
                        aria-label="Child task type"
                      >
                        {childTaskTypes.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                      <ChevronDown
                        size={16}
                        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                    </div>

                    <div className="relative">
                      <select
                        value={childTaskPriority}
                        onChange={(event) =>
                          setChildTaskPriority(event.target.value as TaskPriority)
                        }
                        className={`${inputClass} appearance-none pr-10`}
                        aria-label="Child task priority"
                      >
                        {priorities.map((item) => (
                          <option key={item} value={item}>{item}</option>
                        ))}
                      </select>
                      <ChevronDown
                        size={16}
                        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowChildTaskForm(false)}
                      disabled={isCreatingChild}
                      className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isCreatingChild || !childTaskTitle.trim()}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isCreatingChild ? "Creating..." : "Create task"}
                    </button>
                  </div>
                </form>
              )}

              {isLoadingTasks ? (
                <p className="text-sm text-gray-400">Loading child tasks...</p>
              ) : childTasks.length === 0 ? (
                <p className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">
                  No child tasks yet.
                </p>
              ) : (
                <div className="divide-y rounded-xl border border-gray-200">
                  {childTasks.map((childTask) => (
                    <button
                      key={childTask._id}
                      type="button"
                      onClick={() =>
                        window.dispatchEvent(
                          new CustomEvent("sprintly:open-task", {
                            detail: { taskId: childTask._id },
                          })
                        )
                      }
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-gray-50"
                    >
                      <span className="min-w-0">
                        <span className="mr-2 font-mono text-xs font-medium text-blue-600">
                          {childTask.taskKey ?? "Task"}
                        </span>
                        <span className="text-sm font-medium text-gray-800">
                          {childTask.title}
                        </span>
                      </span>
                      <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600">
                        {childTask.status}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            {/* Activity */}
            <section>
              <div className="mb-4 flex items-center gap-2">
                <MessageSquare size={18} className="text-gray-500" />

                <h3 className="text-base font-semibold text-gray-900">
                  Activity
                </h3>
              </div>

              <div className="w-full space-y-5">
                <div className="w-full rounded-xl border border-gray-200 bg-white p-3">
                  <textarea
                    rows={2}
                    value={commentText}
                    onChange={(event) =>
                      setCommentText(event.target.value)
                    }
                    placeholder="Write a comment..."
                    className="h-16 max-h-28 w-full resize-y border-0 bg-transparent text-sm leading-6 text-gray-800 outline-none placeholder:text-gray-400 focus:ring-0"
                  />

                  <div className="mt-2 flex justify-end border-t border-gray-100 pt-2">
                    <button
                      onClick={() => void handleAddComment()}
                      disabled={
                        isAddingComment || !commentText.trim()
                      }
                      className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      <Send size={15} />
                      {isAddingComment ? "Adding..." : "Add comment"}
                    </button>
                  </div>
                </div>

                {isLoadingComments ? (
                  <p className="text-sm text-gray-400">
                    Loading comments...
                  </p>
                ) : isCommentsError ? (
                  <p className="text-sm text-red-500">
                    Unable to load comments.
                  </p>
                
                ) : (
                  <div className="space-y-4">
                    {comments.map((comment) => {
                      const authorName =
                        typeof comment.author === "object"
                          ? comment.author.name
                          : "User";

                      return (
                        <div
                          key={comment._id}
                          className="rounded-xl border border-gray-100 bg-gray-50/70 p-4"
                        >
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-gray-800">
                              {authorName}
                            </p>

                            <p className="text-xs text-gray-400">
                              {new Date(
                                comment.createdAt
                              ).toLocaleString()}
                            </p>
                          </div>

                          <p className="whitespace-pre-wrap break-words text-sm leading-6 text-gray-600">
                            {comment.text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Right section */}
          <aside className="min-w-0 space-y-7 border-t border-gray-200 bg-gray-50/80 px-6 py-7 sm:border-l sm:border-t-0 sm:px-8">
            <h3 className="text-lg font-semibold text-gray-900">
              Details
            </h3>

            <div className="space-y-6">
              {/* Assignee */}
              <div>
                <label className={labelClass}>
                  <UserRound size={15} />
                  Assignee
                </label>

                <div className="relative">
                  <select
                    value={currentAssigneeId}
                    onChange={(event) =>
                      void handleAssigneeChange(event.target.value)
                    }
                    disabled={
                      !organizationCode ||
                      isLoadingMembers ||
                      isMembersError ||
                      isSaving
                    }
                    className={`${inputClass} appearance-none pr-10`}
                  >
                    <option value="">
                      {isLoadingMembers
                        ? "Loading members..."
                        : isMembersError
                          ? "Could not load members"
                          : members.length === 0
                            ? "No members found"
                            : "Unassigned"}
                    </option>

                    {members.map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.name || member.email || "Organization member"}
                        {member.email ? ` (${member.email})` : ""}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>

                {!organizationCode && (
                  <p className="mt-2 text-xs text-gray-400">
                    Select an organization to load its members.
                  </p>
                )}

                {isMembersError && (
                  <button
                    type="button"
                    onClick={() => void refetchMembers()}
                    className="mt-2 text-xs font-medium text-blue-600 hover:underline"
                  >
                    Retry loading members
                  </button>
                )}

                {organizationCode &&
                  !isLoadingMembers &&
                  !isMembersError &&
                  members.length === 0 && (
                    <p className="mt-2 text-xs text-gray-400">
                      No organization members found.
                    </p>
                  )}
              </div>

              {/* Parent */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-600">
                  Parent
                </label>

                <div className="relative">
                  <select
                    value={parentTaskId ?? ""}
                    onChange={(event) =>
                      void handleSelectEpic(event.target.value)
                    }
                    disabled={
                      isLoadingTasks ||
                      isSaving ||
                      task.type === "Epic"
                    }
                    className={`${inputClass} appearance-none pr-10`}
                  >
                    <option value="">
                      {isLoadingTasks
                        ? "Loading Epic tasks..."
                        : "No parent"}
                    </option>

                    {availableEpics.map((epic) => (
                      <option key={epic._id} value={epic._id}>
                        {epic.title}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>

                {task.type === "Epic" && (
                  <p className="mt-2 text-xs text-gray-400">
                    An Epic cannot have another Epic as its parent.
                  </p>
                )}

                {!isLoadingTasks &&
                  task.type !== "Epic" &&
                  availableEpics.length === 0 && (
                    <p className="mt-2 text-xs text-gray-400">
                      No Epic tasks available in this project.
                    </p>
                  )}
              </div>

              {/* Sprint */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-600">
                  Sprint
                </label>

                <div className="relative">
                  <select
                    value={
                      typeof task.sprint === "object" && task.sprint
                        ? task.sprint._id
                        : task.sprint ?? ""
                    }
                    onChange={(event) =>
                      void handleSprintChange(event.target.value)
                    }
                    disabled={isLoadingProjectSprints || isUpdatingSprint}
                    className={`${inputClass} appearance-none pr-10`}
                    aria-label="Task sprint"
                  >
                    <option value="">
                      {isLoadingProjectSprints ? "Loading sprints..." : "Backlog"}
                    </option>
                    {(projectSprintsData?.sprints ?? [])
                      .filter((sprint) =>
                        sprint.status !== "Completed" ||
                        (typeof task.sprint === "object" && task.sprint
                          ? task.sprint._id === sprint._id
                          : task.sprint === sprint._id)
                      )
                      .map((sprint) => (
                        <option key={sprint._id} value={sprint._id}>
                          {sprint.title} · {sprint.status}
                        </option>
                      ))}
                  </select>

                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
                {isUpdatingSprint && (
                  <p className="mt-2 text-xs text-gray-400">Updating sprint…</p>
                )}
              </div>

              {/* Priority */}
              <div>
                <label className={labelClass}>
                  <Flag size={15} />
                  Priority
                </label>

                <div className="relative">
                  <select
                    value={task.priority}
                    onChange={(event) =>
                      void updateField({
                        priority: event.target.value as TaskPriority,
                      })
                    }
                    className={`${inputClass} appearance-none pr-10`}
                  >
                    {priorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                </div>
              </div>

              {/* Due date */}
              <div>
                <label className={labelClass}>
                  <CalendarDays size={15} />
                  Due date
                </label>

                <input
                  type="date"
                  value={formattedDueDate}
                  onChange={(event) =>
                    void updateField({
                      dueDate: event.target.value || null,
                    })
                  }
                  className={`${inputClass} pr-4 [&::-webkit-calendar-picker-indicator]:ml-2 [&::-webkit-calendar-picker-indicator]:mr-1 [&::-webkit-calendar-picker-indicator]:cursor-pointer`}
                />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}