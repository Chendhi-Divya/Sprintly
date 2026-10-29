
import { Routes, Route } from "react-router-dom";
import type { ComponentType } from "react";

import Register from "./pages/Register";
import Login from "./pages/login";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Organizations from "./pages/Organizations";
import CreateOrganization from "./pages/CreateOrganization";
import CreateProject from "./pages/CreateProject";

import ProtectedRoute from "./routes/ProtectedRoute";
import Tasks from "./pages/Tasks";
import Navbar from "./components/Navbar";
import WorkspaceLayout from "./pages/WorkspaceLayout";
import OrganizationSettings from "./pages/OrganizationSettings";
import ProjectSettings from "./pages/ProjectSettings.tsx";

const RegisterPage = Register as unknown as ComponentType;

function App() {
  return (
    <Routes>
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Protected routes */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="/organizations"
          element={<Organizations />}
        />

        <Route
          path="/organizations/create"
          element={<CreateOrganization />}
        />

        <Route
          path="/settings/organization"
          element={<OrganizationSettings />}
        />

        <Route
          path="/projects/:id/settings"
          element={<ProjectSettings />}
        />

        <Route
          path="/projects/create"
          element={<CreateProject />}
        />

        <Route
          path="/dashboard"
          element={<WorkspaceLayout />}
        />

        <Route
          path="/tasks"
          element={
            <>
              <Navbar selectedProjectId="" />
              <Tasks />
            </>
          }
        />
      </Route>
    </Routes>
  );
}

export default App;
