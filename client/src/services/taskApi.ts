
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import type { RootState } from "../store/store";

// ==========================================
// TASK TYPES
// ==========================================

export type TaskStatus =
  | "To Do"
  | "In Progress"
  | "In Review"
  | "Done";

export type TaskType =
  | "Epic"
  | "Story"
  | "Task"
  | "Bug";

export type TaskPriority =
  | "Low"
  | "Medium"
  | "High";

export interface TaskOrganization {
  _id?: string;
  org_id?: string;
}

export interface TaskUser {
  _id: string;
  name: string;
  email: string;
}

export interface TaskProject {
  _id: string;
  name: string;
  key?: string;
  organization?: string | TaskOrganization;
}

export interface ParentTask {
  _id: string;
  title: string;
  taskKey?: string;
}

export interface TaskAttachment {
  _id: string;
  filename: string;
  originalName?: string;
  url: string;
  mimetype?: string;
  size?: number;
  uploadedAt?: string;
}

export interface Task {
  _id: string;
  taskKey?: string;
  title: string;
  description?: string;

  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;

  dueDate?: string;
  createdAt?: string;
  updatedAt?: string;

  parentTask?: ParentTask | string | null;

  assignee?: TaskUser | string | null;
  reporter?: TaskUser | string | null;

  project?: TaskProject | string | null;

  attachments?: TaskAttachment[];
}

export interface TasksResponse {
  message?: string;
  count?: number;

  pagination?: {
    totalTasks: number;
    currentPage: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };

  tasks: Task[];
}

export interface TaskResponse {
  message?: string;
  task: Task;
}

// ==========================================
// CREATE TASK
// ==========================================

export interface CreateTaskRequest {
  title: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  project: string;
  assignee?: string;
  dueDate?: string;
  parentTask?: string;
}

export interface CreateTaskResponse {
  message: string;
  task: Task;
}

// ==========================================
// UPDATE TASK
// ==========================================

export interface UpdateTaskRequest {
  id: string;

  title?: string;
  description?: string;

  type?: TaskType;
  status?: TaskStatus;
  priority?: TaskPriority;

  assignee?: string | null;
  parentTask?: string | null;
  dueDate?: string | null;
}

export interface UpdateTaskResponse {
  message: string;
  task: Task;
}

// ==========================================
// SUBTASK TYPES
// ==========================================

export interface CreateSubtaskRequest {
  taskId: string;
  title: string;
  description?: string;
  priority?: TaskPriority;
  assignee?: string;
  dueDate?: string;
}

export interface SubtasksResponse {
  message?: string;
  subtasks: Task[];
}

export interface CreateSubtaskResponse {
  message: string;
  subtask: Task;
}

// ==========================================
// COMMENT TYPES
// ==========================================

export interface TaskComment {
  _id: string;
  task: string;
  text: string;

  author: TaskUser | string;

  createdAt: string;
  updatedAt?: string;
}

export interface TaskCommentsResponse {
  message?: string;
  comments: TaskComment[];
}

export interface AddTaskCommentRequest {
  taskId: string;
  text: string;
}

export interface AddTaskCommentResponse {
  message: string;
  comment: TaskComment;
}

// ==========================================
// ATTACHMENT TYPES
// ==========================================

export interface UploadTaskAttachmentRequest {
  taskId: string;
  file: File;
}

export interface UploadTaskAttachmentResponse {
  message: string;
  attachment: TaskAttachment;
}

export interface DeleteTaskAttachmentRequest {
  taskId: string;
  attachmentId: string;
}

// ==========================================
// PROJECT TYPES
// ==========================================

export interface ProjectUser {
  _id: string;
  name?: string;
  email?: string;
}

export interface Project {
  _id: string;
  name: string;
  key?: string;
  description?: string;

  organization?: string | TaskOrganization;

  organizationName?: string;
  owner?: string | ProjectUser | null;

  // Supports both populated and unpopulated members.
  members?: Array<string | ProjectUser>;

  createdAt?: string;
}

export interface ProjectResponse {
  message: string;
  project: Project;
}

export interface ProjectsResponse {
  projects: Project[];
}

export interface CreateProjectRequest {
  name: string;
  key: string;
  description?: string;
  organization: string;
}

export interface CreateProjectResponse {
  message: string;
  project: Project;
}

export interface UpdateProjectRequest {
  id: string;
  name: string;
  key: string;
  description: string;
  ownerId?: string;
}

