
import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import DatePicker from "../components/DatePicker";
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
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";

import { logout, updateUser } from "../store/authSlice";
import type { RootState } from "../store/store";

import {
  useLogoutMutation,
  useUpdateProfileMutation,
  useRequestEmailChangeMutation,
  useVerifyEmailChangeOTPMutation,
  useChangePasswordMutation,
  useVerifyChangePasswordOTPMutation,
} from "../services/authApi";

import {
  useGetProjectsQuery,
  useCreateTaskMutation,
  useGetOrganizationByIdQuery,
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
} from "../services/taskApi";

import type {
  TaskType,
  TaskPriority,
  SprintlyNotification,
  ProjectUser,
} from "../services/taskApi";

type NavbarProps = {
  selectedProjectId?: string;
};

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

  const [showPasswordOTPModal, setShowPasswordOTPModal] =
    useState(false);

  const [showPasswordOTPSuccessToast, setShowPasswordOTPSuccessToast] =
    useState(false);

  // Password visibility states.
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Create Task states.
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TaskType>("Task");
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [assignee, setAssignee] = useState("");
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

  // Change Password states.
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordOTP, setPasswordOTP] = useState("");
  const [, setIsPasswordOTPSent] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const profileRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);
  const settingsRef = useRef<HTMLDivElement>(null);

  const user = useSelector((state: RootState) => state.auth.user);

  const hasProfileNameChanges =
  profileName.trim() !== (user?.name ?? "");
  const selectedOrganization = useSelector(
    (state: RootState) => state.auth.selectedOrganization
  );

  const organizationId = selectedOrganization?._id || "";
  const organizationCode = selectedOrganization?.org_id ?? "";
  const organizationName = selectedOrganization?.org_name ?? "";

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [logoutRequest, { isLoading: isLoggingOut }] =
    useLogoutMutation();

  const [updateProfile, { isLoading: isUpdatingProfile }] =
    useUpdateProfileMutation();

  const [requestEmailChange, { isLoading: isSendingEmailOTP }] =
    useRequestEmailChangeMutation();

  const [verifyEmailChangeOTP, { isLoading: isVerifyingEmailOTP }] =
    useVerifyEmailChangeOTPMutation();

  const [changePassword, { isLoading: isSendingPasswordOTP }] =
    useChangePasswordMutation();

  const [
    verifyChangePasswordOTP,
    { isLoading: isVerifyingPasswordOTP },
  ] = useVerifyChangePasswordOTPMutation();

  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    isError: isProjectsError,
  } = useGetProjectsQuery(organizationId, {
    skip: !organizationId,
  });

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

  const selectedProject =
    projects.find((project) => project._id === selectedProjectId) ??
    projects[0];

  const projectId = selectedProject?._id ?? "";

  const {
    data: organizationData,
    isLoading: isLoadingMembers,
    isError: isMembersError,
    refetch: refetchMembers,
  } = useGetOrganizationByIdQuery(organizationCode, {
    skip: !organizationCode || !showCreateForm,
  });

  const organizationMembers =
    organizationData?.organization?.members ?? [];

  const projectMembers = organizationMembers.filter(
    (member): member is ProjectUser =>
      typeof member !== "string"
  );

  const notifications: SprintlyNotification[] =
    notificationsData?.notifications ?? [];

  const unreadCount = notificationsData?.unreadCount ?? 0;

  useEffect(() => {
    if (!showPasswordOTPSuccessToast) return;

    const timeout = window.setTimeout(() => {
      setShowPasswordOTPSuccessToast(false);
    }, 4000);

    return () => window.clearTimeout(timeout);
  }, [showPasswordOTPSuccessToast]);

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

  useEffect(() => {
    function handleOpenCreateTask() {
      setTitle("");
      setDescription("");
      setType("Task");
      setPriority("Medium");
      setAssignee("");
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

  function resetForm() {
    setTitle("");
    setDescription("");
    setType("Task");
    setPriority("Medium");
    setAssignee("");
    setDueDate("");
    setErrorMessage("");
  }

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
      setShowPasswordOTPModal(false);
      setShowPasswordOTPSuccessToast(false);

      navigate("/login", { replace: true });
    }
  }

  function handleSwitchOrganization() {
    setShowProfileMenu(false);
    setShowNotifications(false);
    setShowSettingsMenu(false);

    navigate("/organizations", {
      state: { fromSwitchOrganization: true },
    });
  }

  function handleClose() {
    if (isCreating) return;

    setShowCreateForm(false);
    setErrorMessage("");
  }

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

    setCurrentPassword("");
    setNewPassword("");
    setPasswordOTP("");
    setIsPasswordOTPSent(false);
    setPasswordError("");
    setPasswordSuccess("");

    setShowCurrentPassword(false);
    setShowNewPassword(false);

    setShowPasswordOTPModal(false);
    setShowPasswordOTPSuccessToast(false);

    setShowProfileMenu(false);
    setShowEditProfile(true);
  }

  function handleCloseEditProfile() {
    if (
      isUpdatingProfile ||
      isSendingEmailOTP ||
      isVerifyingEmailOTP ||
      isSendingPasswordOTP ||
      isVerifyingPasswordOTP
    ) {
      return;
    }

    setShowEditProfile(false);
    setShowPasswordOTPModal(false);
    setShowPasswordOTPSuccessToast(false);

    setProfileError("");
    setProfileSuccess("");
    setIsEditingEmail(false);
    setNewEmail("");
    setEmailOTP("");
    setIsOTPSent(false);
    setEmailError("");
    setEmailSuccess("");

    setCurrentPassword("");
    setNewPassword("");
    setPasswordOTP("");
    setIsPasswordOTPSent(false);
    setPasswordError("");
    setPasswordSuccess("");

    setShowCurrentPassword(false);
    setShowNewPassword(false);
  }

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

    if (trimmedName === (user?.name ?? "")) {
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

  function handleStartEmailEdit() {
    setIsEditingEmail(true);
    setNewEmail("");
    setEmailOTP("");
    setIsOTPSent(false);
    setEmailError("");
    setEmailSuccess("");
  }

  function handleCancelEmailEdit() {
    if (isSendingEmailOTP || isVerifyingEmailOTP) return;

    setIsEditingEmail(false);
    setNewEmail("");
    setEmailOTP("");
    setIsOTPSent(false);
    setEmailError("");
    setEmailSuccess("");
  }

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
        setIsOTPSent(false);
        setEmailOTP("");
        setEmailError("User already exists");
        setEmailSuccess("");
        return;
      }

      setEmailError(getErrorMessage(error));
    }
  }

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

  function validatePasswordFields(): boolean {
    if (!currentPassword) {
      setPasswordError("Please enter your current password.");
      return false;
    }

    if (!newPassword) {
      setPasswordError("Please enter your new password.");
      return false;
    }

    if (newPassword.length < 8) {
      setPasswordError(
        "New password must contain at least 8 characters."
      );
      return false;
    }

    if (!/[A-Z]/.test(newPassword)) {
      setPasswordError(
        "New password must contain at least one uppercase letter."
      );
      return false;
    }

    if (!/[0-9]/.test(newPassword)) {
      setPasswordError(
        "New password must contain at least one number."
      );
      return false;
    }

    if (!/[^A-Za-z0-9]/.test(newPassword)) {
      setPasswordError(
        "New password must contain at least one special character."
      );
      return false;
    }

    if (currentPassword === newPassword) {
      setPasswordError(
        "Your new password must be different from your current password."
      );
      return false;
    }

    return true;
  }

  async function handleChangePassword(
    event?: FormEvent<HTMLFormElement>
  ) {
    event?.preventDefault();

    setPasswordError("");
    setPasswordSuccess("");
    setShowPasswordOTPSuccessToast(false);

    if (!validatePasswordFields()) return;

    try {
      await changePassword({
        currentPassword,
        newPassword,
      }).unwrap();

      setPasswordOTP("");
      setIsPasswordOTPSent(true);
      setShowPasswordOTPSuccessToast(true);
      setShowPasswordOTPModal(true);
    } catch (error: unknown) {
      console.error("Request password OTP error:", error);
      setPasswordError(getErrorMessage(error));
    }
  }

  async function handleVerifyChangePasswordOTP(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setPasswordError("");
    setPasswordSuccess("");

    const trimmedOTP = passwordOTP.trim();

    if (!/^\d{6}$/.test(trimmedOTP)) {
      setPasswordError("Please enter a valid 6-digit OTP.");
      return;
    }

    try {
      const response = await verifyChangePasswordOTP({
        otp: trimmedOTP,
      }).unwrap();

      setPasswordSuccess(
        response.message || "Password changed successfully."
      );

      setCurrentPassword("");
      setNewPassword("");
      setPasswordOTP("");
      setIsPasswordOTPSent(false);
      setShowPasswordOTPModal(false);
      setShowPasswordOTPSuccessToast(false);
      setShowCurrentPassword(false);
      setShowNewPassword(false);
    } catch (error: unknown) {
      console.error("Verify password OTP error:", error);
      setPasswordError(getErrorMessage(error));
    }
  }

  function handleClosePasswordOTPModal() {
    if (isVerifyingPasswordOTP || isSendingPasswordOTP) return;

    setShowPasswordOTPModal(false);
    setShowPasswordOTPSuccessToast(false);
    setPasswordOTP("");
    setPasswordError("");
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

    if (isLoadingMembers) {
      setErrorMessage("Please wait while organization members load.");
      return;
    }

    if (isMembersError) {
      setErrorMessage(
        "Could not load organization members. Please try again."
      );
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
        ...(dueDate ? { dueDate } : {}),
      }).unwrap();

      resetForm();
      setShowCreateForm(false);

      void refetchNotifications();
    } catch (error: unknown) {
      console.error("Failed to create task:", error);
      setErrorMessage(getErrorMessage(error));
    }
  }

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

  function handleNotificationClick(
    notification: SprintlyNotification
  ) {
    const taskId = notification.task?._id;

    if (!taskId) return;

    setShowNotifications(false);

    if (notification.isRead === false) {
      void handleMarkAsRead(notification);
    }

    if (window.location.pathname === "/dashboard") {
      window.dispatchEvent(
        new CustomEvent("sprintly:open-task", {
          detail: { taskId },
        })
      );
      return;
    }

    navigate("/dashboard", {
      state: {
        selectedProjectId,
        openTaskId: taskId,
      },
    });
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
    !selectedProject ||
    isLoadingMembers ||
    isMembersError;

  const settingsItems = [
    {
      label: "General settings",
      description: "Edit the organization name",
      icon: Building2,
      onClick: () => openOrganizationSettings("General"),
    },
    {
      label: "Members and invitations",
      description: "Invite people and manage organization members",
      icon: UsersRound,
      onClick: () => openOrganizationSettings("Members"),
    },
    {
      label: "Project settings",
      description: "Edit project name, issue key, access, and workflow",
      icon: FolderKanban,
      onClick: openProjectSettings,
    },
  ];

  return (
    <>
      <nav className="flex flex-wrap items-center justify-between gap-4 border-b border-gray-200 bg-white px-5 py-3">
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <div className="rounded-lg bg-blue-600 p-2 text-white">
            <CheckCheck size={21} />
          </div>

          <h1 className="text-xl font-bold text-gray-900">
            Sprintly
          </h1>

          {organizationName && (
            <>
              <span className="text-gray-300">/</span>
              <span
                className="max-w-56 truncate text-base font-semibold text-gray-700"
                title={organizationName}
              >
                {organizationName}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex w-56 items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 focus-within:border-blue-500">
            <Search size={17} className="shrink-0 text-gray-500" />
            <input
              type="search"
              placeholder="Search tasks..."
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              className="w-full min-w-0 bg-transparent text-sm text-gray-800 outline-none"
              aria-label="Search tasks"
            />
          </div>
        </div>

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
                  <div className="max-h-[440px] overflow-y-auto">
                    {notifications.map((notification) => (
                      <div
                        key={notification._id}
                        className={`h-[88px] border-b border-gray-100 px-3 last:border-b-0 ${
                          notification.isRead
                            ? "bg-white"
                            : "bg-blue-50/60"
                        }`}
                      >
                        <div className="flex h-full items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              handleNotificationClick(notification)
                            }
                            disabled={!notification.task?._id}
                            className="flex h-full min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
                          >
                            <span
                              className={`h-2 w-2 shrink-0 rounded-full ${
                                notification.isRead
                                  ? "bg-gray-300"
                                  : "bg-blue-600"
                              }`}
                            />

                            <span className="min-w-0 flex-1">
                              <span className="line-clamp-2 block text-sm leading-5 text-gray-800">
                                {notification.message}
                              </span>

                              {notification.task?.title && (
                                <span className="mt-0.5 block truncate text-xs text-gray-500">
                                  Task: {notification.task.title}
                                </span>
                              )}

                              <span className="mt-0.5 block text-xs text-gray-400">
                                {formatNotificationDate(
                                  notification.createdAt
                                )}
                              </span>
                            </span>
                          </button>

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
                  <span>Account Settings</span>
                </button>

                <button
                  type="button"
                  onClick={handleSwitchOrganization}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-gray-700 transition hover:bg-gray-100"
                >
                  <Building2 size={18} className="text-gray-500" />
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

      {/* Account Settings */}
      {showEditProfile && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-gray-950/50 p-4 backdrop-blur-sm"
          onClick={handleCloseEditProfile}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-profile-title"
            className="my-auto flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-gray-200 bg-gray-50 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-200 bg-white px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <UserPen size={21} />
                </div>
                <div>
                  <h2
                    id="edit-profile-title"
                    className="text-lg font-semibold text-gray-900"
                  >
                    Account Settings
                  </h2>
                  <p className="mt-0.5 text-sm text-gray-500">
                    Manage your profile and security preferences.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCloseEditProfile}
                disabled={
                  isUpdatingProfile ||
                  isSendingEmailOTP ||
                  isVerifyingEmailOTP ||
                  isSendingPasswordOTP ||
                  isVerifyingPasswordOTP
                }
                aria-label="Close account settings"
                className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto p-5 sm:p-6">
              {/* Personal Information */}
              <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-5">
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
                      className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>

                  {profileError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
                    >
                      <X size={17} className="mt-0.5 shrink-0" />
                      <p>{profileError}</p>
                    </div>
                  )}

                  {profileSuccess && (
                    <div
                      role="status"
                      className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700"
                    >
                      <Check size={17} className="mt-0.5 shrink-0" />
                      <p>{profileSuccess}</p>
                    </div>
                  )}

                 {hasProfileNameChanges && (
  <div className="flex justify-end">
    <button
      type="submit"
      disabled={
        isUpdatingProfile ||
        !profileName.trim() ||
        profileName.trim().length < 2
      }
      className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {isUpdatingProfile ? "Saving..." : "Save"}
    </button>
  </div>
)}
                </form>
              </section>

              {/* Email Address */}
              <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-start gap-3">
                  <div className="rounded-lg bg-gray-100 p-2 text-gray-600">
                    <Mail size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Email address
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Manage the email address associated with your account.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col justify-between gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 sm:flex-row sm:items-center">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-500">
                      Current email address
                    </p>
                    <p className="mt-1 break-all text-sm font-semibold text-gray-900">
                      {user?.email || ""}
                    </p>
                  </div>

                  {!isEditingEmail && (
                    <button
                      type="button"
                      onClick={handleStartEmailEdit}
                      className="shrink-0 rounded-lg border border-gray-300 bg-white px-3.5 py-2 text-xs font-semibold text-gray-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
                    >
                      Change email
                    </button>
                  )}
                </div>

                {isEditingEmail && (
                  <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50/40 p-4">
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
                            className={`w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm outline-none transition focus:ring-4 focus:ring-blue-500/10 ${
                              emailError === "User already exists"
                                ? "border-red-300 focus:border-red-500"
                                : "border-gray-300 focus:border-blue-500"
                            }`}
                          />

                          {emailError === "User already exists" && (
                            <p
                              role="alert"
                              className="mt-2 text-sm text-red-600"
                            >
                              User already exists
                            </p>
                          )}
                        </div>

                        <p className="text-xs leading-5 text-gray-500">
                          A six-digit verification code will be sent to your new email address.
                        </p>

                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleCancelEmailEdit}
                            disabled={isSendingEmailOTP}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleSendEmailOTP()}
                            disabled={
                              isSendingEmailOTP || !newEmail.trim()
                            }
                            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isSendingEmailOTP ? "Sending..." : "Send OTP"}
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
                            className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 text-center text-lg font-semibold tracking-[0.5em] outline-none transition placeholder:text-sm placeholder:font-normal placeholder:tracking-normal focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
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
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
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
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                          >
                            Change email
                          </button>
                          <button
                            type="submit"
                            disabled={
                              isVerifyingEmailOTP ||
                              emailOTP.trim().length !== 6
                            }
                            className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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

                {emailError && emailError !== "User already exists" && (
                  <div
                    role="alert"
                    className="mt-3 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
                  >
                    <X size={17} className="mt-0.5 shrink-0" />
                    <p>{emailError}</p>
                  </div>
                )}

                {emailSuccess && (
                  <div
                    role="status"
                    className="mt-3 flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700"
                  >
                    <Check size={17} className="mt-0.5 shrink-0" />
                    <p>{emailSuccess}</p>
                  </div>
                )}
              </section>

              {/* Change Password */}
              <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-start gap-3">
                  <div className="rounded-lg bg-gray-100 p-2 text-gray-600">
                    <KeyRound size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Change password
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Update your password securely using email verification.
                    </p>
                  </div>
                </div>

                <form
                  onSubmit={handleChangePassword}
                  className="space-y-4"
                >
                  {/* Current Password with Eye Icon */}
                  <div>
                    <label
                      htmlFor="current-password"
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      Current password
                    </label>

                    <div className="relative">
                      <input
                        id="current-password"
                        type={showCurrentPassword ? "text" : "password"}
                        value={currentPassword}
                        onChange={(event) => {
                          setCurrentPassword(event.target.value);
                          setPasswordError("");
                          setPasswordSuccess("");
                        }}
                        placeholder="Enter current password"
                        autoComplete="current-password"
                        required
                        className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 pr-11 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowCurrentPassword((visible) => !visible)
                        }
                        aria-label={
                          showCurrentPassword
                            ? "Hide current password"
                            : "Show current password"
                        }
                        aria-pressed={showCurrentPassword}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {showCurrentPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* New Password with Eye Icon */}
                  <div>
                    <label
                      htmlFor="new-password"
                      className="mb-2 block text-sm font-medium text-gray-700"
                    >
                      New password
                    </label>

                    <div className="relative">
                      <input
                        id="new-password"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(event) => {
                          setNewPassword(event.target.value);
                          setPasswordError("");
                          setPasswordSuccess("");
                        }}
                        placeholder="Enter new password"
                        autoComplete="new-password"
                        required
                        minLength={8}
                        className="w-full rounded-lg border border-gray-300 bg-white px-3.5 py-2.5 pr-11 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowNewPassword((visible) => !visible)
                        }
                        aria-label={
                          showNewPassword
                            ? "Hide new password"
                            : "Show new password"
                        }
                        aria-pressed={showNewPassword}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {showNewPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>

                    <p className="mt-2 text-xs leading-5 text-gray-500">
                      Use at least 8 characters, including an uppercase letter, a number, and a special character.
                    </p>
                  </div>

                  {passwordError && (
                    <div
                      role="alert"
                      className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
                    >
                      <X size={17} className="mt-0.5 shrink-0" />
                      <p>{passwordError}</p>
                    </div>
                  )}

                  {passwordSuccess && (
                    <div
                      role="status"
                      className="flex items-start gap-2 rounded-lg border border-green-200 bg-green-50 px-3 py-2.5 text-sm text-green-700"
                    >
                      <Check size={17} className="mt-0.5 shrink-0" />
                      <p>{passwordSuccess}</p>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={
                        isSendingPasswordOTP ||
                        !currentPassword ||
                        !newPassword
                      }
                      className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSendingPasswordOTP
                        ? "Sending OTP..."
                        : "Continue"}
                    </button>
                  </div>
                </form>
              </section>
            </div>

            <div className="border-t border-gray-200 bg-white px-6 py-4" />
          </div>
        </div>
      )}

      {/* Separate Password OTP Popup */}
      {showPasswordOTPModal && (
        <div
          className="fixed inset-0 z-[90] flex items-center justify-center bg-gray-950/60 p-4 backdrop-blur-sm"
          onClick={handleClosePasswordOTPModal}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="password-otp-title"
            className="w-full max-w-md overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <Mail size={20} />
                </div>
                <div>
                  <h2
                    id="password-otp-title"
                    className="text-base font-semibold text-gray-900"
                  >
                    Verify your email
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Password change verification
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClosePasswordOTPModal}
                disabled={
                  isVerifyingPasswordOTP || isSendingPasswordOTP
                }
                aria-label="Close OTP popup"
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <form
              onSubmit={handleVerifyChangePasswordOTP}
              className="space-y-5 p-6"
            >
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">
                  Verification email sent to
                </p>
                <p className="break-all text-sm font-semibold text-gray-900">
                  {user?.email}
                </p>
              </div>

              <div>
                <label
                  htmlFor="password-change-otp"
                  className="mb-2 block text-sm font-medium text-gray-700"
                >
                  Enter 6-digit OTP
                </label>
                <input
                  id="password-change-otp"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={passwordOTP}
                  onChange={(event) => {
                    setPasswordOTP(
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6)
                    );
                    setPasswordError("");
                  }}
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                  className="w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-center text-2xl font-semibold tracking-[0.6em] outline-none transition placeholder:text-gray-300 placeholder:tracking-[0.6em] focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                />
                <p className="mt-2 text-xs text-gray-500">
                  This verification code is valid for 10 minutes.
                </p>
              </div>

              {passwordError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-700"
                >
                  <X size={17} className="mt-0.5 shrink-0" />
                  <p>{passwordError}</p>
                </div>
              )}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => void handleChangePassword()}
                  disabled={
                    isSendingPasswordOTP || isVerifyingPasswordOTP
                  }
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isSendingPasswordOTP ? "Resending..." : "Resend OTP"}
                </button>

                <button
                  type="submit"
                  disabled={
                    isVerifyingPasswordOTP ||
                    passwordOTP.trim().length !== 6
                  }
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isVerifyingPasswordOTP
                    ? "Verifying..."
                    : "Verify and change password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Temporary Password OTP Success Toast */}
      {showPasswordOTPSuccessToast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-5 top-5 z-[110] w-[min(400px,calc(100vw-2.5rem))] animate-in slide-in-from-top-3 fade-in duration-300"
        >
          <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-white p-4 shadow-xl">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-700">
              <Mail size={20} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-900">
                OTP sent to your registered email
              </p>

              <p className="mt-1 text-sm leading-5 text-gray-600">
                Please check your inbox and enter the six-digit verification code.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowPasswordOTPSuccessToast(false)}
              aria-label="Dismiss notification"
              className="shrink-0 rounded-md p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
            >
              <X size={17} />
            </button>
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
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
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

              <div>
  <label className="mb-1 block text-sm font-medium text-gray-700">
    Due Date
  </label>

  <DatePicker
    value={dueDate}
    onChange={setDueDate}
    placeholder="Select due date"
  />
</div>

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
                      !organizationCode ||
                      isLoadingMembers ||
                      isMembersError
                    }
                    className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 pr-10 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-gray-100"
                  >
                    <option value="">
                      {!organizationCode
                        ? "Select an organization first"
                        : isLoadingMembers
                          ? "Loading organization members..."
                          : isMembersError
                            ? "Could not load members"
                            : projectMembers.length === 0
                              ? "No members found"
                              : "Unassigned"}
                    </option>

                    {projectMembers.map((member) => (
                      <option key={member._id} value={member._id}>
                        {member.name || member.email || "User"}
                        {member.email ? ` (${member.email})` : ""}
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
