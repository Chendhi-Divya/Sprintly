import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import TaskBoard from "./TaskBoard";
import ProjectHeader from "../components/ProjectHeader";

type ViewType = "Board" | "List";

export type TaskFilters = {
  status: string;
  priority: string;
  assignee: string;
  type: string;
};

const initialFilters: TaskFilters = {
  status: "",
  priority: "",
  assignee: "",
  type: "",
};

type DashboardProps = {
  selectedProjectId: string;
  onProjectChange: (projectId: string) => void;
};

export default function Dashboard({
  selectedProjectId,
  onProjectChange,
}: DashboardProps) {
  const [activeView, setActiveView] = useState<ViewType>("Board");
  const [searchText, setSearchText] = useState("");
  const [filters, setFilters] = useState<TaskFilters>(initialFilters);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    const taskId = searchParams.get("taskId");

    if (taskId) {
      setSelectedTaskId(taskId);
    }
  }, [searchParams]);

  useEffect(() => {
    function handleOpenTask(event: Event) {
      const customEvent = event as CustomEvent<{ taskId?: string }>;
      const taskId = customEvent.detail?.taskId;

      if (taskId) {
        setSelectedTaskId(taskId);
      }
    }

    window.addEventListener("sprintly:open-task", handleOpenTask);

    return () => {
      window.removeEventListener("sprintly:open-task", handleOpenTask);
    };
  }, []);

  function handleClearFilters() {
    setFilters(initialFilters);
  }

  function handleTaskClose() {
    setSelectedTaskId(null);

    if (searchParams.has("taskId")) {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("taskId");
      setSearchParams(nextParams, { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ProjectHeader
        selectedProjectId={selectedProjectId}
        onProjectChange={onProjectChange}
        activeView={activeView}
        onViewChange={setActiveView}
        searchText={searchText}
        onSearchChange={setSearchText}
        filters={filters}
        onFiltersChange={setFilters}
        onClearFilters={handleClearFilters}
      />

      <TaskBoard
        selectedProjectId={selectedProjectId}
        activeView={activeView}
        searchText={searchText}
        filters={filters}
        selectedTaskId={selectedTaskId}
        onTaskOpen={setSelectedTaskId}
        onTaskClose={handleTaskClose}
      />
    </div>
  );
}