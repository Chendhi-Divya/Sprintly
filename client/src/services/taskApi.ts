
import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";


interface Task {
  _id: string;
  title: string;
  description?: string;
  type: "Epic" | "Story" | "Task" | "Bug" | "Sub-task";
  status: "To Do" | "In Progress" | "Done";
  priority: "Low" | "Medium" | "High" | "Urgent";

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

  project: {
    _id: string;
    name: string;
  };
}

interface TasksResponse {
  tasks: Task[];
}

export const taskApi = createApi({
  reducerPath: "taskApi",

  baseQuery: fetchBaseQuery({
    baseUrl: "http://localhost:5000/api",
    credentials: "include",
  }),

  tagTypes: ["Tasks"],

  endpoints: (builder) => ({
    getTasks: builder.query<TasksResponse, void>({
      query: () => "/tasks",
      providesTags: ["Tasks"],
    }),
  }),
});

export const { useGetTasksQuery } = taskApi;
