import { useEffect, useState } from "react";
import {
  X,
  Pencil,
  CalendarDays,
  UserRound,
  Flag,
  Paperclip,
  MessageSquare,
  History,
  Upload,
  Plus,
  Send,
} from "lucide-react";

import {
  useGetTaskByIdQuery,
  useUpdateTaskMutation,
  useUploadTaskAttachmentMutation,
  useCreateTaskMutation,
  useGetTaskCommentsQuery,
  useAddTaskCommentMutation,
  type TaskPriority,
} from "../services/taskApi";

type TaskDetailsPanelProps = {
  taskId: string;
  onClose: () => void;
};

const priorities: TaskPriority[] = ["Low", "Medium", "High"];

export default function TaskDetailsPanel({
  taskId,
  onClose,
}: TaskDetailsPanelProps) {
  const { data, isLoading, isError } = useGetTaskByIdQuery(taskId);

  const [updateTask, { isLoading: isSaving }] =
    useUpdateTaskMutation();

  const [uploadTaskAttachment, { isLoading: isUploading }] =
    useUploadTaskAttachmentMutation();

  const [createTask, { isLoading: isCreatingEpic }] =
    useCreateTaskMutation();

  const {
    data: commentsData,
    isLoading: isLoadingComments,
    isError: isCommentsError,
  } = useGetTaskCommentsQuery(taskId);

  const [addTaskComment, { isLoading: isAddingComment }] =
    useAddTaskCommentMutation();

  const task = data?.task;
  const comments = commentsData?.comments ?? [];

  const [description, setDescription] = useState("");
  const [isEditingDescription, setIsEditingDescription] =
    useState(false);

  const [activeTab, setActiveTab] = useState<"Comments" | "History">(
    "Comments"
  );

  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [commentText, setCommentText] = useState("");

  const [showEpicInput, setShowEpicInput] = useState(false);
  const [epicTitle, setEpicTitle] = useState("");

  useEffect(() => {
    if (task) {
      setDescription(task.description ?? "");
    }
  }, [task]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  async function saveDescription() {
    if (!task) return;

    try {
      await updateTask({
        id: taskId,
        description,
      }).unwrap();

      setIsEditingDescription(false);
      setMessage("Description updated successfully.");
    } catch {
      setMessage("Failed to update description.");
    }
  }

  async function updateField(values: {
    priority?: TaskPriority;
    dueDate?: string | null;
  }) {
    try {
      await updateTask({
        id: taskId,
        ...values,
      }).unwrap();

      setMessage("Task updated successfully.");
    } catch {
      setMessage("Failed to update task.");
    }
  }

  async function handleCreateEpic() {
    if (!task) return;

    const title = epicTitle.trim();

    if (!title) {
      setMessage("Please enter an Epic name.");
      return;
    }

    const projectId =
      typeof task.project === "object" && task.project
        ? task.project._id
        : task.project;

    if (!projectId) {
      setMessage("This task does not have a project assigned.");
      return;
    }

    try {
      await createTask({
        title,
        description: "",
        type: "Epic",
        priority: "Medium",
        project: projectId,
      }).unwrap();

      setEpicTitle("");
      setShowEpicInput(false);
      setMessage("Epic created successfully.");
    } catch {
      setMessage("Failed to create Epic. Please try again.");
    }
  }

  async function handleAddComment() {
    const text = commentText.trim();

    if (!text) {
      setMessage("Please write a comment first.");
      return;
    }

    try {
      await addTaskComment({
        taskId,
        text,
      }).unwrap();

      setCommentText("");
      setMessage("Comment added successfully.");
    } catch {
      setMessage("Failed to add comment. Please try again.");
    }
  }

  async function handleFileUpload() {
    if (!selectedFile) {
      setMessage("Please select a file first.");
      return;
    }

    try {
      await uploadTaskAttachment({
        taskId,
        file: selectedFile,
      }).unwrap();

      setSelectedFile(null);
      setMessage("Attachment uploaded successfully.");
    } catch {
      setMessage("Attachment upload failed. Please try again.");
    }
  }

  const modalClass =
    "flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl";

  const inputClass =
    "w-full min-w-0 rounded-xl border border-gray-200 bg-white px-4 py-3 pr-10 text-sm text-gray-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50";

  const labelClass =
    "mb-2 flex items-center gap-2 text-sm font-medium text-gray-600";

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className={`${modalClass} h-[300px] items-center justify-center`}>
          <p className="text-sm text-gray-500">
            Loading task details...
          </p>
        </div>
      </div>
    );
  }

  if (isError || !task) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div
          className={`${modalClass} h-[300px] items-center justify-center p-6`}
        >
          <p className="text-sm text-red-600">
            Unable to load task details.
          </p>

          <button
            onClick={onClose}
            className="mt-4 rounded-lg border border-gray-200 px-5 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const assignee =
    typeof task.assignee === "object" && task.assignee
      ? task.assignee.name
      : "Unassigned";

  const parentTask =
    typeof task.parentTask === "object" && task.parentTask
      ? task.parentTask
      : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-6"
      onClick={onClose}
    >
      <div
        className={modalClass}
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-4 border-b border-gray-200 px-6 py-5 sm:px-8">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-gray-400">
              Task details
            </p>

            <p className="mt-1 truncate text-sm font-semibold text-gray-700">
              {task.taskKey ?? "Task"}
            </p>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => {
                setShowEpicInput((previous) => !previous);
                setEpicTitle("");
                setMessage("");
              }}
              className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-100"
            >
              <Plus size={16} />
              Add Epic
            </button>

            <button
              onClick={onClose}
              className="shrink-0 rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900"
              aria-label="Close task details"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Add Epic input */}
        {showEpicInput && (
          <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-gray-200 bg-gray-50 px-6 py-4 sm:px-8">
            <input
              type="text"
              value={epicTitle}
              onChange={(event) => setEpicTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  handleCreateEpic();
                }
              }}
              placeholder="Enter Epic name..."
              className="min-w-[180px] flex-1 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
            />

            <button
              onClick={handleCreateEpic}
              disabled={isCreatingEpic}
              className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isCreatingEpic ? "Creating..." : "Create Epic"}
            </button>

            <button
              onClick={() => {
                setShowEpicInput(false);
                setEpicTitle("");
              }}
              className="rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Message */}
        {message && (
          <div className="flex shrink-0 items-center justify-between border-b border-blue-100 bg-blue-50 px-6 py-3 text-sm text-blue-700">
            <span>{message}</span>

            <button
              onClick={() => setMessage("")}
              className="ml-3 rounded-md p-1 hover:bg-blue-100"
              aria-label="Dismiss message"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {/* Main content */}
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Left section */}
          <div className="min-w-0 space-y-8 p-6 sm:p-8">
            {/* Task name */}
            <section>
              <h2 className="break-words text-2xl font-semibold leading-snug text-gray-900 sm:text-3xl">
                {task.title}
              </h2>
            </section>

            {/* Description */}
            <section>
              <div className="mb-3 flex items-center justify-between gap-3">
                <h3 className="text-base font-semibold text-gray-900">
                  Description
                </h3>

                {!isEditingDescription && (
                  <button
                    onClick={() => setIsEditingDescription(true)}
                    className="flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-gray-500 transition hover:bg-blue-50 hover:text-blue-600"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                )}
              </div>

              {isEditingDescription ? (
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 sm:p-5">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Task description
                  </label>

                  <textarea
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    rows={6}
                    placeholder="Describe the task, its requirements, and expected outcome..."
                    className="w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm leading-6 text-gray-800 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-50"
                  />

                  <div className="mt-4 flex flex-wrap items-center justify-end gap-3">
                    <button
                      onClick={() => {
                        setDescription(task.description ?? "");
                        setIsEditingDescription(false);
                        setMessage("");
                      }}
                      disabled={isSaving}
                      className="rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={saveDescription}
                      disabled={isSaving}
                      className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSaving ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-gray-100 bg-gray-50/70 p-4 sm:p-5">
                  <p className="whitespace-pre-wrap break-words text-sm leading-7 text-gray-600">
                    {task.description ||
                      "No description added yet. Click Edit to add one."}
                  </p>
                </div>
              )}
            </section>

            {/* Attachments */}
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Paperclip size={18} className="text-gray-500" />

                <h3 className="text-base font-semibold text-gray-900">
                  Attachments
                </h3>
              </div>

              <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50/50 p-6 transition hover:border-blue-300 hover:bg-blue-50/20 sm:p-8">
                <label className="flex cursor-pointer flex-col items-center justify-center text-center">
                  <div className="mb-3 rounded-full bg-blue-50 p-3">
                    <Upload size={22} className="text-blue-600" />
                  </div>

                  <span className="text-sm font-semibold text-gray-700">
                    Choose a file or screenshot
                  </span>

                  <span className="mt-2 text-xs text-gray-400">
                    Select a file from your computer
                  </span>

                  <input
                    type="file"
                    className="hidden"
                    onChange={(event) => {
                      setSelectedFile(event.target.files?.[0] ?? null);
                      setMessage("");
                    }}
                  />
                </label>

                {selectedFile && (
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="rounded-lg bg-gray-100 p-2">
                        <Paperclip size={16} className="text-gray-500" />
                      </div>

                      <span className="truncate text-sm font-medium text-gray-700">
                        {selectedFile.name}
                      </span>
                    </div>

                    <button
                      onClick={() => setSelectedFile(null)}
                      className="text-xs font-medium text-red-500 transition hover:text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {selectedFile && (
                  <button
                    onClick={handleFileUpload}
                    disabled={isUploading}
                    className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <Upload size={16} />
                    {isUploading ? "Uploading..." : "Upload attachment"}
                  </button>
                )}
              </div>
            </section>

            {/* Activity */}
            <section>
              <h3 className="mb-4 text-base font-semibold text-gray-900">
                Activity
              </h3>

              <div className="mb-5 flex gap-6 border-b border-gray-200">
                <button
                  onClick={() => setActiveTab("Comments")}
                  className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-sm transition ${
                    activeTab === "Comments"
                      ? "border-blue-600 font-semibold text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <MessageSquare size={15} />
                  Comments
                </button>

                <button
                  onClick={() => setActiveTab("History")}
                  className={`flex items-center gap-2 border-b-2 px-1 pb-3 text-sm transition ${
                    activeTab === "History"
                      ? "border-blue-600 font-semibold text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <History size={15} />
                  History
                </button>
              </div>

              {activeTab === "Comments" ? (
                <div className="space-y-5">
                  {/* Add comment */}
                  <div className="rounded-xl border border-gray-200 bg-white p-3 sm:p-4">
                    <textarea
                      rows={3}
                      value={commentText}
                      onChange={(event) =>
                        setCommentText(event.target.value)
                      }
                      placeholder="Write a comment..."
                      className="w-full resize-y border-0 bg-transparent text-sm leading-6 text-gray-800 outline-none placeholder:text-gray-400 focus:ring-0"
                    />

                    <div className="mt-3 flex justify-end border-t border-gray-100 pt-3">
                      <button
                        onClick={handleAddComment}
                        disabled={isAddingComment || !commentText.trim()}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <Send size={15} />
                        {isAddingComment ? "Adding..." : "Add comment"}
                      </button>
                    </div>
                  </div>

                  {/* Existing comments */}
                  {isLoadingComments ? (
                    <p className="text-sm text-gray-400">
                      Loading comments...
                    </p>
                  ) : isCommentsError ? (
                    <p className="text-sm text-red-500">
                      Unable to load comments.
                    </p>
                  ) : comments.length === 0 ? (
                    <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                      No comments yet. Start the conversation.
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
              ) : (
                <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-500">
                  Task activity history will be implemented separately.
                </p>
              )}
            </section>
          </div>

          {/* Right section */}
          <aside className="min-w-0 space-y-7 border-t border-gray-200 bg-gray-50/80 px-6 py-7 sm:px-8 lg:border-l lg:border-t-0">
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

                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <p className="break-words text-sm font-medium text-gray-700">
                    {assignee}
                  </p>
                </div>
              </div>

              {/* Parent */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-600">
                  Parent
                </label>

                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <p className="break-words text-sm text-gray-700">
                    {parentTask?.title ?? "No parent task"}
                  </p>
                </div>
              </div>

              {/* Sprint */}
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-600">
                  Sprint
                </label>

                <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
                  <p className="text-sm text-gray-400">
                    Sprint functionality not configured yet
                  </p>
                </div>
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
                      updateField({
                        priority: event.target.value as TaskPriority,
                      })
                    }
                    className={`${inputClass} appearance-none`}
                  >
                    {priorities.map((priority) => (
                      <option key={priority} value={priority}>
                        {priority}
                      </option>
                    ))}
                  </select>

                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-gray-400">
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 14 14"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M3 5L7 9L11 5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
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
                  value={
                    task.dueDate
                      ? new Date(task.dueDate).toISOString().slice(0, 10)
                      : ""
                  }
                  onChange={(event) =>
                    updateField({
                      dueDate: event.target.value || null,
                    })
                  }
                  className={inputClass}
                />
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}