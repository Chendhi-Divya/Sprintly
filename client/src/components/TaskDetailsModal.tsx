import { useEffect, useState } from "react";
import {
  X,
  Paperclip,
  Plus,
  Trash2,
  MessageSquare,
  CalendarDays,
  UserRound,
  ChevronDown,
  LoaderCircle,
  Layers,
  Upload,
} from "lucide-react";

import {
  useGetTaskByIdQuery,
  useUpdateTaskMutation,
  useGetProjectMembersQuery,
  useGetTaskCommentsQuery,
  useAddTaskCommentMutation,
  useGetSubtasksQuery,
  useCreateSubtaskMutation,
  useUploadTaskAttachmentMutation,
  useDeleteTaskAttachmentMutation,
  type Task,
  type TaskStatus,
  type TaskPriority,
} from "../services/taskApi";

interface TaskDetailsModalProps {
  task: Task;
  projectId: string;
  allTasks: Task[];
  onClose: () => void;
}

const statuses: TaskStatus[] = [
  "To Do",
  "In Progress",
  "In Review",
  "Done",
];

const priorities: TaskPriority[] = [
  "Low",
  "Medium",
  "High",
];

function getUserId(
  user: Task["assignee"]
) {
  if (typeof user === "string") {
    return user;
  }

  return user?._id ?? "";
}