export interface ProjectMember {
  _id: string;
  name: string;
  email: string;
}

export interface ProjectMembersResponse {
  message: string;
  members: ProjectMember[];
}

export interface ProjectMemberActionRequest {
  id: string;
  userId: string;
}

export interface RemoveProjectMemberRequest {
  id: string;
  memberId: string;
}

export interface ProjectMemberActionResponse {
  message: string;
  project?: Project;
  members?: ProjectMember[];
}

// ==========================================
// ORGANIZATION TYPES
// ==========================================

export type OrganizationRole =
  | "Owner"
  | "Admin"
  | "Member"
  | "Viewer";

export interface OrganizationMembership {
  user: string | ProjectUser;
  role: OrganizationRole;
}

export interface Organization {
  _id: string;
  org_id: string;
  org_name: string;

  admin?: string | ProjectUser | null;

  members?: Array<string | ProjectUser>;

  memberships?: OrganizationMembership[];

  description?: string;
  logoUrl?: string;
  slug?: string;
}

export interface OrganizationResponse {
  message?: string;
  organization: Organization;
}

export interface OrganizationsResponse {
  organizations: Organization[];
}

export interface CreateOrganizationRequest {
  org_name: string;
}

export interface CreateOrganizationResponse {
  message: string;
  organization: Organization;
}

export interface CreateOrganizationWithFirstProjectRequest {
  org_name: string;
  project_name: string;
  project_description: string;
  issue_key: string;
}

export interface CreateOrganizationWithFirstProjectResponse {
  message: string;
  organization: Organization;
  project: Project;
}

// ==========================================
// ORGANIZATION INVITATION TYPES
// ==========================================

export interface OrganizationInvitation {
  _id: string;
  email: string;
  role: OrganizationRole;
  createdAt: string;

  organization?: {
    _id?: string;
    org_id?: string;
    org_name?: string;
  };
}

export interface OrganizationInvitationsResponse {
  invitations: OrganizationInvitation[];
}

export interface UpdateOrganizationRequest {
  orgId: string;
  org_name: string;
}

export interface UpdateOrganizationResponse {
  message: string;
  organization: Organization;
}

export interface CreateOrganizationInvitationRequest {
  orgId: string;
  email: string;
  role: OrganizationRole;
}

export interface CreateOrganizationInvitationResponse {
  message: string;
  invitation: OrganizationInvitation;
  emailSent: boolean;
}

export interface AcceptOrganizationInvitationByTokenRequest {
  token: string;
}

export interface UpdateOrganizationMemberRoleRequest {
  orgId: string;
  memberId: string;
  role: OrganizationRole;
}

export interface RemoveOrganizationMemberRequest {
  orgId: string;
  memberId: string;
}

export interface RevokeOrganizationInvitationRequest {
  orgId: string;
  invitationId: string;
}

// ==========================================
// NOTIFICATION TYPES
// ==========================================

export interface SprintlyNotification {
  _id: string;
  recipient: string;

  type: "task_assigned" | "task_updated";

  message: string;

  task?: {
    _id: string;
    title: string;
  } | null;

  isRead: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NotificationResponse {
  message: string;
  notification?: SprintlyNotification;
  modifiedCount?: number;
}

export interface NotificationsResponse {
  message: string;
  notifications: SprintlyNotification[];
  unreadCount: number;
}

export interface NotificationActionRequest {
  id?: string;
  organizationId: string;
}

// ==========================================
// RTK QUERY API
// ==========================================

export const taskApi = createApi({
  reducerPath: "taskApi",

  baseQuery: fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_URL,
    credentials: "include",

    prepareHeaders: (headers, { getState }) => {
      const reduxToken = (getState() as RootState).auth.token;

      const storedToken =
        typeof window !== "undefined"
          ? localStorage.getItem("token")
          : null;

      const token = reduxToken || storedToken;

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      return headers;
    },
  }),

  tagTypes: [
    "Tasks",
    "Projects",
    "ProjectMembers",
    "Notifications",
    "Organizations",
    "TaskComments",
    "TaskSubtasks",
    "TaskAttachments",
  ],

