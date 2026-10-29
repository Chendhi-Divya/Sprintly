
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { Building2 } from "lucide-react";

import {
  useGetOrganizationsQuery,
  useCreateOrganizationMutation,
} from "../services/taskApi";

import { setSelectedOrganization } from "../store/authSlice";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

export default function Organizations() {
  const [organizationName, setOrganizationName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();
  const dispatch = useDispatch();

  const {
    data,
    isLoading,
    isError,
    error,
  } = useGetOrganizationsQuery();

  const [
    createOrganization,
    { isLoading: isCreating },
  ] = useCreateOrganizationMutation();

  const organizations = data?.organizations ?? [];

  // Automatically select an organization only when exactly one exists.
  useEffect(() => {
    if (organizations.length !== 1) {
      return;
    }

    dispatch(setSelectedOrganization(organizations[0]));
    navigate("/dashboard", { replace: true });
  }, [organizations, dispatch, navigate]);

  // Select an existing organization.
  const handleSelectOrganization = (
    organization: (typeof organizations)[number]
  ) => {
    dispatch(setSelectedOrganization(organization));
    navigate("/dashboard");
  };

  // Create an organization only after form submission.
  const handleCreateOrganization = async (
    event: React.FormEvent<HTMLFormElement>
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

      dispatch(setSelectedOrganization(response.organization));
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      setErrorMessage(
        error?.data?.message || "Failed to create organization."
      );
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">
          Loading organizations...
        </p>
      </main>
    );
  }

  // Error state
  if (isError) {
    const message =
      "data" in (error ?? {})
        ? (error as any)?.data?.message
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
            onClick={() => window.location.reload()}
            className="w-full"
          >
            Try Again
          </Button>
        </div>
      </main>
    );
  }

  // No organizations: show the creation form.
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
                placeholder="e.g. Riktam Technologies"
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

  // Multiple organizations: show the chooser.
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl space-y-6 pt-6">
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
          {organizations.map((organization) => (
            <button
              key={organization._id}
              type="button"
              onClick={() =>
                handleSelectOrganization(organization)
              }
              className="flex w-full items-center gap-4 rounded-xl border bg-card p-4 text-left transition hover:border-primary hover:bg-accent"
            >
              <div className="rounded-lg bg-primary/10 p-3">
                <Building2 className="h-6 w-6 text-primary" />
              </div>

              <div className="min-w-0 flex-1">
                <p className="font-semibold">
                  {organization.org_name}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </main>
  );
}
