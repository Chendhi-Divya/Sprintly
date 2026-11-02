import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Bell,
  UserRound,
  CheckCheck,
  Check,
  X,
  Settings,
  Building2,
  UsersRound,
  FolderKanban,
  ChevronRight,
  ChevronDown,
  UserPen,
  LogOut,
  Mail,
} from "lucide-react";

import { logout, updateUser } from "../store/authSlice";
import type { RootState } from "../store/store";

import {
  useLogoutMutation,
  useUpdateProfileMutation,
  useRequestEmailChangeMutation,
  useVerifyEmailChangeOTPMutation,
} from "../services/authApi";

import {
  useGetProjectsQuery,
  useGetTasksQuery,
  useCreateTaskMutation,
  useGetProjectMembersQuery,
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
} from "../services/taskApi";

import type {
  Task,
  TaskType,
  TaskPriority,
  SprintlyNotification,
} from "../services/taskApi";

type NavbarProps = {
  selectedProjectId?: string;
};

function getProjectId(task: Task): string {
  if (typeof task.project === "string") {
    return task.project;
  }

  return task.project?._id ?? "";
}

function getErrorMessage(error: unknown): string {
  if (typeof error === "object" && error !== null) {
    const apiError = error as {
      data?: { message?: string; error?: string };
      error?: string;
    };

    return (
      apiError.data?.message ||
      apiError.data?.error ||
      apiError.error ||
      "Something went wrong. Please try again."
    );
  }

  return "Something went wrong. Please try again.";
}

