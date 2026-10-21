
import { configureStore } from "@reduxjs/toolkit";

import authReducer from "./authSlice";
import { authApi } from "../services/authApi";
import { taskApi } from "../services/taskApi";

export const store = configureStore({
  reducer: { //Registers the authentication state and both API reducers
    auth: authReducer,
    [authApi.reducerPath]: authApi.reducer,
    [taskApi.reducerPath]: taskApi.reducer,
  },

  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware()
      .concat(authApi.middleware)
      .concat(taskApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;  //Provides the TypeScript type for your Redux state.
export type AppDispatch = typeof store.dispatch;  //Provides the TypeScript type for dispatching Redux actions.
