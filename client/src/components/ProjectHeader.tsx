
import { useEffect, useState } from "react";
import {
  Search,
  Filter,
  Layers2,
  LayoutDashboard,
  List,
  FolderKanban,
  ChevronDown,
  Check,
} from "lucide-react";

import { useGetProjectsQuery } from "../services/taskApi";

type ProjectHeaderProps = {
  selectedProjectId?: string;
  onProjectChange?: (projectId: string) => void;
  onViewChange?: (view: "Board" | "List") => void;
};

export default function ProjectHeader({
  selectedProjectId = "",
  onProjectChange,
  onViewChange,
}: ProjectHeaderProps) {
  const [searchText, setSearchText] = useState("");
  const [activeTab, setActiveTab] = useState<"Board" | "List">("Board");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const {
    data: projectsData,
    isLoading,
    isError,
  } = useGetProjectsQuery();

  const projects = projectsData?.projects ?? [];

  // Select the first project when the page loads.
  useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      onProjectChange?.(projects[0]._id);
    }
  }, [selectedProjectId, projects, onProjectChange]);

  const activeProjectId =
    selectedProjectId || projects[0]?._id || "";

  const selectedProject = projects.find(
    (project) => project._id === activeProjectId
  );

  function handleProjectSelect(projectId: string) {
    onProjectChange?.(projectId);
    setIsDropdownOpen(false);
  }

  function handleTabChange(view: "Board" | "List") {
    setActiveTab(view);
    onViewChange?.(view);
  }

  return (
    <div className="w-full border-b border-gray-200 bg-white">
      {/* Project name and dropdown */}
      <div className="flex items-center gap-3 px-4 pt-5 sm:px-6">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-white shadow-sm">
          <FolderKanban size={23} />
        </div>

        {isLoading ? (
          <div className="h-10 w-48 animate-pulse rounded-lg bg-gray-100" />
        ) : isError ? (
          <p className="text-sm text-red-500">
            Failed to load projects.
          </p>
        ) : projects.length === 0 ? (
          <p className="text-sm text-gray-500">
            No projects found.
          </p>
        ) : (
          <div className="relative">
            <button
              type="button"
              aria-label="Choose project"
              aria-expanded={isDropdownOpen}
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex max-w-xs items-center gap-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left shadow-sm hover:border-blue-400 hover:bg-gray-50"
            >
              <span className="truncate text-base font-semibold text-gray-900">
                {selectedProject?.name ?? "Select Project"}
              </span>

              <ChevronDown
                size={18}
                className={`shrink-0 text-gray-500 ${
                  isDropdownOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isDropdownOpen && (
              <>
                <button
                  type="button"
                  aria-label="Close project dropdown"
                  className="fixed inset-0 z-40 cursor-default"
                  onClick={() => setIsDropdownOpen(false)}
                />

                <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                  {projects.map((project) => {
                    const isSelected =
                      project._id === activeProjectId;

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

      {/* Board and List tabs */}
      <div className="mt-5 flex gap-6 overflow-x-auto px-4 sm:px-6">
        {(["List", "Board"] as const).map((tab) => {
          const Icon =
            tab === "List" ? List : LayoutDashboard;

          return (
            <button
              key={tab}
              type="button"
              onClick={() => handleTabChange(tab)}
              className={`flex shrink-0 items-center gap-2 border-b-2 pb-3 text-sm ${
                activeTab === tab
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

      {/* Search, Filter and Group */}
      <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 px-4 py-4 sm:px-6">
        <div className="flex w-full max-w-xs items-center gap-2 rounded-lg border border-gray-300 px-3 py-2 sm:w-72">
          <Search size={18} className="shrink-0 text-gray-400" />

          <input
            type="text"
            placeholder={`Search ${activeTab.toLowerCase()}`}
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            className="w-full min-w-0 bg-transparent text-sm outline-none"
          />
        </div>

        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Filter size={16} />
          Filter
        </button>

        <button
          type="button"
          className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <Layers2 size={16} />
          Group
        </button>
      </div>
    </div>
  );
}