function formatNotificationDate(date: string): string {
  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function Navbar({
  selectedProjectId = "",
}: NavbarProps) {
  const [searchText, setSearchText] = useState("");

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TaskType>("Task");
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [assignee, setAssignee] = useState("");
  const [parentTask, setParentTask] = useState("");
  const [dueDate, setDueDate] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [notificationError, setNotificationError] = useState("");

  const [profileName, setProfileName] = useState("");
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  // Email change states.
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailOTP, setEmailOTP] = useState("");
  const [isOTPSent, setIsOTPSent] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [emailSuccess, setEmailSuccess] = useState("");

  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const user = useSelector((state: RootState) => state.auth.user);

  const selectedOrganization = useSelector(
    (state: RootState) => state.auth.selectedOrganization
  );

  const organizationId = selectedOrganization?._id || "";
  const organizationName = selectedOrganization?.org_name ?? "";

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [logoutRequest, { isLoading: isLoggingOut }] =
    useLogoutMutation();

  const [
    updateProfile,
    { isLoading: isUpdatingProfile },
  ] = useUpdateProfileMutation();

  const [
    requestEmailChange,
    { isLoading: isSendingEmailOTP },
  ] = useRequestEmailChangeMutation();

  const [
    verifyEmailChangeOTP,
    { isLoading: isVerifyingEmailOTP },
  ] = useVerifyEmailChangeOTPMutation();

  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    isError: isProjectsError,
  } = useGetProjectsQuery(organizationId, {
    skip: !organizationId,
  });

  const {
    data: tasksData,
    isLoading: isLoadingTasks,
    isFetching: isFetchingTasks,
    isError: isTasksError,
    refetch: refetchTasks,
  } = useGetTasksQuery();

  const [createTask, { isLoading: isCreating }] =
    useCreateTaskMutation();

  const {
    data: notificationsData,
    isLoading: isLoadingNotifications,
    isError: isNotificationsError,
    refetch: refetchNotifications,
  } = useGetNotificationsQuery(organizationId, {
    skip: !organizationId,
    pollingInterval: 30000,
    refetchOnMountOrArgChange: true,
  });

  const [
    markNotificationAsRead,
    { isLoading: isMarkingNotificationRead },
  ] = useMarkNotificationAsReadMutation();

  const projects = projectsData?.projects ?? [];
  const tasks = tasksData?.tasks ?? [];

  const selectedProject =
    projects.find((project) => project._id === selectedProjectId) ??
    projects[0];

  const projectId = selectedProject?._id ?? "";

  const {
    data: membersData,
    isLoading: isLoadingMembers,
    isError: isMembersError,
    refetch: refetchMembers,
  } = useGetProjectMembersQuery(projectId, {
    skip: !projectId,
  });

  const projectMembers = membersData?.members ?? [];

  const parentTasks = tasks.filter(
    (task) =>
      task._id &&
      task.title &&
      getProjectId(task) === projectId
  );

  const notifications: SprintlyNotification[] =
    notificationsData?.notifications ?? [];

  const unreadCount = notificationsData?.unreadCount ?? 0;

  // Close dropdowns when clicking outside.
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target;

      if (!(target instanceof Node)) return;

      if (
        profileRef.current &&
        !profileRef.current.contains(target)
      ) {
        setShowProfileMenu(false);
      }

      if (
        notificationsRef.current &&
        !notificationsRef.current.contains(target)
      ) {
        setShowNotifications(false);
      }

      if (
        settingsRef.current &&
        !settingsRef.current.contains(target)
      ) {
        setShowSettingsMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  // Listen for Create Task button from ProjectHeader.
  useEffect(() => {
    function handleOpenCreateTask() {
      setTitle("");
      setDescription("");
      setType("Task");
      setPriority("Medium");
      setAssignee("");
      setParentTask("");
      setDueDate("");
      setErrorMessage("");

      setShowCreateForm(true);
      setShowProfileMenu(false);
      setShowNotifications(false);
      setShowSettingsMenu(false);
    }

    window.addEventListener(
      "sprintly:open-create-task",
      handleOpenCreateTask
    );

    return () => {
      window.removeEventListener(
        "sprintly:open-create-task",
        handleOpenCreateTask
      );
    };
  }, []);

  useEffect(() => {
    setParentTask("");
    setAssignee("");
  }, [projectId]);

  // Reset task form.
  function resetForm() {
    setTitle("");
    setDescription("");
    setType("Task");
    setPriority("Medium");
    setAssignee("");
    setParentTask("");
    setDueDate("");
    setErrorMessage("");
  }

  // Logout.
  async function handleLogout() {
    try {
      await logoutRequest().unwrap();
    } catch {
      // Clear the local session even if the server is unavailable.
    } finally {
      dispatch(logout());

      setShowProfileMenu(false);
      setShowNotifications(false);
      setShowSettingsMenu(false);
      setShowEditProfile(false);

      navigate("/login", { replace: true });
    }
  }

  // Switch organization without logging out.
  function handleSwitchOrganization() {
    setShowProfileMenu(false);
    setShowNotifications(false);
    setShowSettingsMenu(false);

    navigate("/organizations");
  }

  function handleClose() {
    if (isCreating) return;

    setShowCreateForm(false);
    setErrorMessage("");
  }

  // Open Edit Profile modal.
  function handleOpenEditProfile() {
    setProfileName(user?.name ?? "");
    setProfileError("");
    setProfileSuccess("");

    setIsEditingEmail(false);
    setNewEmail("");
    setEmailOTP("");
    setIsOTPSent(false);
    setEmailError("");
    setEmailSuccess("");

    setShowProfileMenu(false);
    setShowEditProfile(true);
  }

  // Close Edit Profile modal.
  function handleCloseEditProfile() {
    if (
      isUpdatingProfile ||
      isSendingEmailOTP ||
      isVerifyingEmailOTP
    ) {
      return;
    }

    setShowEditProfile(false);
    setProfileError("");
    setProfileSuccess("");
    setIsEditingEmail(false);
    setNewEmail("");
    setEmailOTP("");
    setIsOTPSent(false);
    setEmailError("");
    setEmailSuccess("");
  }

  // Save updated name.
  async function handleProfileUpdate(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setProfileError("");
    setProfileSuccess("");

    const trimmedName = profileName.trim();

    if (!trimmedName) {
      setProfileError("Name is required.");
      return;
    }

    if (trimmedName.length < 2) {
      setProfileError("Name must contain at least 2 characters.");
      return;
    }

    if (trimmedName === user?.name) {
      setProfileError("No changes were made.");
      return;
    }

    try {
      const response = await updateProfile({
        name: trimmedName,
      }).unwrap();

      dispatch(
        updateUser({
          name: response.user.name,
        })
      );

      setProfileName(response.user.name);
      setProfileSuccess("Your name has been updated successfully.");
    } catch (error: unknown) {
      console.error("Profile update error:", error);
      setProfileError(getErrorMessage(error));
    }
  }

  // Start editing email.
  function handleStartEmailEdit() {
    setIsEditingEmail(true);
    setNewEmail("");
    setEmailOTP("");
    setIsOTPSent(false);
    setEmailError("");
    setEmailSuccess("");
  }

  // Cancel email editing.
  function handleCancelEmailEdit() {
    if (isSendingEmailOTP || isVerifyingEmailOTP) return;

    setIsEditingEmail(false);
    setNewEmail("");
    setEmailOTP("");
    setIsOTPSent(false);
    setEmailError("");
    setEmailSuccess("");
  }

  // Send OTP to the new email.
  async function handleSendEmailOTP() {
    setEmailError("");
    setEmailSuccess("");

    const trimmedEmail = newEmail.trim().toLowerCase();

    if (!trimmedEmail) {
      setEmailError("Please enter your new email address.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(trimmedEmail)) {
      setEmailError("Please enter a valid email address.");
      return;
    }

    if (trimmedEmail === user?.email?.toLowerCase()) {
      setEmailError("This is already your current email address.");
      return;
    }

    try {
      const response = await requestEmailChange({
        email: trimmedEmail,
      }).unwrap();

      setNewEmail(trimmedEmail);
      setIsOTPSent(true);
      setEmailOTP("");
      setEmailError("");
      setEmailSuccess(response.message);
    } catch (error: unknown) {
      console.error("Send email OTP error:", error);

      const message = getErrorMessage(error).toLowerCase();

      if (
        message.includes("already registered") ||
        message.includes("already exists")
      ) {
        // Keep the user on the new email entry screen and show the error inline.
        setIsOTPSent(false);
        setEmailOTP("");
        setEmailError("User already exists");
        setEmailSuccess("");

        return;
      }

      // Show other errors normally.
      setEmailError(getErrorMessage(error));
    }
  }

  // Verify OTP and update email.
  async function handleVerifyEmailOTP(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setEmailError("");
    setEmailSuccess("");

    const trimmedEmail = newEmail.trim().toLowerCase();
    const trimmedOTP = emailOTP.trim();

    if (!trimmedEmail) {
      setEmailError("Please enter your new email address.");
      return;
    }

    if (!/^\d{6}$/.test(trimmedOTP)) {
      setEmailError("Please enter a valid 6-digit OTP.");
      return;
    }

    try {
      const response = await verifyEmailChangeOTP({
        email: trimmedEmail,
        otp: trimmedOTP,
      }).unwrap();

      dispatch(
        updateUser({
          email: response.user.email,
        })
      );

      setEmailSuccess("Email address updated successfully.");

      setIsEditingEmail(false);
      setIsOTPSent(false);
      setNewEmail("");
      setEmailOTP("");
    } catch (error: unknown) {
      console.error("Verify email OTP error:", error);
      setEmailError(getErrorMessage(error));
    }
  }

  // Create task.
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
      setErrorMessage(
        "Could not load projects. Please try again."
      );
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

    if (
      assignee &&
      !projectMembers.some((member) => member._id === assignee)
    ) {
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
        ...(dueDate ? { dueDate } : {}),
      }).unwrap();

      resetForm();
      setShowCreateForm(false);

      void refetchTasks();
      void refetchNotifications();
    } catch (error: unknown) {
      console.error("Failed to create task:", error);
      setErrorMessage(getErrorMessage(error));
    }
  }

  // Mark notification as read.
  async function handleMarkAsRead(
    notification: SprintlyNotification
  ) {
    if (notification.isRead) return;

    setNotificationError("");

    try {
      await markNotificationAsRead({
        id: notification._id,
        organizationId,
      }).unwrap();
    } catch (error: unknown) {
      console.error(
        "Failed to mark notification as read:",
        error
      );
      setNotificationError(getErrorMessage(error));
    }
  }

  function handleNotificationToggle() {
    const willOpen = !showNotifications;

    setShowNotifications(willOpen);
    setShowProfileMenu(false);
    setShowSettingsMenu(false);
    setNotificationError("");

    if (willOpen) {
      void refetchNotifications();
    }
  }

  function handleSettingsToggle() {
    setShowSettingsMenu((open) => !open);
    setShowProfileMenu(false);
    setShowNotifications(false);
  }

  function openOrganizationSettings(
    section: "General" | "Members"
  ) {
    setShowSettingsMenu(false);
    setShowProfileMenu(false);

    navigate("/settings/organization", {
      state: { section },
    });
  }

  function openProjectSettings() {
    setShowSettingsMenu(false);
    setShowProfileMenu(false);

    if (selectedProject?._id) {
      navigate(`/projects/${selectedProject._id}/settings`);
      return;
    }

    navigate("/settings/organization", {
      state: { section: "General" },
    });
  }

  const cannotCreate =
    isCreating ||
    isLoadingProjects ||
    isProjectsError ||
    !projectId ||
    !selectedProject;

  let parentTaskPlaceholder = "Select a parent task";

  if (!projectId) {
    parentTaskPlaceholder = "Select a project first";
  } else if (isLoadingTasks || isFetchingTasks) {
    parentTaskPlaceholder = "Loading tasks...";
  } else if (isTasksError) {
    parentTaskPlaceholder = "Could not load tasks";
  } else if (parentTasks.length === 0) {
    parentTaskPlaceholder = "No existing tasks in this project";
  }

  const settingsItems = [
    {
      label: "General settings",
      description: "Edit the organization name",
      icon: Building2,
      onClick: () => openOrganizationSettings("General"),
    },
    {
      label: "Members and invitations",
      description:
        "Invite people and manage organization members",
      icon: UsersRound,
      onClick: () => openOrganizationSettings("Members"),
    },
    {
      label: "Project settings",
      description:
        "Edit project name, issue key, access, and workflow",
      icon: FolderKanban,
      onClick: openProjectSettings,
    },
  ];

  return (
    <>
      <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 bg-white px-5 py-3">
        {/* Logo and organization */}
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <div className="rounded-lg bg-blue-600 p-2 text-white">
            <CheckCheck size={21} />
          </div>

          <h1 className="text-xl font-bold text-gray-900">
            Sprintly
          </h1>

          {organizationName && (
            <>
              <span
                aria-hidden="true"
                className="text-gray-300"
              >
                /
              </span>

              <span
                className="max-w-56 truncate text-base font-semibold text-gray-700"
                title={organizationName}
              >
                {organizationName}
              </span>
            </>
          )}
        </div>

        {/* Global task search */}
        <div className="flex items-center gap-2">
          <div className="flex w-56 items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 focus-within:border-blue-500">
            <Search
              size={17}
              className="shrink-0 text-gray-500"
            />

            <input
              type="search"
              placeholder="Search tasks..."
              value={searchText}
              onChange={(event) =>
                setSearchText(event.target.value)
              }
              className="w-full min-w-0 bg-transparent text-sm text-gray-800 outline-none"
              aria-label="Search tasks"
            />
          </div>
        </div>

        {/* Notifications, settings, and profile */}
        <div className="flex shrink-0 items-center gap-4">
          {/* Notifications */}
          <div ref={notificationsRef} className="relative">
            <button
              type="button"
              aria-label="Notifications"
              aria-expanded={showNotifications}
              onClick={handleNotificationToggle}
              className="relative rounded-lg p-1.5 text-gray-600 hover:bg-gray-100 hover:text-blue-600"
            >
              <Bell size={21} />

              {unreadCount > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 top-full z-50 mt-3 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl">
                <div className="flex items-start justify-between border-b border-gray-100 px-4 py-3">
                  <div>
                    <h2 className="text-sm font-semibold text-gray-900">
                      Notifications
                    </h2>

                    <p className="mt-0.5 text-xs text-gray-500">
                      {unreadCount} unread
                    </p>
                  </div>

                  <button
                    type="button"
                    aria-label="Close notifications"
                    onClick={() => setShowNotifications(false)}
                    className="-mr-1 -mt-1 rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                  >
                    <X size={18} />
                  </button>
                </div>

                {notificationError && (
                  <p
                    role="alert"
                    className="border-b border-red-100 bg-red-50 px-4 py-2 text-xs text-red-700"
                  >
                    {notificationError}
                  </p>
                )}

                {isLoadingNotifications ? (
                  <p className="p-6 text-center text-sm text-gray-500">
                    Loading notifications...
                  </p>
                ) : isNotificationsError ? (
                  <div className="p-5 text-center">
                    <p className="text-sm text-red-600">
                      Could not load notifications.
                    </p>

                    <button
                      type="button"
                      onClick={() => void refetchNotifications()}
                      className="mt-2 text-sm font-medium text-blue-600 hover:underline"
                    >
                      Try again
                    </button>
                  </div>
                ) : notifications.length === 0 ? (
                  <div className="p-7 text-center">
                    <Bell
                      size={25}
                      className="mx-auto mb-2 text-gray-300"
                    />

                    <p className="text-sm font-medium text-gray-700">
                      You're all caught up
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      New task notifications will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification._id}
                        className={`border-b border-gray-100 px-4 py-3 last:border-b-0 ${
                          notification.isRead
                            ? "bg-white"
                            : "bg-blue-50/60"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              notification.isRead
                                ? "bg-gray-300"
                                : "bg-blue-600"
                            }`}
                          />

                          <div className="min-w-0 flex-1">
                            <p className="text-sm leading-5 text-gray-800">
                              {notification.message}
                            </p>

                            {notification.task?.title && (
                              <p className="mt-1 truncate text-xs text-gray-500">
                                Task: {notification.task.title}
                              </p>
                            )}

                            <p className="mt-1.5 text-xs text-gray-400">
                              {formatNotificationDate(
                                notification.createdAt
                              )}
                            </p>
                          </div>

                          {!notification.isRead && (
                            <button
                              type="button"
                              aria-label="Mark notification as read"
                              disabled={isMarkingNotificationRead}
                              onClick={() =>
                                void handleMarkAsRead(notification)
                              }
                              className="shrink-0 rounded-md p-1.5 text-gray-500 hover:bg-white hover:text-blue-600 disabled:opacity-50"
                            >
                              <Check size={16} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t border-gray-100 px-4 py-2">
                  <button
                    type="button"
                    onClick={() => void refetchNotifications()}
                    className="w-full py-1 text-xs font-medium text-gray-500 hover:text-blue-600"
                  >
                    Refresh notifications
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Settings */}
          <div ref={settingsRef} className="relative">
            <button
              type="button"
              onClick={handleSettingsToggle}
              className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-medium transition ${
                showSettingsMenu
                  ? "bg-gray-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-blue-700"
              }`}
              aria-label="Open settings menu"
              aria-expanded={showSettingsMenu}
            >
              <Settings size={19} />
              <span className="hidden sm:inline">Settings</span>
            </button>

            {showSettingsMenu && (
              <div className="absolute right-0 top-full z-[60] mt-2 max-h-[min(80vh,680px)] w-[min(360px,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
                <div className="border-b border-gray-100 px-4 py-3">
                  <h2 className="text-sm font-semibold text-gray-900">
                    Settings
                  </h2>
                </div>

                <div className="max-h-[min(70vh,580px)] overflow-y-auto p-2">
                  {settingsItems.map((item) => {
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.label}
                        type="button"
                        onClick={item.onClick}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-gray-50"
                      >
                        <Icon
                          size={19}
                          className="shrink-0 text-gray-500"
                        />

                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium text-gray-800">
                            {item.label}
                          </span>

                          <span className="mt-0.5 block text-xs text-gray-500">
                            {item.description}
                          </span>
                        </span>

                        <ChevronRight
                          size={16}
                          className="shrink-0 text-gray-400"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Profile dropdown */}
          <div ref={profileRef} className="relative">
            <button
              type="button"
              aria-label="Open profile menu"
              aria-expanded={showProfileMenu}
              onClick={() => {
                setShowProfileMenu((open) => !open);
                setShowNotifications(false);
                setShowSettingsMenu(false);
              }}
              className="flex items-center gap-2 rounded-full bg-gray-100 py-1.5 pl-2 pr-3 text-sm font-medium text-gray-700 hover:bg-gray-200"
            >
              <UserRound size={20} />

              <span className="max-w-32 truncate">
                {user?.name || "Profile"}
              </span>
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-full z-40 mt-2 w-64 overflow-hidden rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                <div className="flex items-center gap-3 border-b border-gray-100 px-3 py-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                    <UserRound size={21} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {user?.name || "User"}
                    </p>

                    <p className="truncate text-xs text-gray-500">
                      {user?.email || ""}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleOpenEditProfile}
                  className="mt-2 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-100"
                >
                  <UserPen size={18} className="text-gray-500" />
                  <span>Edit profile</span>
                </button>

                <button
                  type="button"
                  onClick={handleSwitchOrganization}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-100"
                >
                  <Building2
                    size={18}
                    className="text-gray-500"
                  />
                  <span>Switch organization</span>
                </button>

                <div className="my-1 border-t border-gray-100" />

                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  disabled={isLoggingOut}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-100 disabled:opacity-50"
                >
                  <LogOut size={18} className="text-gray-500" />
                  <span>
                    {isLoggingOut ? "Logging out..." : "Log out"}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Edit Profile Modal */}
      {showEditProfile && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-gray-950/50 p-4 backdrop-blur-sm"
          onClick={handleCloseEditProfile}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            className="my-auto flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <UserPen size={21} />
                </div>

                <div>
                  <h2
                    id="edit-profile-title"
                    className="text-lg font-semibold text-gray-900"
                  >
                    Edit profile
                  </h2>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Manage your account information.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseEditProfile}
                disabled={
                  isUpdatingProfile ||
                  isSendingEmailOTP ||
                  isVerifyingEmailOTP
                }
                aria-label="Close edit profile"
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            {/* Scrollable content */}
            <div className="space-y-6 overflow-y-auto px-6 py-6">
              {/* Personal information */}
              <section>
                <div className="mb-4">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Personal information
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Update the name displayed on your account.
                  </p>
                </div>

                <form
                  onSubmit={handleProfileUpdate}
                  className="space-y-4"
                >
                  <div>
                    <label
                      htmlFor="profile-name"
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      Full name
                    </label>

                    <input
                      id="profile-name"
                      type="text"
                      value={profileName}
                      onChange={(event) => {
                        setProfileName(event.target.value);
                        setProfileError("");
                        setProfileSuccess("");
                      }}
                      placeholder="Enter your full name"
                      maxLength={60}
                      autoFocus
                      className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 hover:border-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>

                  {profileError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700"
                    >
                      <X size={17} className="mt-0.5 shrink-0" />
                      <p>{profileError}</p>
                    </div>
                  )}

                  {profileSuccess && (
                    <div
                      role="status"
                      className="flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-700"
                    >
                      <Check size={17} className="mt-0.5 shrink-0" />
                      <p>{profileSuccess}</p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={
                        isUpdatingProfile ||
                        !profileName.trim()
                      }
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isUpdatingProfile
                        ? "Saving..."
                        : "Save name"}
                    </button>
                  </div>
                </form>
              </section>

              <div className="border-t border-gray-100" />

              {/* Email address */}
              <section>
                <div className="mb-4">
                  <div className="flex items-center gap-2">
                    <Mail size={18} className="text-gray-500" />
                    <h3 className="text-sm font-semibold text-gray-900">
                      Email address
                    </h3>
                  </div>

                  <p className="mt-1 text-xs text-gray-500">
                    Your email is used for account communication and verification.
                  </p>
                </div>

                {/* Current email */}
                <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-500">
                      Current email address
                    </p>

                    <p className="mt-1 break-all text-sm font-medium text-gray-900">
                      {user?.email || ""}
                    </p>
                  </div>

                  {!isEditingEmail && (
                    <button
                      type="button"
                      onClick={handleStartEmailEdit}
                      className="shrink-0 rounded-lg border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      Edit email
                    </button>
                  )}
                </div>

                {/* Email editing */}
                {isEditingEmail && (
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                    {!isOTPSent ? (
                      <div className="space-y-4">
                        <div>
                          <label
                            htmlFor="new-email"
                            className="mb-2 block text-sm font-medium text-gray-700"
                          >
                            New email address
                          </label>

                          <input
                            id="new-email"
                            type="email"
                            value={newEmail}
                            onChange={(event) => {
                              setNewEmail(event.target.value);
                              setEmailError("");
                              setEmailSuccess("");
                            }}
                            placeholder="name@example.com"
                            autoComplete="email"
                            className={`w-full rounded-xl border bg-white px-4 py-3 text-sm outline-none transition placeholder:text-gray-400 focus:ring-4 focus:ring-blue-500/10 ${
                              emailError === "User already exists"
                                ? "border-red-300 focus:border-red-500"
                                : "border-gray-300 focus:border-blue-500"
                            }`}
                          />
                          {emailError === "User already exists" && (
                            <p role="alert" className="mt-2 text-sm text-red-600">
                              User already exists
                            </p>
                          )}
                        </div>

                        <p className="text-xs leading-5 text-gray-500">
                          We'll send a six-digit verification code to your new email address.
                        </p>

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEmailEdit}
                            disabled={isSendingEmailOTP}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={() => void handleSendEmailOTP()}
                            disabled={
                              isSendingEmailOTP ||
                              !newEmail.trim()
                            }
                            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isSendingEmailOTP
                              ? "Sending..."
                              : "Send OTP"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <form
                        onSubmit={handleVerifyEmailOTP}
                        className="space-y-4"
                      >
                        <div>
                          <p className="text-sm font-medium text-gray-800">
                            Verify your new email
                          </p>
                          <p className="mt-1 text-xs leading-5 text-gray-500">
                            Enter the verification code sent to:
                          </p>
                          <p className="mt-1 break-all text-sm font-semibold text-blue-700">
                            {newEmail.trim().toLowerCase()}
                          </p>
                        </div>

                        <div>
                          <label
                            htmlFor="email-change-otp"
                            className="mb-2 block text-sm font-medium text-gray-700"
                          >
                            Verification code
                          </label>

                          <input
                            id="email-change-otp"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            value={emailOTP}
                            onChange={(event) =>
                              setEmailOTP(
                                event.target.value
                                  .replace(/\D/g, "")
                                  .slice(0, 6)
                              )
                            }
                            placeholder="Enter 6-digit OTP"
                            maxLength={6}
                            className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-center text-lg font-semibold tracking-[0.5em] outline-none transition placeholder:text-sm placeholder:font-normal placeholder:tracking-normal focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                          />
                        </div>

                        <p className="text-xs text-gray-500">
                          The verification code is valid for 10 minutes.
                        </p>

                        <div className="flex flex-wrap justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEmailEdit}
                            disabled={isVerifyingEmailOTP}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                          >
                            Cancel
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setIsOTPSent(false);
                              setEmailOTP("");
                              setEmailError("");
                              setEmailSuccess("");
                            }}
                            disabled={isVerifyingEmailOTP}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
                          >
                            Change email
                          </button>

                          <button
                            type="submit"
                            disabled={
                              isVerifyingEmailOTP ||
                              emailOTP.trim().length !== 6
                            }
                            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isVerifyingEmailOTP
                              ? "Verifying..."
                              : "Verify email"}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                )}

                {/* Show errors outside the new-email field, such as OTP errors. */}
                {emailError && emailError !== "User already exists" && (
                  <div
                    role="alert"
                    className="mt-3 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-700"
                  >
                    <X size={17} className="mt-0.5 shrink-0" />
                    <p>{emailError}</p>
                  </div>
                )}

                {emailSuccess && (
                  <div
                    role="status"
                    className="mt-3 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-3 py-3 text-sm text-green-700"
                  >
                    <Check size={17} className="mt-0.5 shrink-0" />
                    <p>{emailSuccess}</p>
                  </div>
                )}
              </section>
            </div>

            {/* Footer - bottom Close button removed */}
            <div className="border-t border-gray-100 bg-gray-50/80 px-6 py-4">
              <p className="text-xs text-gray-500">
                Your account details are kept up to date.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
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
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
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
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder="Describe the task"
                  rows={2}
                  className="w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Task Type */}
                <div>
                  <label
                    htmlFor="task-type"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Task Type
                  </label>

                  <div className="relative">
                    <select
                      id="task-type"
                      value={type}
                      onChange={(event) =>
                        setType(event.target.value as TaskType)
                      }
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Epic">Epic</option>
                      <option value="Story">Story</option>
                      <option value="Task">Task</option>
                      <option value="Bug">Bug</option>
                    </select>

                    <ChevronDown
                      size={18}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
                    />
                  </div>
                </div>

                {/* Priority */}
                <div>
                  <label
                    htmlFor="task-priority"
                    className="mb-1 block text-sm font-medium text-gray-700"
                  >
                    Priority
                  </label>

                  <div className="relative">
                    <select
                      id="task-priority"
                      value={priority}
                      onChange={(event) =>
                        setPriority(
                          event.target.value as TaskPriority
                        )
                      }
                      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>

                    <ChevronDown
                      size={18}
                      className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
                    />
                  </div>
                </div>
              </div>

              {/* Due Date */}
              <div>
                <label
                  htmlFor="dueDate"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Due Date
                </label>

                <input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(event) =>
                    setDueDate(event.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
                />
              </div>

              {/* Assignee */}
              <div>
                <label
                  htmlFor="task-assignee"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Assignee
                </label>

                <div className="relative">
                  <select
                    id="task-assignee"
                    value={assignee}
                    onChange={(event) =>
                      setAssignee(event.target.value)
                    }
                    disabled={
                      !projectId ||
                      isLoadingMembers ||
                      isMembersError
                    }
                    className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">
                      {!projectId
                        ? "Select a project first"
                        : isLoadingMembers
                          ? "Loading members..."
                          : isMembersError
                            ? "Could not load members"
                            : projectMembers.length === 0
                              ? "No members found"
                              : "Unassigned"}
                    </option>

                    {projectMembers.map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.name} ({member.email})
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={18}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
                  />
                </div>

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

              {/* Parent Task */}
              <div>
                <label
                  htmlFor="parent-task"
                  className="mb-1 block text-sm font-medium text-gray-700"
                >
                  Parent Task
                </label>

                <div className="relative">
                  <select
                    id="parent-task"
                    value={parentTask}
                    onChange={(event) =>
                      setParentTask(event.target.value)
                    }
                    disabled={
                      isLoadingTasks ||
                      isFetchingTasks ||
                      isTasksError ||
                      !projectId
                    }
                    className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">
                      {parentTaskPlaceholder}
                    </option>

                    {parentTasks.map((task) => (
                      <option key={task._id} value={task._id}>
                        {task.title}
                      </option>
                    ))}
                  </select>

                  <ChevronDown
                    size={18}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
                  />
                </div>

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