export default function TaskDetailsModal({
  task,
  projectId,
  allTasks,
  onClose,
}: TaskDetailsModalProps) {
  const { data: taskData, isLoading } =
    useGetTaskByIdQuery(task._id);

  const currentTask = taskData?.task ?? task;

  const [updateTask, { isLoading: isUpdating }] =
    useUpdateTaskMutation();

  const { data: membersData } =
    useGetProjectMembersQuery(projectId);

  const { data: commentsData, isLoading: loadingComments } =
    useGetTaskCommentsQuery(task._id);

  const [addComment, { isLoading: addingComment }] =
    useAddTaskCommentMutation();

  const { data: subtasksData, isLoading: loadingSubtasks } =
    useGetSubtasksQuery(task._id);

  const [createSubtask, { isLoading: addingSubtask }] =
    useCreateSubtaskMutation();

  const [uploadAttachment, { isLoading: uploading }] =
    useUploadTaskAttachmentMutation();

  const [deleteAttachment] =
    useDeleteTaskAttachmentMutation();

  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(
    task.description ?? ""
  );

  const [assignee, setAssignee] = useState(
    getUserId(task.assignee)
  );

  const [parentTask, setParentTask] = useState(
    typeof task.parentTask === "object" && task.parentTask
      ? task.parentTask._id
      : typeof task.parentTask === "string"
        ? task.parentTask
        : ""
  );

  const [priority, setPriority] = useState<TaskPriority>(
    task.priority
  );

  const [dueDate, setDueDate] = useState(
    task.dueDate
      ? new Date(task.dueDate).toISOString().slice(0, 10)
      : ""
  );

  const [commentText, setCommentText] = useState("");
  const [subtaskTitle, setSubtaskTitle] = useState("");
  const [editingDescription, setEditingDescription] =
    useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setTitle(currentTask.title);
    setDescription(currentTask.description ?? "");
    setAssignee(getUserId(currentTask.assignee));

    setParentTask(
      typeof currentTask.parentTask === "object" &&
      currentTask.parentTask
        ? currentTask.parentTask._id
        : typeof currentTask.parentTask === "string"
          ? currentTask.parentTask
          : ""
    );

    setPriority(currentTask.priority);

    setDueDate(
      currentTask.dueDate
        ? new Date(currentTask.dueDate)
            .toISOString()
            .slice(0, 10)
        : ""
    );
  }, [currentTask]);

  async function saveChanges(
    changes: {
      title?: string;
      description?: string;
      status?: TaskStatus;
      priority?: TaskPriority;
      assignee?: string | null;
      parentTask?: string | null;
      dueDate?: string | null;
    }
  ) {
    setError("");
    setMessage("");

    try {
      await updateTask({
        id: task._id,
        ...changes,
      }).unwrap();

      setMessage("Task updated successfully.");

      return true;
    } catch (err: any) {
      setError(
        err?.data?.message ?? "Unable to update task."
      );

      return false;
    }
  }

  async function handleTitleSave() {
    if (!title.trim()) {
      setError("Task name cannot be empty.");
      return;
    }

    const success = await saveChanges({
      title: title.trim(),
    });

    if (success) {
      setMessage("Task name updated.");
    }
  }

  async function handleDescriptionSave() {
    const success = await saveChanges({
      description,
    });

    if (success) {
      setEditingDescription(false);
    }
  }

  async function handleCommentSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!commentText.trim()) return;

    setError("");

    try {
      await addComment({
        taskId: task._id,
        text: commentText.trim(),
      }).unwrap();

      setCommentText("");
    } catch (err: any) {
      setError(
        err?.data?.message ?? "Unable to add comment."
      );
    }
  }

  async function handleSubtaskSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    if (!subtaskTitle.trim()) return;

    setError("");

    try {
      await createSubtask({
        taskId: task._id,
        title: subtaskTitle.trim(),
      }).unwrap();

      setSubtaskTitle("");
    } catch (err: any) {
      setError(
        err?.data?.message ?? "Unable to create subtask."
      );
    }
  }

  async function handleAttachmentUpload(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    setError("");

    try {
      await uploadAttachment({
        taskId: task._id,
        file,
      }).unwrap();
    } catch (err: any) {
      setError(
        err?.data?.message ?? "Unable to upload attachment."
      );
    }

    event.target.value = "";
  }

  async function handleAttachmentDelete(
    attachmentId: string
  ) {
    if (!window.confirm("Delete this attachment?")) return;

    try {
      await deleteAttachment({
        taskId: task._id,
        attachmentId,
      }).unwrap();
    } catch (err: any) {
      setError(
        err?.data?.message ?? "Unable to delete attachment."
      );
    }
  }

  const members = membersData?.members ?? [];
  const comments = commentsData?.comments ?? [];
  const subtasks = subtasksData?.subtasks ?? [];
  const attachments = currentTask.attachments ?? [];

  const parentOptions = allTasks.filter(
    (item) =>
      item._id !== task._id &&
      (item.type === "Epic" ||
        item.type === "Task")
  );

  const reporterName =
    typeof currentTask.reporter === "object" &&
    currentTask.reporter
      ? currentTask.reporter.name
      : "Unknown";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label="Task details"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <Layers size={18} />

            <span>
              {currentTask.type}
            </span>

            <span>/</span>

            <span className="font-medium text-gray-800">
              {currentTask.taskKey ?? "Task"}
            </span>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Close task details"
          >
            <X size={20} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex flex-1 items-center justify-center p-12">
            <LoaderCircle className="animate-spin" />
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_340px]">

            {/* LEFT SIDE */}
            <div className="space-y-7 p-5 sm:p-7">

              {/* Task title */}
              <div>
                <div className="mb-3 text-xs font-medium uppercase text-gray-400">
                  {currentTask.type} name
                </div>

                <input
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  onBlur={() => {
                    if (title.trim() !== currentTask.title) {
                      void handleTitleSave();
                    }
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.currentTarget.blur();
                    }
                  }}
                  className="w-full border-b border-transparent bg-transparent text-2xl font-bold text-gray-900 outline-none hover:border-gray-200 focus:border-indigo-500"
                />
              </div>

              {/* Description */}
              <section>
                <h3 className="mb-3 font-semibold text-gray-800">
                  Description
                </h3>

                {editingDescription ? (
                  <div className="space-y-3">
                    <textarea
                      value={description}
                      onChange={(event) =>
                        setDescription(event.target.value)
                      }
                      rows={5}
                      placeholder="Add a description..."
                      className="w-full rounded-lg border p-3 text-sm outline-none focus:border-indigo-500"
                    />

                    <div className="flex gap-2">
                      <button
                        onClick={handleDescriptionSave}
                        disabled={isUpdating}
                        className="rounded-md bg-indigo-600 px-4 py-2 text-sm text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        Save
                      </button>

                      <button
                        onClick={() => {
                          setDescription(
                            currentTask.description ?? ""
                          );
                          setEditingDescription(false);
                        }}
                        className="rounded-md border px-4 py-2 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() =>
                      setEditingDescription(true)
                    }
                    className="min-h-16 cursor-pointer rounded-lg border border-dashed border-gray-300 p-4 text-sm text-gray-600 hover:border-indigo-400"
                  >
                    {description || "Edit description"}
                  </div>
                )}
              </section>

              {/* Attachments */}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">
                    Attachments
                  </h3>

                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm hover:bg-gray-50">
                    {uploading ? (
                      <LoaderCircle
                        size={16}
                        className="animate-spin"
                      />
                    ) : (
                      <Upload size={16} />
                    )}

                    Add attachment

                    <input
                      type="file"
                      className="hidden"
                      onChange={handleAttachmentUpload}
                      disabled={uploading}
                    />
                  </label>
                </div>

                <div className="space-y-2 rounded-lg border border-dashed p-4">
                  {attachments.length === 0 ? (
                    <p className="text-center text-sm text-gray-400">
                      <Paperclip
                        size={22}
                        className="mx-auto mb-2"
                      />
                      No attachments yet
                    </p>
                  ) : (
                    attachments.map((attachment) => (
                      <div
                        key={attachment._id}
                        className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                      >
                        <a
                          href={attachment.url}
                          target="_blank"
                          rel="noreferrer"
                          className="flex min-w-0 items-center gap-2 truncate text-sm text-indigo-600 hover:underline"
                        >
                          <Paperclip size={16} />
                          {attachment.originalName}
                        </a>

                        <button
                          onClick={() =>
                            handleAttachmentDelete(
                              attachment._id
                            )
                          }
                          className="p-2 text-gray-400 hover:text-red-600"
                          aria-label="Delete attachment"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Subtasks */}
              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-800">
                    Subtasks
                  </h3>

                  <span className="text-xs text-gray-500">
                    {subtasks.length} subtasks
                  </span>
                </div>

                <form
                  onSubmit={handleSubtaskSubmit}
                  className="mb-3 flex gap-2"
                >
                  <input
                    value={subtaskTitle}
                    onChange={(event) =>
                      setSubtaskTitle(event.target.value)
                    }
                    placeholder="Add subtask"
                    className="min-w-0 flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  />

                  <button
                    type="submit"
                    disabled={
                      !subtaskTitle.trim() || addingSubtask
                    }
                    className="rounded-lg bg-indigo-600 px-3 text-white disabled:opacity-50"
                  >
                    <Plus size={18} />
                  </button>
                </form>

                {loadingSubtasks ? (
                  <p className="text-sm text-gray-400">
                    Loading subtasks...
                  </p>
                ) : subtasks.length === 0 ? (
                  <p className="text-sm text-gray-400">
                    No subtasks added.
                  </p>
                ) : (
                  <div className="divide-y rounded-lg border">
                    {subtasks.map((subtask) => (
                      <div
                        key={subtask._id}
                        className="flex items-center justify-between p-3"
                      >
                        <div>
                          <p className="text-sm font-medium">
                            {subtask.title}
                          </p>

                          <p className="text-xs text-gray-400">
                            {subtask.taskKey} · {subtask.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Comments */}
              <section>
                <h3 className="mb-4 flex items-center gap-2 font-semibold text-gray-800">
                  <MessageSquare size={18} />
                  Comments
                </h3>

                <form
                  onSubmit={handleCommentSubmit}
                  className="space-y-2"
                >
                  <textarea
                    value={commentText}
                    onChange={(event) =>
                      setCommentText(event.target.value)
                    }
                    placeholder="Add a comment..."
                    rows={3}
                    className="w-full rounded-lg border p-3 text-sm outline-none focus:border-indigo-500"
                  />

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={
                        !commentText.trim() || addingComment
                      }
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                    >
                      {addingComment
                        ? "Adding..."
                        : "Add comment"}
                    </button>
                  </div>
                </form>

                <div className="mt-5 space-y-4">
                  {loadingComments ? (
                    <p className="text-sm text-gray-400">
                      Loading comments...
                    </p>
                  ) : comments.length === 0 ? (
                    <p className="text-sm text-gray-400">
                      No comments yet.
                    </p>
                  ) : (
                    comments.map((comment) => {
                      const userName =
                        typeof comment.author === "object"
                          ? comment.author.name
                          : "User";

                      return (
                        <div
                          key={comment._id}
                          className="rounded-lg bg-gray-50 p-3"
                        >
                          <div className="mb-2 flex justify-between">
                            <span className="text-sm font-semibold">
                              {userName}
                            </span>

                            <span className="text-xs text-gray-400">
                              {new Date(
                                comment.createdAt
                              ).toLocaleString()}
                            </span>
                          </div>

                          <p className="whitespace-pre-wrap text-sm text-gray-600">
                            {comment.text}
                          </p>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>
            </div>

            {/* RIGHT SIDE */}
            <aside className="space-y-6 border-t bg-gray-50 p-5 sm:p-7 lg:border-l lg:border-t-0">

              {/* Progress */}
              <section>
                <h3 className="mb-3 text-sm font-semibold text-gray-700">
                  Progress
                </h3>

                <div className="relative">
                  <select
                    value={currentTask.status}
                    onChange={(event) =>
                      void saveChanges({
                        status: event.target.value as TaskStatus,
                      })
                    }
                    disabled={isUpdating}
                    className="w-full appearance-none rounded-lg border bg-white px-3 py-3 pr-9 text-sm font-semibold outline-none focus:border-indigo-500"
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={16}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                </div>
              </section>

              {/* Details */}
              <section className="rounded-xl border bg-white p-4">
                <h3 className="mb-5 font-semibold text-gray-800">
                  Details
                </h3>

                <div className="space-y-5">

                  {/* Assignee */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-600">
                      Assignee
                    </label>

                    <select
                      value={assignee}
                      onChange={(event) => {
                        setAssignee(event.target.value);

                        void saveChanges({
                          assignee: event.target.value || null,
                        });
                      }}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    >
                      <option value="">Unassigned</option>

                      {members.map((member) => (
                        <option
                          key={member._id}
                          value={member._id}
                        >
                          {member.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Parent */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-600">
                      Parent
                    </label>

                    <select
                      value={parentTask}
                      onChange={(event) => {
                        setParentTask(event.target.value);

                        void saveChanges({
                          parentTask:
                            event.target.value || null,
                        });
                      }}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    >
                      <option value="">No parent</option>

                      {parentOptions.map((item) => (
                        <option
                          key={item._id}
                          value={item._id}
                        >
                          {item.taskKey
                            ? `${item.taskKey} - ${item.title}`
                            : item.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-600">
                      Priority
                    </label>

                    <select
                      value={priority}
                      onChange={(event) => {
                        const value =
                          event.target.value as TaskPriority;

                        setPriority(value);
                        void saveChanges({ priority: value });
                      }}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    >
                      {priorities.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Due Date */}
                  <div>
                    <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-600">
                      <CalendarDays size={16} />
                      Due date
                    </label>

                    <input
                      type="date"
                      value={dueDate}
                      onChange={(event) =>
                        setDueDate(event.target.value)
                      }
                      onBlur={() => {
                        const existingDate = currentTask.dueDate
                          ? new Date(currentTask.dueDate)
                              .toISOString()
                              .slice(0, 10)
                          : "";

                        if (existingDate !== dueDate) {
                          void saveChanges({
                            dueDate: dueDate || null,
                          });
                        }
                      }}
                      className="w-full rounded-lg border bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Reporter */}
                  <div>
                    <label className="mb-2 block text-sm font-medium text-gray-600">
                      Reporter
                    </label>

                    <div className="flex items-center gap-2 rounded-lg bg-gray-50 p-3">
                      <UserRound size={18} className="text-gray-500" />

                      <span className="text-sm font-medium text-gray-700">
                        {reporterName}
                      </span>
                    </div>
                  </div>
                </div>
              </section>

              {isUpdating && (
                <p className="flex items-center gap-2 text-xs text-indigo-600">
                  <LoaderCircle
                    size={14}
                    className="animate-spin"
                  />
                  Saving changes...
                </p>
              )}

              {message && (
                <p className="text-sm text-green-600">
                  {message}
                </p>
              )}

              {error && (
                <p className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </p>
              )}
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
