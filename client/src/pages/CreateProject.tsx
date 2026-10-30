import { useState } from "react";
import type { FormEvent } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FolderPlus, X } from "lucide-react";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

import {
  useCreateProjectMutation,
  useGetProjectsQuery,
} from "../services/taskApi";

import type { RootState } from "../store/store";

export default function CreateProject() {
  const [name, setName] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [description, setDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedOrganization = useSelector(
    (state: RootState) => state.auth.selectedOrganization
  );

  const navigate = useNavigate();

  const [createProject, { isLoading }] =
    useCreateProjectMutation();

  const organizationId = selectedOrganization?.org_id || "";

  // Fetch projects belonging to the selected organization.
  const {
    data: projectsData,
    isLoading: isLoadingProjects,
    isFetching: isFetchingProjects,
  } = useGetProjectsQuery(organizationId, {
    skip: !organizationId,
  });

  // Check whether this organization already has a project.
  const hasExistingProjects =
    (projectsData?.projects?.length ?? 0) > 0;

  // Close behavior depends on whether a project already exists.
  const handleClose = () => {
    if (!organizationId) {
      navigate("/organizations", { replace: true });
      return;
    }

    if (hasExistingProjects) {
      // Existing user: return to the dashboard/task board.
      navigate("/dashboard", { replace: true });
    } else {
      // First-time setup: return to the organization page.
      navigate("/organizations", { replace: true });
    }
  };

  const handleKeyChange = (value: string) => {
    setProjectKey(
      value.toUpperCase().replace(/[^A-Z0-9]/g, "")
    );
  };

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setErrorMessage("");

    const projectName = name.trim();
    const formattedKey = projectKey.trim().toUpperCase();
    const projectDescription = description.trim();

    if (!organizationId) {
      setErrorMessage(
        "Organization information is missing. Please create or select an organization first."
      );
      return;
    }

    if (!projectName) {
      setErrorMessage("Please enter a project name.");
      return;
    }

    if (!formattedKey) {
      setErrorMessage("Please enter a project key.");
      return;
    }

    if (!/^[A-Z][A-Z0-9]{1,9}$/.test(formattedKey)) {
      setErrorMessage(
        "Project key must start with a letter and contain 2–10 letters or numbers."
      );
      return;
    }

    try {
      await createProject({
        name: projectName,
        key: formattedKey,
        description: projectDescription,
        organization: organizationId,
      }).unwrap();

      // After creating a project, open the dashboard.
      navigate("/dashboard", {
        replace: true,
      });
    } catch (error: unknown) {
      const apiError = error as {
        data?: { message?: string };
      };

      setErrorMessage(
        apiError?.data?.message ||
          "Could not create the project. Please try again."
      );
    }
  }

  const isCheckingProjects =
    isLoadingProjects || isFetchingProjects;

  const isFirstProject = !hasExistingProjects;

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="relative w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">

        {/* Close Button */}
        <button
          type="button"
          onClick={handleClose}
          aria-label="Close create project form"
          title="Close"
          disabled={isLoading || isCheckingProjects}
          className="absolute right-4 top-4 rounded-md p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Heading */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <FolderPlus
              aria-hidden="true"
              className="h-6 w-6 text-primary"
            />
          </div>

          <h1 className="text-2xl font-semibold">
            {isFirstProject
              ? "Create your first project"
              : "Create a project"}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {selectedOrganization
              ? isFirstProject
                ? `Create your first project in ${selectedOrganization.org_name}.`
                : `Create another project in ${selectedOrganization.org_name}.`
              : "An organization is required before creating a project."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Project Name */}
          <div className="space-y-2">
            <Label htmlFor="project-name">
              Project name
            </Label>

            <Input
              id="project-name"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              placeholder="Enter your project name"
              maxLength={100}
              required
              disabled={
                isLoading ||
                isCheckingProjects ||
                !organizationId
              }
            />
          </div>

          {/* Project Key */}
          <div className="space-y-2">
            <Label htmlFor="project-key">
              Project key
            </Label>

            <Input
              id="project-key"
              value={projectKey}
              onChange={(event) =>
                handleKeyChange(event.target.value)
              }
              placeholder="Enter your project key (e.g. RN)"
              maxLength={10}
              required
              disabled={
                isLoading ||
                isCheckingProjects ||
                !organizationId
              }
            />

            <p className="text-xs text-muted-foreground">
              Choose your own project key. It will be used
              as the prefix for all task IDs in this project,
              such as{" "}
              {projectKey || "RN"}-01,{" "}
              {projectKey || "RN"}-02.
            </p>
          </div>

          {/* Project Description */}
          <div className="space-y-2">
            <Label htmlFor="project-description">
              Project description
            </Label>

            <textarea
              id="project-description"
              value={description}
              onChange={(event) =>
                setDescription(event.target.value)
              }
              placeholder="Enter project description"
              rows={3}
              maxLength={500}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              disabled={
                isLoading ||
                isCheckingProjects ||
                !organizationId
              }
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {errorMessage}
            </p>
          )}

          {/* Create Project Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={
              isLoading ||
              isCheckingProjects ||
              !organizationId
            }
          >
            {isLoading
              ? "Creating project..."
              : isCheckingProjects
                ? "Checking organization..."
                : "Create project"}
          </Button>

          {!organizationId && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => navigate("/organizations")}
            >
              Go to organizations
            </Button>
          )}
        </form>
      </div>
    </main>
  );
}