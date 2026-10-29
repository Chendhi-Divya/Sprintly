
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

// Task types
export type TaskStatus = "To Do" | "In Progress" | "In Review" | "Done";
export type TaskType = "Epic" | "Story" | "Task" | "Bug";
export type TaskPriority = "Low" | "Medium" | "High";

// User assigned to a task
export interface TaskUser {
  _id: string;
  name: string;
  email: string;
}

// Project information
export interface TaskProject {
  _id: string;
  name: string;
}

// Parent task information
export interface ParentTask {
  _id: string;
  title: string;
  taskKey?: string;
}

// Task information
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
  parentTask?: ParentTask | string | null;
  assignee?: TaskUser | string | null;
  reporter?: TaskUser | string | null;
  project?: TaskProject | string | null;
}

// Task API responses
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

export interface UpdateTaskResponse {
  message: string;
  task: Task;
}

export interface UpdateTaskRequest {
  id: string;
  status: TaskStatus;
}

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

// Project and organization information
export interface Project {
  _id: string;
  name: string;
  key?: string;
  description?: string;
  organization?: string;
  organizationName?: string;
  owner?: string | TaskUser;
  members?: (string | TaskUser)[];
  createdAt?: string;
}

export interface Organization {
  _id: string;
  org_id: string;
  org_name: string;
  description?: string;
  logoUrl?: string;
  slug?: string;
  createdAt?: string;
}

export type OrganizationRole = "Owner" | "Admin" | "Member" | "Viewer";

export interface OrganizationMembership {
  user: string | TaskUser;
  role: OrganizationRole;
}

export interface OrganizationWithMembers extends Organization {
  admin: string | TaskUser;
  members: (string | TaskUser)[];
  memberships: OrganizationMembership[];
}

export interface OrganizationInvitation {
  _id: string;
  email: string;
  role: OrganizationRole;
  createdAt: string;
  organization?: { org_id: string; org_name: string } | null;
}

export interface ProjectsResponse {
  projects: Project[];
}

export interface OrganizationsResponse {
  organizations: Organization[];
}

export interface CreateOrganizationResponse {
  message: string;
  organization: Organization;
}

export interface CreateOrganizationRequest {
  org_name: string;
}

export interface CreateProjectRequest {
  name: string;
  description?: string;
  organization: string;
}

export interface CreateProjectResponse {
  message: string;
  project: Project;
}

export interface OrganizationResponse {
  organization: OrganizationWithMembers;
}

export interface OrganizationInvitationsResponse {
  invitations: OrganizationInvitation[];
}

// Project members
export interface ProjectMember {
  _id: string;
  name: string;
  email: string;
}

export interface ProjectMembersResponse {
  message: string;
  members: ProjectMember[];
}

// Notification information
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

export interface NotificationsResponse {
  message: string;
  notifications: SprintlyNotification[];
  unreadCount: number;
}

export interface NotificationResponse {
  message: string;
  notification?: SprintlyNotification;
  modifiedCount?: number;
}

export interface NotificationActionRequest {
  id?: string;
  organizationId: string;
}

