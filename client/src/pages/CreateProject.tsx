import { useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FolderPlus } from "lucide-react";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useCreateProjectMutation } from "../services/taskApi";
import type { RootState } from "../store/store";

export default function CreateProject() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const selectedOrganization = useSelector(
    (state: RootState) => state.auth.selectedOrganization
  );
  const navigate = useNavigate();
  const [createProject, { isLoading }] = useCreateProjectMutation();

  const organizationId =
    selectedOrganization?.org_id || selectedOrganization?._id || "";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");

    if (!selectedOrganization || !organizationId) {
      setErrorMessage("Select an organization before creating a project.");
      return;
    }

    try {
      await createProject({
        name: name.trim(),
        description: description.trim(),
        organization: organizationId,
      }).unwrap();
      navigate("/dashboard", { replace: true });
    } catch (error: unknown) {
      const apiError = error as { data?: { message?: string } };
      setErrorMessage(
        apiError.data?.message || "Could not create the project. Please try again."
      );
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <FolderPlus aria-hidden="true" className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold">Create a project</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {selectedOrganization
              ? `Add a project to ${selectedOrganization.org_name}.`
              : "Choose an organization to create a project."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project-name">Project name</Label>
            <Input
              id="project-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Division Portal"
              maxLength={100}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">Description</Label>
            <textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this project about?"
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              disabled={isLoading}
            />
          </div>

          {errorMessage && (
            <p role="alert" className="text-sm text-destructive">
              {errorMessage}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={isLoading || !organizationId}>
            {isLoading ? "Creating project..." : "Create project"}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={isLoading}
            onClick={() => navigate("/dashboard")}
          >
            Cancel
          </Button>
        </form>
      </div>
    </main>
  );
}
