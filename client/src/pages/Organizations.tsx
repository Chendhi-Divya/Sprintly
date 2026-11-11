
import { useState } from "react";
import type { FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Building2, LogOut, Plus, X } from "lucide-react";

import {
  useGetOrganizationsQuery,
  useCreateOrganizationMutation,
  useLazyGetProjectsQuery,
} from "../services/taskApi";
import { useLogoutMutation } from "../services/authApi";

import { logout, setSelectedOrganization } from "../store/authSlice";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

// Stores the most recently opened project separately for each organization.
const getRecentProjectKey = (organizationId: string) =>
  `sprintly_recent_project_${organizationId}`;

export default function Organizations() {
  const [organizationName, setOrganizationName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [selectingOrganizationId, setSelectingOrganizationId] =
    useState("");

  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const openedFromSwitch = Boolean(
    (location.state as { fromSwitchOrganization?: boolean } | null)
      ?.fromSwitchOrganization
  );

  const [logoutRequest, { isLoading: isLoggingOut }] =
    useLogoutMutation();

  // Fetch organizations belonging to the logged-in user.
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetOrganizationsQuery();

  // Create a new organization.
  const [createOrganization, { isLoading: isCreating }] =
    useCreateOrganizationMutation();

  // Fetch projects for the selected organization.
  const [getProjects, { isFetching: isProjectsLoading }] =
    useLazyGetProjectsQuery();

  const organizations = data?.organizations ?? [];

  async function handleLogout() {
    try {
      await logoutRequest().unwrap();
    } catch {
      // Clear the local session even if the server is unavailable.
    } finally {
      dispatch(logout());
      navigate("/login", { replace: true });
    }
  }

  function closeOrganizationSwitcher() {
    if (openedFromSwitch) {
      navigate("/dashboard", { replace: true });
    }
  }

  // Select an organization and open its most recently used project.
  const handleSelectOrganization = async (
    organization: (typeof organizations)[number]
  ) => {
    setErrorMessage("");
    setSelectingOrganizationId(organization._id);

    try {
      // Fetch projects before updating the selected organization.
      const response = await getProjects(organization._id).unwrap();

      const projects = response.projects ?? [];

      // Update the selected organization in Redux.
      dispatch(setSelectedOrganization(organization));

      // If the organization has no projects, redirect to project creation.
      if (projects.length === 0) {
        try {
          localStorage.removeItem(
            getRecentProjectKey(organization._id)
          );
        } catch {
          // Ignore localStorage errors.
        }

        navigate("/projects/create", { replace: true });
        return;
      }

      // Get the previously selected project for this organization.
      let recentProjectId = "";

      try {
        recentProjectId =
          localStorage.getItem(
            getRecentProjectKey(organization._id)
          ) || "";
      } catch {
        // Continue with the first project if localStorage is unavailable.
      }

      // Check whether the previously selected project still exists.
      const recentProject = projects.find(
        (project) => project._id === recentProjectId
      );

      // Open the recent project or fall back to the first project.
      const projectToOpen = recentProject ?? projects[0];

      // Save the project as the most recently opened project.
      try {
        localStorage.setItem(
          getRecentProjectKey(organization._id),
          projectToOpen._id
        );
      } catch {
        // The project can still open if localStorage is unavailable.
      }

      // Navigate to the dashboard with the selected project.
      navigate("/dashboard", {
        replace: true,
        state: {
          selectedProjectId: projectToOpen._id,
        },
      });
    } catch (error: any) {
      console.error(
        "Unable to load organization projects:",
        error
      );

      setErrorMessage(
        error?.data?.message ||
          "Unable to load projects. Please try again."
      );
    } finally {
      setSelectingOrganizationId("");
    }
  };

  // Create a new organization.
  const handleCreateOrganization = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();
    setErrorMessage("");

    const trimmedName = organizationName.trim();

    if (!trimmedName) {
      setErrorMessage("Please enter an organization name.");
      return;
    }

    try {
      const response = await createOrganization({
        org_name: trimmedName,
      }).unwrap();

      // Set the newly created organization as selected.
      dispatch(setSelectedOrganization(response.organization));

      // Refresh the organization list for future visits.
      refetch();

      // Continue to create the first project.
      navigate("/projects/create", { replace: true });
    } catch (error: any) {
      console.error("Organization creation failed:", error);

      setErrorMessage(
        error?.data?.message ||
          "Failed to create organization."
      );
    }
  };

  // Loading state.
  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">
          Loading organizations...
        </p>
      </main>
    );
  }

  // Organization fetching error.
  if (isError) {
    const message =
      error && "data" in error
        ? (error.data as { message?: string })?.message
        : undefined;

    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="w-full max-w-md space-y-4 text-center">
          <Building2 className="mx-auto h-8 w-8" />

          <h1 className="text-xl font-semibold">
            Unable to load organizations
          </h1>

          <p className="text-sm text-destructive">
            {message ||
              "Please check your connection and try again."}
          </p>

          <Button
            onClick={() => refetch()}
            className="w-full"
          >
            Try Again
          </Button>
        </div>
      </main>
    );
  }

  // Show the create-organization screen if the user has no organizations.
  if (organizations.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
        <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
          <div className="mb-6 text-center">
            <Building2 className="mx-auto mb-3 h-8 w-8" />

            <h1 className="text-2xl font-semibold">
              Create your organization
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Set up a workspace for your team in Sprintly.
            </p>
          </div>

          <form
            onSubmit={handleCreateOrganization}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="organizationName">
                Organization name
              </Label>

              <Input
                id="organizationName"
                name="organizationName"
                value={organizationName}
                onChange={(event) =>
                  setOrganizationName(event.target.value)
                }
                placeholder="Enter organization name"
                maxLength={100}
                required
                disabled={isCreating}
              />
            </div>

            {errorMessage && (
              <p role="alert" className="text-sm text-destructive">
                {errorMessage}
              </p>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={isCreating}
            >
              {isCreating
                ? "Creating..."
                : "Create Organization"}
            </Button>
          </form>
        </div>
      </main>
    );
  }

  // Show all available organizations.
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mb-5 flex w-full justify-end pr-4 sm:pr-8">
        {openedFromSwitch ? (
          <button
            type="button"
            onClick={closeOrganizationSwitcher}
            className="rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground"
            aria-label="Close organization switcher"
            title="Close"
          >
            <X size={20} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleLogout()}
            disabled={isLoggingOut}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-destructive/5 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut size={16} />
            {isLoggingOut ? "Logging out..." : "Log out"}
          </button>
        )}
      </div>

      <div className="mx-auto max-w-2xl">
        <div className="space-y-6 pt-2">
        <div className="text-center">
          <Building2 className="mx-auto mb-3 h-8 w-8" />

          <h1 className="text-2xl font-semibold">
            Choose an organization
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Select the workspace you want to open.
          </p>
        </div>

        <div className="space-y-3">
          {organizations.map((organization) => {
            const isSelecting =
              selectingOrganizationId === organization._id;

            return (
              <button
                key={organization._id}
                type="button"
                onClick={() =>
                  handleSelectOrganization(organization)
                }
                disabled={
                  isProjectsLoading ||
                  isCreating ||
                  Boolean(selectingOrganizationId)
                }
                className="flex w-full items-center gap-4 rounded-xl border bg-card p-4 text-left transition hover:border-primary hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                <div className="rounded-lg bg-primary/10 p-3">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {organization.org_name}
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {organization.org_id}
                  </p>
                </div>

                <span className="text-sm text-muted-foreground">
                  {isSelecting ? "Loading..." : "Open"}
                </span>
              </button>
            );
          })}
        </div>

        {errorMessage && (
          <p
            role="alert"
            className="text-center text-sm text-destructive"
          >
            {errorMessage}
          </p>
        )}

        <div className="pt-2">
          <Button
            variant="outline"
            className="w-full"
            onClick={() =>
              navigate("/organizations/create")
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Create new organization
          </Button>
        </div>
        </div>
      </div>
    </main>
  );
}
