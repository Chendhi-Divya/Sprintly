import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

type TaskStatus = "To Do" | "In Progress" | "In Review" | "Done";
type TaskType = "Epic" | "Story" | "Task" | "Bug" ;
type TaskPriority = "Low" | "Medium" | "High" ;

interface Task {
  _id: string;
  title: string;
  description?: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;

  assignee?: {
    _id: string;
    name: string;
    email: string;
  };

  reporter?: {
    _id: string;
    name: string;
    email: string;
  };

  project?: {
    _id: string;
    name: string;
  };
}

interface TasksResponse {
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

interface UpdateTaskResponse {
  message: string;
  task: Task;
}

interface UpdateTaskRequest {
  id: string;
  status: TaskStatus;
}

interface Project {
  _id: string;
  name: string;
}

interface ProjectsResponse {
  projects: Project[];
}

interface CreateTaskRequest {
  title: string;
  description?: string;
  type: TaskType;
  priority: TaskPriority;
  project: string;
  assignee?: string;
  dueDate?: string;
  parentTask?: string;
}

interface CreateTaskResponse {
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
    // Fetch tasks and refresh them after a task is created or updated.
    getTasks: builder.query<TasksResponse, void>({
      query: () => "/tasks",
      providesTags: ["Tasks"],
    }),

    // Update a task's status.
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

    // Fetch projects available to the logged-in user.
    getProjects: builder.query<ProjectsResponse, void>({
      query: () => "/projects",
      providesTags: ["Projects"],
    }),

    // Create a task and refresh the task board/list.
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
  useCreateTaskMutation,
} = taskApi;