export const taskApi = createApi({
  reducerPath: "taskApi",

  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:5000/api",
    credentials: "include",
  }),

  tagTypes: [
    "Tasks",
    "Projects",
    "Notifications",
    "Organizations",
    "OrganizationInvitations",
    "ProjectMembers",
  ],

  endpoints: (builder) => ({
    // Tasks
    getTasks: builder.query<TasksResponse, void>({
      query: () => "/tasks",
      providesTags: ["Tasks"],
    }),

    updateTask: builder.mutation<
      UpdateTaskResponse,
      UpdateTaskRequest
    >({
      query: ({ id, status }) => ({
        url: `/tasks/${id}`,
        method: "PUT",
        body: { status },
      }),
      invalidatesTags: ["Tasks"],
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
      invalidatesTags: ["Tasks", "Notifications"],
    }),

    // Projects
    getProjects: builder.query<ProjectsResponse, string>({
      query: (organizationId) =>
        `/projects?organizationId=${encodeURIComponent(organizationId)}`,
      providesTags: ["Projects"],
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

    getProjectById: builder.query<{ project: Project }, string>({
      query: (projectId) => `/projects/${projectId}`,
      providesTags: (_result, _error, id) => [{ type: "Projects", id }],
    }),

    updateProject: builder.mutation<
      { message: string; project: Project },
      { id: string; name: string; description: string; key?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/projects/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: ["Projects", "Tasks"],
    }),

    addProjectMember: builder.mutation<
      { message: string },
      { id: string; userId: string }
    >({
      query: ({ id, userId }) => ({
        url: `/projects/${id}/members`,
        method: "POST",
        body: { userId },
      }),
      invalidatesTags: ["Projects", "ProjectMembers"],
    }),

    removeProjectMember: builder.mutation<
      { message: string },
      { id: string; memberId: string }
    >({
      query: ({ id, memberId }) => ({
        url: `/projects/${id}/members/${memberId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Projects", "ProjectMembers"],
    }),

    // Organizations
    getOrganizations: builder.query<OrganizationsResponse, void>({
      query: () => "/organizations",
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

    getOrganizationById: builder.query<OrganizationResponse, string>({
      query: (orgId) => `/organizations/${encodeURIComponent(orgId)}`,
      providesTags: (_result, _error, id) => [{ type: "Organizations", id }],
    }),

    updateOrganization: builder.mutation<
      OrganizationResponse,
      { orgId: string; org_name: string; description?: string; logoUrl?: string; slug?: string }
    >({
      query: ({ orgId, ...body }) => ({
        url: `/organizations/${encodeURIComponent(orgId)}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Organizations"],
    }),

    updateOrganizationMemberRole: builder.mutation<
      { message: string },
      { orgId: string; memberId: string; role: OrganizationRole }
    >({
      query: ({ orgId, memberId, role }) => ({
        url: `/organizations/${encodeURIComponent(orgId)}/members/${memberId}`,
        method: "PATCH",
        body: { role },
      }),
      invalidatesTags: ["Organizations"],
    }),

    removeOrganizationMember: builder.mutation<
      { message: string },
      { orgId: string; memberId: string }
    >({
      query: ({ orgId, memberId }) => ({
        url: `/organizations/${encodeURIComponent(orgId)}/members/${memberId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Organizations"],
    }),

    createOrganizationInvitation: builder.mutation<
      { message: string; invitation: OrganizationInvitation; emailSent?: boolean },
      { orgId: string; email: string; role: OrganizationRole }
    >({
      query: ({ orgId, ...body }) => ({
        url: `/organizations/${encodeURIComponent(orgId)}/invitations`,
        method: "POST",
        body,
      }),
      invalidatesTags: ["OrganizationInvitations"],
    }),

    getMyOrganizationInvitations: builder.query<OrganizationInvitationsResponse, void>({
      query: () => "/organizations/invitations",
      providesTags: ["OrganizationInvitations"],
    }),

    getOrganizationInvitations: builder.query<OrganizationInvitationsResponse, string>({
      query: (orgId) => `/organizations/${encodeURIComponent(orgId)}/invitations`,
      providesTags: ["OrganizationInvitations"],
    }),

    acceptOrganizationInvitation: builder.mutation<
      OrganizationResponse & { message: string },
      string
    >({
      query: (invitationId) => ({
        url: `/organizations/invitations/${invitationId}/accept`,
        method: "PATCH",
      }),
      invalidatesTags: ["Organizations", "OrganizationInvitations"],
    }),

    revokeOrganizationInvitation: builder.mutation<
      { message: string },
      { orgId: string; invitationId: string }
    >({
      query: ({ orgId, invitationId }) => ({
        url: `/organizations/${encodeURIComponent(orgId)}/invitations/${invitationId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["OrganizationInvitations"],
    }),

    getProjectMembers: builder.query<
      ProjectMembersResponse,
      string
    >({
      query: (projectId) => `/projects/${projectId}/members`,
      providesTags: ["ProjectMembers"],
    }),

    // Notifications
    getNotifications: builder.query<NotificationsResponse, string>({
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
        url: `/notifications/read-all?organizationId=${encodeURIComponent(organizationId)}`,
        method: "PATCH",
      }),
      invalidatesTags: ["Notifications"],
    }),
  }),
});

export const {
  // Tasks
  useGetTasksQuery,
  useUpdateTaskMutation,
  useCreateTaskMutation,

  // Projects
  useGetProjectsQuery,
  useCreateProjectMutation,
  useGetProjectMembersQuery,
  useGetProjectByIdQuery,
  useUpdateProjectMutation,
  useAddProjectMemberMutation,
  useRemoveProjectMemberMutation,

  // Organizations
  useGetOrganizationsQuery,
  useLazyGetOrganizationsQuery,
  useCreateOrganizationMutation,
  useGetOrganizationByIdQuery,
  useUpdateOrganizationMutation,
  useUpdateOrganizationMemberRoleMutation,
  useRemoveOrganizationMemberMutation,
  useCreateOrganizationInvitationMutation,
  useGetMyOrganizationInvitationsQuery,
  useGetOrganizationInvitationsQuery,
  useAcceptOrganizationInvitationMutation,
  useRevokeOrganizationInvitationMutation,

  // Notifications
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
} = taskApi;
