import { createSlice } from "@reduxjs/toolkit";
import type{ PayloadAction } from "@reduxjs/toolkit";

interface User {
  _id?: string;
  name?: string;
  email?: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
}

const initialState: AuthState = {
  token: null,
  user: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,

  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{
        token: string;
        user: User;
      }>
    ) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
    },

    logout: (state) => {
      state.token = null;
      state.user = null;
    },
  },
});

export const { setCredentials, logout } =
  authSlice.actions;

export default authSlice.reducer;