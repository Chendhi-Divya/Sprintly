
import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

interface User {
  id?: string;
  _id?: string;
  name?: string;
  email?: string;
}

export interface Organization {
  _id: string;
  org_id: string;
  org_name: string;
}

interface AuthState {
  user: User | null;
  selectedOrganization: Organization | null;
}

const initialState: AuthState = {
  user: (() => {
    try {
      const savedUser = localStorage.getItem("user");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  })(),

  selectedOrganization: (() => {
    try {
      const saved = localStorage.getItem("selectedOrganization");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })(),
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User }>
    ) => {
      state.user = action.payload.user;
      localStorage.setItem("user", JSON.stringify(action.payload.user));
    },

    setSelectedOrganization: (
      state,
      action: PayloadAction<Organization>
    ) => {
      state.selectedOrganization = action.payload;
      localStorage.setItem(
        "selectedOrganization",
        JSON.stringify(action.payload)
      );
    },

    logout: (state) => {
      state.user = null;
      state.selectedOrganization = null;
      localStorage.removeItem("user");
      localStorage.removeItem("selectedOrganization");
    },
  },
});

export const {
  setCredentials,
  setSelectedOrganization,
  logout,
} = authSlice.actions;

export default authSlice.reducer;
