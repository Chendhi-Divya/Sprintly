
import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Filter,
  LayoutDashboard,
  List,
  FolderKanban,
  ChevronDown,
  Check,
  X,
  Plus,
  Settings,
} from "lucide-react";

import {
  useGetProjectsQuery,
  useGetTasksQuery,
} from "../services/taskApi";

import type { TaskFilters } from "../pages/Dashboard";
import type { RootState } from "../store/store";

type ViewType = "Board" | "List";

type ProjectHeaderProps = {
  selectedProjectId?: string;
  onProjectChange?: (projectId: string) => void;
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  searchText: string;
  onSearchChange: (value: string) => void;
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  onClearFilters: () => void;
};

const statuses = ["To Do", "In Progress", "In Review", "Done"];
const priorities = ["Low", "Medium", "High"];
const taskTypes = ["Epic", "Story", "Task", "Bug"];

export default function ProjectHeader({
  selectedProjectId = "",
  onProjectChange,
  activeView,
  onViewChange,
  searchText,
  onSearchChange,
  filters,
  onFiltersChange,
  onClearFilters,
}: ProjectHeaderProps) {
  const [isProjectDropdownOpen, setIsProjectDropdownOpen] =
    useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const navigate = useNavigate();

  const selectedOrganization = useSelector(
    (state: RootState) => state.auth.selectedOrganization
  );

  const organizationId = selectedOrganization?._id ?? "";

  const {
    data: projectsData,
    isLoading,
    isError,
  } = useGetProjectsQuery(organizationId, {
    skip: !organizationId,
  });

  const projects = projectsData?.projects ?? [];

  const { data: tasksData } = useGetTasksQuery();

  const assignees = useMemo(() => {
    const uniqueAssignees = new Map<
      string,
      { _id: string; name: string }
    >();

    for (const task of tasksData?.tasks ?? []) {
      const assignee = task.assignee;

      if (
        assignee &&
        typeof assignee !== "string" &&
        assignee._id &&
        assignee.name
      ) {
        uniqueAssignees.set(assignee._id, {
          _id: assignee._id,
          name: assignee.name,
        });
      }
    }

    return Array.from(uniqueAssignees.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [tasksData?.tasks]);

  useEffect(() => {
    if (!organizationId || isLoading || isError) return;

    if (projects.length === 0) {
      if (selectedProjectId) {
        onProjectChange?.("");
      }
      return;
    }

    const projectExists = projects.some(
      (project) => project._id === selectedProjectId
    );

    if (!projectExists) {
      onProjectChange?.(projects[0]._id);
    }
  }, [
    organizationId,
    projects,
    selectedProjectId,
    isLoading,
    isError,
    onProjectChange,
  ]);

  const selectedProject = projects.find(
    (project) => project._id === selectedProjectId
  );

  const activeFilterCount = Object.values(filters).filter(
    (value) => value !== ""
  ).length;

  function handleProjectSelect(projectId: string) {
    onProjectChange?.(projectId);
    setIsProjectDropdownOpen(false);
  }

  function updateFilter(key: keyof TaskFilters, value: string) {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  }

  // Reusable dropdown styling with a consistently positioned arrow.
  const selectClassName =
    "w-full appearance-none rounded-lg border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

  function renderFilterSelect(
    value: string,
    onChange: (value: string) => void,
    placeholder: string,
    options: string[]
  ) {
    return (
      <div className="relative">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={selectClassName}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <ChevronDown
          size={16}
          aria-hidden="true"
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
        />
      </div>
    );
  }

  return (
    <div className="w-full border-b border-gray-200 bg-white">
      {/* Project selector */}
      <div className="flex min-h-[76px] flex-wrap items-center gap-3 px-4 py-4 sm:px-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
          <FolderKanban size={23} />
        </div>

        {isLoading ? (
          <div className="h-10 w-48 animate-pulse rounded-lg bg-gray-100" />
        ) : isError ? (
          <p className="text-sm text-red-500">
            Failed to load projects. Please try again.
          </p>
        ) : !organizationId ? (
          <div>
            <p className="font-medium text-gray-900">
              No organization selected
            </p>
            <button
              type="button"
              onClick={() => navigate("/organizations")}
              className="mt-1 text-sm text-blue-600 hover:text-blue-700"
            >
              Choose organization
            </button>
          </div>
        ) : projects.length === 0 ? (
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <p className="font-medium text-gray-900">
                No projects yet
              </p>
              <p className="text-sm text-gray-500">
                {selectedOrganization?.org_name ?? "This organization"} has no projects.
              </p>
            </div>

            <button
              type="button"
              onClick={() => navigate("/projects/create")}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Plus size={16} />
              Create project
            </button>

            {selectedProject && (
              <button
                type="button"
                onClick={() => navigate(`/projects/${selectedProject._id}/settings`)}
                className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <Settings size={16} />
                Settings
              </button>
            )}
          </div>
        ) : (
          <div className="relative flex flex-wrap items-center gap-2">
            <button
              type="button"
              aria-label="Choose project"
              aria-expanded={isProjectDropdownOpen}
              onClick={() =>
                setIsProjectDropdownOpen((open) => !open)
              }
              className="flex max-w-xs items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-left shadow-sm transition hover:border-blue-400 hover:bg-gray-50"
            >
              <span className="truncate text-base font-semibold text-gray-900">
                {selectedProject?.name ?? "Select project"}
              </span>

              <ChevronDown
                size={18}
                className={`shrink-0 text-gray-500 transition-transform ${
                  isProjectDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            <button
              type="button"
              onClick={() => navigate("/projects/create")}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
            >
              <Plus size={16} />
              Create project
            </button>

            {isProjectDropdownOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close project dropdown"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setIsProjectDropdownOpen(false)}
                />

                <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                  {projects.map((project) => {
                    const isSelected =
                      project._id === selectedProjectId;

                    return (
                      <button
                        key={project._id}
                        type="button"
                        onClick={() =>
                          handleProjectSelect(project._id)
                        }
                        className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left ${
                          isSelected
                            ? "bg-blue-50 text-blue-700"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <FolderKanban size={17} />

                        <span className="flex-1 truncate text-sm font-medium">
                          {project.key ? `${project.key} · ` : ""}
                          {project.name}
                        </span>

                        {isSelected && <Check size={17} />}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* View tabs, search and filters */}
      <div className="flex flex-wrap items-center gap-4 border-t border-gray-100 px-4 py-3 sm:px-6">
        <div className="flex shrink-0 items-center gap-5">
          {(["List", "Board"] as const).map((tab) => {
            const Icon = tab === "List" ? List : LayoutDashboard;

            return (
              <button
                key={tab}
                type="button"
                onClick={() => onViewChange(tab)}
                className={`flex shrink-0 items-center gap-2 border-b-2 py-2 text-sm ${
                  activeView === tab
                    ? "border-blue-600 font-semibold text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                <Icon size={16} />
                {tab}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="flex w-64 shrink-0 items-center gap-2 rounded-lg border border-gray-300 px-3 py-2">
          <Search size={18} className="shrink-0 text-gray-400" />

          <input
            type="text"
            placeholder={`Search ${activeView.toLowerCase()}...`}
            value={searchText}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-full min-w-0 bg-transparent text-sm outline-none"
          />

          {searchText && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onSearchChange("")}
              className="shrink-0 text-gray-400 hover:text-gray-700"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Filter */}
        <div className="relative shrink-0">
          <button
            type="button"
            aria-expanded={isFilterOpen}
            onClick={() => setIsFilterOpen((open) => !open)}
            className={`flex items-center gap-3 rounded-lg border py-2 pl-4 pr-5 text-sm transition hover:bg-gray-50 ${
              activeFilterCount > 0
                ? "border-blue-300 bg-blue-50 text-blue-700"
                : "border-gray-300 text-gray-700"
            }`}
          >
            <Filter size={16} />
            <span>Filter</span>

            {activeFilterCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1 text-xs text-white">
                {activeFilterCount}
              </span>
            )}

            <ChevronDown
              size={16}
              className={`ml-1 shrink-0 transition-transform ${
                isFilterOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {isFilterOpen && (
            <>
              <button
                type="button"
                aria-label="Close filters"
                className="fixed inset-0 z-40 cursor-default"
                onClick={() => setIsFilterOpen(false)}
              />

              <div className="absolute left-0 top-full z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-gray-200 bg-white p-4 shadow-xl">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">
                    Filter tasks
                  </h3>

                  <button
                    type="button"
                    onClick={onClearFilters}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear all
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Status
                    </label>
                    {renderFilterSelect(
                      filters.status,
                      (value) => updateFilter("status", value),
                      "All statuses",
                      statuses
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Priority
                    </label>
                    {renderFilterSelect(
                      filters.priority,
                      (value) => updateFilter("priority", value),
                      "All priorities",
                      priorities
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Type
                    </label>
                    {renderFilterSelect(
                      filters.type,
                      (value) => updateFilter("type", value),
                      "All types",
                      taskTypes
                    )}
                  </div>

                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-700">
                      Assignee
                    </label>
                    <div className="relative">
                      <select
                        value={filters.assignee ?? ""}
                        onChange={(event) =>
                          updateFilter("assignee", event.target.value)
                        }
                        className={selectClassName}
                      >
                        <option value="">All assignees</option>
                        {assignees.map((assignee) => (
                          <option key={assignee._id} value={assignee._id}>
                            {assignee.name}
                          </option>
                        ))}
                      </select>

                      <ChevronDown
                        size={16}
                        aria-hidden="true"
                        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-600"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFilterOpen(false)}
                  className="mt-5 w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Done
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
