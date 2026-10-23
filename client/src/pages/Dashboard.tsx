import TaskBoard from "./TaskBoard";
import ProjectHeader from "../components/ProjectHeader";

type DashboardProps = {
  selectedProjectId: string;
  onProjectChange: (projectId: string) => void;
};

export default function Dashboard({
  selectedProjectId,
  onProjectChange,
}: DashboardProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      <ProjectHeader
        selectedProjectId={selectedProjectId}
        onProjectChange={onProjectChange}
      />

      <TaskBoard selectedProjectId={selectedProjectId} />
    </div>
  );
}