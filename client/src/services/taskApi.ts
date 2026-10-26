
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
  parentTask?: ParentTask | string | null;
  assignee?: TaskUser | string | null;
  reporter?: TaskUser | string | null;
  project?: TaskProject | string | null;
}

// API responses
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

export interface Project {
  _id: string;
  name: string;
}

export interface ProjectsResponse {
  projects: Project[];
}

// Project members for the assignee dropdown
export interface ProjectMember {
  _id: string;
  name: string;
  email: string;
}

export interface ProjectMembersResponse {
  message: string;
  members: ProjectMember[];
}

// Create task request
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

export const taskApi = createApi({
  reducerPath: "taskApi",

  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:5000/api",
    credentials: "include",

    prepareHeaders: (headers, { getState }) => {
      const state = getState() as {
        auth?: {
          token: string | null;
        };
      };

      const token = state.auth?.token;

      if (token) {
        headers.set("Authorization", `Bearer ${token}`);
      }

      return headers;
    },
  }),

  tagTypes: ["Tasks", "Projects"],

  endpoints: (builder) => ({
    // Fetch all tasks
    getTasks: builder.query<TasksResponse, void>({
      query: () => "/tasks",
      providesTags: ["Tasks"],
    }),

    // Update task status
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

    // Fetch projects
    getProjects: builder.query<ProjectsResponse, void>({
      query: () => "/projects",
      providesTags: ["Projects"],
    }),

    // Fetch members of a project
    getProjectMembers: builder.query<
      ProjectMembersResponse,
      string
    >({
      query: (projectId) => `/projects/${projectId}/members`,
    }),

    // Create a task and optionally assign it to a member
    createTask: builder.mutation<
      CreateTaskResponse,
      CreateTaskRequest
    >({
      query: (newTask) => ({
        url: "/tasks",
        method: "POST",
        body: newTask,
      }),
      invalidatesTags: ["Tasks"],
    }),
  }),
});

export const {
  useGetTasksQuery,
  useUpdateTaskMutation,
  useGetProjectsQuery,
  useGetProjectMembersQuery,
  useCreateTaskMutation,
} = taskApi;