  endpoints: (builder) => ({
    // ======================================
    // TASK ENDPOINTS
    // ======================================

    getTasks: builder.query<TasksResponse, void>({
      query: () => "/tasks",

      providesTags: (result) =>
        result
          ? [
              ...result.tasks.map((task) => ({
                type: "Tasks" as const,
                id: task._id,
              })),
              { type: "Tasks" as const, id: "LIST" },
            ]
          : [{ type: "Tasks" as const, id: "LIST" }],
    }),

    getTaskById: builder.query<TaskResponse, string>({
      query: (id) => `/tasks/${id}`,

      providesTags: (_result, _error, id) => [
        { type: "Tasks", id },
      ],
    }),

    createTask: builder.mutation<
      CreateTaskResponse,
      CreateTaskRequest
    >({
      query: (newTask) => ({
        url: "/tasks",
        method: "POST",
        body: newTask,
      }),

      invalidatesTags: [
        { type: "Tasks", id: "LIST" },
        "Notifications",
      ],
    }),

    updateTask: builder.mutation<
      UpdateTaskResponse,
      UpdateTaskRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/tasks/${id}`,
        method: "PUT",
        body,
      }),

      invalidatesTags: (_result, _error, arg) => [
        { type: "Tasks", id: arg.id },
        { type: "Tasks", id: "LIST" },
        "Notifications",
      ],
    }),

    // ======================================
    // SUBTASK ENDPOINTS
    // ======================================

    getSubtasks: builder.query<SubtasksResponse, string>({
      query: (taskId) => `/tasks/${taskId}/subtasks`,

      providesTags: (_result, _error, taskId) => [
        { type: "TaskSubtasks", id: taskId },
      ],
    }),

    createSubtask: builder.mutation<
      CreateSubtaskResponse,
      CreateSubtaskRequest
    >({
      query: ({ taskId, ...body }) => ({
        url: `/tasks/${taskId}/subtasks`,
        method: "POST",
        body,
      }),

      invalidatesTags: (_result, _error, arg) => [
        { type: "Tasks", id: "LIST" },
        { type: "TaskSubtasks", id: arg.taskId },
      ],
    }),

    // ======================================
    // COMMENT ENDPOINTS
    // ======================================

    getTaskComments: builder.query<
      TaskCommentsResponse,
      string
    >({
      query: (taskId) => `/tasks/${taskId}/comments`,

      providesTags: (_result, _error, taskId) => [
        { type: "TaskComments", id: taskId },
      ],
    }),

    addTaskComment: builder.mutation<
      AddTaskCommentResponse,
      AddTaskCommentRequest
    >({
      query: ({ taskId, text }) => ({
        url: `/tasks/${taskId}/comments`,
        method: "POST",
        body: { text },
      }),

      invalidatesTags: (_result, _error, arg) => [
        { type: "TaskComments", id: arg.taskId },
      ],
    }),

    // ======================================
    // ATTACHMENT ENDPOINTS
    // ======================================

    uploadTaskAttachment: builder.mutation<
      UploadTaskAttachmentResponse,
      UploadTaskAttachmentRequest
    >({
      query: ({ taskId, file }) => {
        const formData = new FormData();
        formData.append("attachment", file);

        return {
          url: `/tasks/${taskId}/attachments`,
          method: "POST",
          body: formData,
        };
      },

      invalidatesTags: (_result, _error, arg) => [
        { type: "Tasks", id: arg.taskId },
        { type: "Tasks", id: "LIST" },
        { type: "TaskAttachments", id: arg.taskId },
      ],
    }),

    deleteTaskAttachment: builder.mutation<
      { message: string },
      DeleteTaskAttachmentRequest
    >({
      query: ({ taskId, attachmentId }) => ({
        url: `/tasks/${taskId}/attachments/${attachmentId}`,
        method: "DELETE",
      }),

      invalidatesTags: (_result, _error, arg) => [
        { type: "Tasks", id: arg.taskId },
        { type: "Tasks", id: "LIST" },
        { type: "TaskAttachments", id: arg.taskId },
      ],
    }),

    // ======================================
    // PROJECT ENDPOINTS
    // ======================================

    getProjects: builder.query<ProjectsResponse, string>({
      query: (organizationId) =>
        `/projects?organizationId=${encodeURIComponent(organizationId)}`,

      providesTags: ["Projects"],
    }),

    getProjectById: builder.query<ProjectResponse, string>({
      query: (projectId) => `/projects/${projectId}`,

      providesTags: (_result, _error, projectId) => [
        { type: "Projects", id: projectId },
      ],
    }),

    createProject: builder.mutation<
      CreateProjectResponse,
      CreateProjectRequest
    >({
      query: (body) => ({
        url: "/projects",
        method: "POST",
        body,
      }),

      invalidatesTags: ["Projects"],
    }),

    updateProject: builder.mutation<
      ProjectResponse,
      UpdateProjectRequest
    >({
      query: ({ id, ...body }) => ({
        url: `/projects/${id}`,
        method: "PUT",
        body,
      }),

      invalidatesTags: (_result, _error, arg) => [
        "Projects",
        { type: "Projects", id: arg.id },
        "Tasks",
        { type: "ProjectMembers", id: arg.id },
      ],
    }),

    deleteProject: builder.mutation<
      { message: string },
      string
    >({
      query: (projectId) => ({
        url: `/projects/${projectId}`,
        method: "DELETE",
      }),

      invalidatesTags: [
        "Projects",
        "Tasks",
        "ProjectMembers",
      ],
    }),

    getProjectMembers: builder.query<
      ProjectMembersResponse,
      string
    >({
      query: (projectId) => `/projects/${projectId}/members`,

      providesTags: (_result, _error, projectId) => [
        { type: "ProjectMembers", id: projectId },
      ],
    }),

    addProjectMember: builder.mutation<
      ProjectMemberActionResponse,
      ProjectMemberActionRequest
    >({
      query: ({ id, userId }) => ({
        url: `/projects/${id}/members`,
        method: "POST",
        body: { userId },
      }),

      invalidatesTags: (_result, _error, arg) => [
        "Projects",
        { type: "Projects", id: arg.id },
        { type: "ProjectMembers", id: arg.id },
      ],
    }),

    removeProjectMember: builder.mutation<
      ProjectMemberActionResponse,
      RemoveProjectMemberRequest
    >({
      query: ({ id, memberId }) => ({
        url: `/projects/${id}/members/${memberId}`,
        method: "DELETE",
      }),

      invalidatesTags: (_result, _error, arg) => [
        "Projects",
        { type: "Projects", id: arg.id },
        { type: "ProjectMembers", id: arg.id },
        "Tasks",
      ],
    }),

    // ======================================
    // ORGANIZATION ENDPOINTS
    // ======================================

    getOrganizations: builder.query<
      OrganizationsResponse,
      void
    >({
      query: () => "/organizations",

      providesTags: ["Organizations"],
    }),

    getOrganizationById: builder.query<
      OrganizationResponse,
      string
    >({
      query: (orgId) => `/organizations/${orgId}`,

      providesTags: ["Organizations"],
    }),

    createOrganization: builder.mutation<
      CreateOrganizationResponse,
      CreateOrganizationRequest
    >({
      query: (body) => ({
        url: "/organizations",
        method: "POST",
        body,
      }),

      invalidatesTags: ["Organizations"],
    }),

    createOrganizationWithFirstProject: builder.mutation<
      CreateOrganizationWithFirstProjectResponse,
      CreateOrganizationWithFirstProjectRequest
    >({
      query: (body) => ({
        url: "/organizations/setup",
        method: "POST",
        body,
      }),

      invalidatesTags: [
        "Organizations",
        "Projects",
      ],
    }),

    updateOrganization: builder.mutation<
      UpdateOrganizationResponse,
      UpdateOrganizationRequest
    >({
      query: ({ orgId, ...body }) => ({
        url: `/organizations/${orgId}`,
        method: "PATCH",
        body,
      }),

      invalidatesTags: ["Organizations"],
    }),

    // ======================================
    // ORGANIZATION INVITATIONS
    // ======================================

    getMyOrganizationInvitations: builder.query<
      OrganizationInvitationsResponse,
      void
    >({
      query: () => "/organizations/invitations",

      providesTags: ["Organizations"],
    }),

    getOrganizationInvitations: builder.query<
      OrganizationInvitationsResponse,
      string
    >({
      query: (orgId) =>
        `/organizations/${orgId}/invitations`,

      providesTags: ["Organizations"],
    }),

    createOrganizationInvitation: builder.mutation<
      CreateOrganizationInvitationResponse,
      CreateOrganizationInvitationRequest
    >({
      query: ({ orgId, ...body }) => ({
        url: `/organizations/${orgId}/invitations`,
        method: "POST",
        body,
      }),

      invalidatesTags: ["Organizations"],
    }),

    acceptOrganizationInvitation: builder.mutation<
      UpdateOrganizationResponse,
      string
    >({
      query: (invitationId) => ({
        url: `/organizations/invitations/${invitationId}/accept`,
        method: "PATCH",
      }),

      invalidatesTags: [
        "Organizations",
        "Projects",
      ],
    }),

    acceptOrganizationInvitationByToken: builder.mutation<
      OrganizationResponse,
      AcceptOrganizationInvitationByTokenRequest
    >({
      query: (body) => ({
        url: "/organizations/invitations/accept-token",
        method: "POST",
        body,
      }),

      invalidatesTags: [
        "Organizations",
        "Projects",
      ],
    }),

    revokeOrganizationInvitation: builder.mutation<
      { message: string },
      RevokeOrganizationInvitationRequest
    >({
      query: ({ orgId, invitationId }) => ({
        url: `/organizations/${orgId}/invitations/${invitationId}`,
        method: "DELETE",
      }),

      invalidatesTags: ["Organizations"],
    }),

    // ======================================
    // ORGANIZATION MEMBERS
    // ======================================

    updateOrganizationMemberRole: builder.mutation<
      UpdateOrganizationResponse,
      UpdateOrganizationMemberRoleRequest
    >({
      query: ({ orgId, memberId, role }) => ({
        url: `/organizations/${orgId}/members/${memberId}`,
        method: "PATCH",
        body: { role },
      }),

      invalidatesTags: ["Organizations"],
    }),

    removeOrganizationMember: builder.mutation<
      UpdateOrganizationResponse,
      RemoveOrganizationMemberRequest
    >({
      query: ({ orgId, memberId }) => ({
        url: `/organizations/${orgId}/members/${memberId}`,
        method: "DELETE",
      }),

      invalidatesTags: [
        "Organizations",
        "Projects",
        "ProjectMembers",
      ],
    }),

    // ======================================
    // NOTIFICATION ENDPOINTS
    // ======================================

    getNotifications: builder.query<
      NotificationsResponse,
      string
    >({
      query: (organizationId) =>
        `/notifications?organizationId=${encodeURIComponent(organizationId)}`,

      providesTags: ["Notifications"],
    }),

    markNotificationAsRead: builder.mutation<
      NotificationResponse,
      NotificationActionRequest
    >({
      query: ({ id, organizationId }) => ({
        url: `/notifications/${id}/read?organizationId=${encodeURIComponent(organizationId)}`,
        method: "PATCH",
      }),

      invalidatesTags: ["Notifications"],
    }),

    markAllNotificationsAsRead: builder.mutation<
      NotificationResponse,
      string
    >({
      query: (organizationId) => ({
        url:
          "/notifications/read-all?organizationId=" +
          encodeURIComponent(organizationId),
        method: "PATCH",
      }),

      invalidatesTags: ["Notifications"],
    }),
  }),
});

// ==========================================
// GENERATED HOOKS
// ==========================================

export const {
  // Tasks
  useGetTasksQuery,
  useGetTaskByIdQuery,
  useUpdateTaskMutation,
  useCreateTaskMutation,

  // Subtasks
  useGetSubtasksQuery,
  useCreateSubtaskMutation,

  // Comments
  useGetTaskCommentsQuery,
  useAddTaskCommentMutation,

  // Attachments
  useUploadTaskAttachmentMutation,
  useDeleteTaskAttachmentMutation,

  // Projects
  useGetProjectsQuery,
  useGetProjectByIdQuery,
  useCreateProjectMutation,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
  useGetProjectMembersQuery,
  useAddProjectMemberMutation,
  useRemoveProjectMemberMutation,

  // Organizations
  useGetOrganizationsQuery,
  useLazyGetOrganizationsQuery,
  useLazyGetProjectsQuery,
  useGetOrganizationByIdQuery,
  useCreateOrganizationMutation,
  useCreateOrganizationWithFirstProjectMutation,
  useUpdateOrganizationMutation,

  // Organization invitations
  useGetMyOrganizationInvitationsQuery,
  useGetOrganizationInvitationsQuery,
  useCreateOrganizationInvitationMutation,
  useAcceptOrganizationInvitationMutation,
  useAcceptOrganizationInvitationByTokenMutation,
  useRevokeOrganizationInvitationMutation,

  // Organization members
  useUpdateOrganizationMemberRoleMutation,
  useRemoveOrganizationMemberMutation,

  // Notifications
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
} = taskApi;
