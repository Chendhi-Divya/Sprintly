
import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  UserRound,
  CalendarDays,
  Trash,
} from "lucide-react";

import Navbar from "../components/Navbar";

import {
  useGetProjectByIdQuery,
  useUpdateProjectMutation,
  useDeleteProjectMutation,
} from "../services/taskApi";

function getFailureMessage(
  error: unknown,
  fallback: string
): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "data" in error
  ) {
    const data = (error as {
      data?: { message?: string };
    }).data;

    if (data?.message) {
      return data.message;
    }
  }

  return fallback;
}

function getOwnerDetails(owner: unknown) {
  if (typeof owner === "object" && owner !== null) {
    const person = owner as {
      name?: string;
      email?: string;
    };

    return {
      name: person.name || person.email || "Owner name unavailable",
      email: person.email || "",
    };
  }

  return {
    name: "Owner information unavailable",
    email: "",
  };
}

function formatCreatedDate(date?: string): string {
  if (!date) {
    return "Creation date unavailable";
  }

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Invalid creation date";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(parsedDate);
}

export default function ProjectSettings() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [description, setDescription] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    data: projectData,
    isLoading,
    isFetching,
    isError,
    refetch,
  } = useGetProjectByIdQuery(id, {
    skip: !id,
  });

  const project = projectData?.project;

  const [updateProject, { isLoading: isSaving }] =
    useUpdateProjectMutation();

  const [deleteProject, { isLoading: isDeleting }] =
    useDeleteProjectMutation();

  const isBusy = isSaving || isDeleting;

  // Populate form when project details are loaded.
  useEffect(() => {
    if (!project) return;

    setName(project.name ?? "");
    setProjectKey(project.key ?? "");
    setDescription(project.description ?? "");
  }, [project]);

  // Automatically hide success notification.
  useEffect(() => {
    if (!successMessage) return;

    const timer = window.setTimeout(() => {
      setSuccessMessage("");
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  // Check whether any project field has changed.
  const hasProjectChanges = Boolean(
    project &&
      (
        name.trim() !== (project.name ?? "") ||
        projectKey.trim().toUpperCase() !==
          (project.key ?? "").toUpperCase() ||
        description.trim() !== (project.description ?? "")
      )
  );

  const handleClose = () => {
    navigate("/dashboard");
  };

  // Restore original project details.
  const handleCancelChanges = () => {
    if (!project) return;

    setName(project.name ?? "");
    setProjectKey(project.key ?? "");
    setDescription(project.description ?? "");
    setErrorMessage("");
    setSuccessMessage("");
  };

  // Update project details after confirmation.
  const handleSave = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasProjectChanges || isBusy) return;

    const confirmed = window.confirm(
      "Are you sure you want to save these project changes?"
    );

    if (!confirmed) return;

    setErrorMessage("");
    setSuccessMessage("");

    const formattedName = name.trim();
    const formattedKey = projectKey.trim().toUpperCase();
    const formattedDescription = description.trim();

    if (!formattedName) {
      setErrorMessage("Project name is required.");
      return;
    }

    if (!/^[A-Z][A-Z0-9]{1,7}$/.test(formattedKey)) {
      setErrorMessage(
        "Issue key must contain 2–8 characters, start with a letter, and contain only letters and numbers."
      );
      return;
    }

    try {
      await updateProject({
        id,
        name: formattedName,
        key: formattedKey,
        description: formattedDescription,
      }).unwrap();

      await refetch();

      setSuccessMessage("Project updated successfully.");
    } catch (error: unknown) {
      setErrorMessage(
        getFailureMessage(
          error,
          "Could not save project settings. Please try again."
        )
      );
    }
  };

  // Delete project after confirmation.
  const handleDelete = async () => {
    if (!project || !id || isBusy) {
      return;
    }

    setErrorMessage("");

    try {
      await deleteProject(id).unwrap();

      setShowDeleteConfirm(false);
      navigate("/dashboard", { replace: true });
    } catch (error: unknown) {
      setErrorMessage(
        getFailureMessage(
          error,
          "Could not delete this project. Please try again."
        )
      );
    }
  };

  const closeDeleteConfirm = () => {
    if (isDeleting) return;

    setShowDeleteConfirm(false);
    setErrorMessage("");
  };

  const owner = getOwnerDetails(project?.owner);
  const createdAt = formatCreatedDate(project?.createdAt);

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar selectedProjectId={id} />

      {/* Success notification */}
      {successMessage && (
        <div
          role="status"
          aria-live="polite"
          className="fixed right-6 top-20 z-[110] rounded-lg border border-emerald-200 bg-white px-5 py-3 shadow-lg"
        >
          <p className="text-sm font-medium text-emerald-700">
            {successMessage}
          </p>
        </div>
      )}

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Back button */}
        <button
          type="button"
          onClick={handleClose}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to workspace
        </button>

        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-950">
            Project settings
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage your project details and information.
          </p>
        </div>

        {/* General error message */}
        {errorMessage && !showDeleteConfirm && (
          <p
            role="alert"
            className="mb-5 rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
          >
            {errorMessage}
          </p>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
            Loading project settings...
          </div>
        )}

        {/* Project loading error */}
        {!isLoading && (isError || !project) && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-white p-6 text-sm text-rose-700"
          >
            Unable to load this project. Please check your access and try again.
          </div>
        )}

        {/* Project settings form */}
        {!isLoading && project && (
          <form
            onSubmit={handleSave}
            className="space-y-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            {/* Form header with delete button */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-5">
              <h2 className="text-base font-semibold text-slate-900">
                General settings
              </h2>

              <button
                type="button"
                onClick={() => {
                  setErrorMessage("");
                  setShowDeleteConfirm(true);
                }}
                disabled={isBusy || !project}
                aria-label="Delete project"
                title="Delete project"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash size={16} />
              </button>
            </div>

            {/* Project details */}
            <section>
              <h2 className="mb-5 text-base font-semibold text-slate-900">
                Project details
              </h2>

              <div className="space-y-5">
                {/* Project name */}
                <div className="space-y-2">
                  <label
                    htmlFor="project-name"
                    className="text-sm font-medium text-slate-700"
                  >
                    Project name
                  </label>

                  <input
                    id="project-name"
                    type="text"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Enter project name"
                    maxLength={100}
                    required
                    disabled={isBusy}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  />
                </div>

                {/* Issue key */}
                <div className="space-y-2">
                  <label
                    htmlFor="project-key"
                    className="text-sm font-medium text-slate-700"
                  >
                    Issue key
                  </label>

                  <input
                    id="project-key"
                    type="text"
                    value={projectKey}
                    onChange={(event) =>
                      setProjectKey(
                        event.target.value
                          .toUpperCase()
                          .replace(/[^A-Z0-9]/g, "")
                          .slice(0, 8)
                      )
                    }
                    placeholder="e.g. SD"
                    minLength={2}
                    maxLength={8}
                    required
                    disabled={isBusy}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-mono text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  />

                  <p className="text-xs text-slate-500">
                    This key is used as the prefix for task IDs in this project.
                  </p>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label
                    htmlFor="project-description"
                    className="text-sm font-medium text-slate-700"
                  >
                    Description
                  </label>

                  <textarea
                    id="project-description"
                    value={description}
                    onChange={(event) =>
                      setDescription(event.target.value)
                    }
                    placeholder="Enter project description"
                    rows={4}
                    maxLength={1000}
                    disabled={isBusy}
                    className="w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                  />
                </div>
              </div>
            </section>

            {/* Project information */}
            <section className="border-t border-slate-200 pt-6">
              <h2 className="mb-5 text-base font-semibold text-slate-900">
                Project information
              </h2>

              <div className="grid gap-5 sm:grid-cols-2">
                {/* Created by */}
                <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
                  <div className="rounded-lg bg-slate-100 p-2">
                    <UserRound size={19} className="text-slate-600" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">
                      Created by
                    </p>

                    <p className="mt-1 break-words text-sm font-semibold text-slate-900">
                      {owner.name}
                    </p>

                    {owner.email && (
                      <p className="mt-1 break-words text-xs text-slate-500">
                        {owner.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Created date */}
                <div className="flex items-start gap-3 rounded-lg border border-slate-200 p-4">
                  <div className="rounded-lg bg-slate-100 p-2">
                    <CalendarDays size={19} className="text-slate-600" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">
                      Created date and time
                    </p>

                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {createdAt}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Save and Cancel appear only when changes exist */}
            {hasProjectChanges && (
              <div className="flex justify-end gap-3 border-t border-slate-200 pt-5">
                <button
                  type="button"
                  onClick={handleCancelChanges}
                  disabled={isBusy}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isBusy}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            )}

            {isFetching && !isLoading && (
              <p className="text-right text-xs text-slate-400">
                Refreshing project...
              </p>
            )}
          </form>
        )}
      </main>

      {/* Delete confirmation modal */}
      {showDeleteConfirm && project && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 px-4 py-6"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeDeleteConfirm();
            }
          }}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-project-title"
            aria-describedby="delete-project-description"
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-slate-100 p-2">
                <Trash size={20} className="text-slate-600" />
              </div>

              <div className="min-w-0 flex-1">
                <h2
                  id="delete-project-title"
                  className="text-base font-semibold text-slate-900"
                >
                  Delete project?
                </h2>

                <p
                  id="delete-project-description"
                  className="mt-2 text-sm leading-6 text-slate-500"
                >
                  Are you sure you want to delete{" "}
                  <span className="font-semibold text-slate-800">
                    {project.name}
                  </span>
                  ? This action cannot be undone.
                </p>
              </div>
            </div>

            {/* Delete error */}
            {errorMessage && (
              <p
                role="alert"
                className="mt-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700"
              >
                {errorMessage}
              </p>
            )}

            {/* Confirmation buttons */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={isDeleting}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash size={15} />
                {isDeleting ? "Deleting..." : "Delete project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
