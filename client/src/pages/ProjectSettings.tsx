import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, CircleHelp, FolderKanban, LockKeyhole, Save, Shield, UsersRound, Workflow } from "lucide-react";
import Navbar from "../components/Navbar";
import {
  useAddProjectMemberMutation,
  useGetOrganizationByIdQuery,
  useGetProjectByIdQuery,
  useGetProjectMembersQuery,
  useRemoveProjectMemberMutation,
  useUpdateProjectMutation,
} from "../services/taskApi";
import type { RootState } from "../store/store";
import { useSelector } from "react-redux";

const sections = [
  "Project identity",
  "Project-specific access",
  "Project-level permissions",
  "Not applicable",
  "Actual project workflow",
  "Project-specific configuration",
  "Additional access restrictions",
  "Individual project",
] as const;

type ProjectSection = (typeof sections)[number];

function getFailureMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "data" in error) {
    const message = (error as { data?: { message?: string } }).data?.message;
    if (message) return message;
  }
  return fallback;
}

export default function ProjectSettings() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const [section, setSection] = useState<ProjectSection>("Project identity");
  const [name, setName] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [description, setDescription] = useState("");
  const [memberToAdd, setMemberToAdd] = useState("");
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const { data: projectData, isLoading, isError } = useGetProjectByIdQuery(id, { skip: !id });
  const project = projectData?.project;
  const orgId = project?.organization ?? "";
  const { data: orgData } = useGetOrganizationByIdQuery(orgId, { skip: !orgId });
  const organization = orgData?.organization;
  const { data: memberData } = useGetProjectMembersQuery(id, { skip: !id });
  const projectMembers = memberData?.members ?? [];
  const [updateProject, { isLoading: isSaving }] = useUpdateProjectMutation();
  const [addProjectMember, { isLoading: isAddingMember }] = useAddProjectMemberMutation();
  const [removeProjectMember, { isLoading: isRemovingMember }] = useRemoveProjectMemberMutation();

  const ownerId = typeof project?.owner === "string" ? project.owner : project?.owner?._id;
  const organizationAdminId = typeof organization?.admin === "string" ? organization.admin : organization?.admin?._id;
  const currentUserId = user?._id ?? user?.id;
  const canManage = Boolean(currentUserId && (currentUserId === ownerId || currentUserId === organizationAdminId));
  const projectMemberIds = useMemo(() => new Set(projectMembers.map((member) => member._id)), [projectMembers]);
  const availableMembers = (organization?.memberships ?? []).filter((membership) => {
    const memberId = typeof membership.user === "string" ? membership.user : membership.user?._id;
    return memberId && !projectMemberIds.has(memberId);
  });

  // Initialize editable fields from the fetched project.
  useEffect(() => {
    if (project) {
      setName(project.name ?? "");
      setProjectKey(project.key ?? "");
      setDescription(project.description ?? "");
    }
  }, [project?._id, project?.name, project?.description]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setNotice("");
    try {
      await updateProject({ id, name: name.trim(), key: projectKey.trim().toUpperCase(), description }).unwrap();
      setNotice("Project name and issue key saved.");
    } catch (error) {
      setErrorMessage(getFailureMessage(error, "Could not save project settings."));
    }
  }

  async function handleAddMember(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!memberToAdd) return;
    setErrorMessage("");
    setNotice("");
    try {
      await addProjectMember({ id, userId: memberToAdd }).unwrap();
      setMemberToAdd("");
      setNotice("Project access granted.");
    } catch (error) {
      setErrorMessage(getFailureMessage(error, "Could not add project member."));
    }
  }

  async function handleRemoveMember(memberId: string) {
    if (!window.confirm("Remove this person from the project?")) return;
    setErrorMessage("");
    setNotice("");
    try {
      await removeProjectMember({ id, memberId }).unwrap();
      setNotice("Project access removed.");
    } catch (error) {
      setErrorMessage(getFailureMessage(error, "Could not remove project member."));
    }
  }

  function renderSection() {
    if (section === "Project identity") {
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Project identity</h2>
          <p className="mt-1 text-sm text-slate-500">Edit the project name, issue key, and description.</p>
          {!canManage && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Only the project owner or organization owner can edit this project.</p>}
          <form onSubmit={handleSave} className="mt-6 space-y-5">
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              Project name
              <input
                value={name}
                onChange={(event) => {
                  const nextName = event.target.value;
                  setName(nextName);
                  const words = nextName.trim().split(/\s+/).filter(Boolean);
                  const suggestion = (words.length > 1 ? words.map((word) => word[0]).join("") : words[0] ?? "PRJ")
                    .replace(/[^a-zA-Z0-9]/g, "")
                    .toUpperCase()
                    .slice(0, 8);
                  setProjectKey(suggestion.length >= 2 ? suggestion : "PRJ");
                }}
                required
                maxLength={100}
                disabled={!canManage || isSaving}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
              />
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              Issue key
              <input
                value={projectKey}
                onChange={(event) => setProjectKey(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))}
                required
                minLength={2}
                maxLength={8}
                disabled={!canManage || isSaving}
                className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-mono font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                placeholder="e.g. WEB"
              />
              <span className="text-xs font-normal text-slate-500">Changing the project name suggests a new key. You can edit it before saving.</span>
            </label>
            <label className="block space-y-1.5 text-sm font-medium text-slate-700">
              Description
              <textarea value={description} onChange={(event) => setDescription(event.target.value)} rows={4} disabled={!canManage || isSaving} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50" placeholder="Describe the goals and scope of this project." />
            </label>
            <div className="flex justify-end border-t border-slate-100 pt-4">
              <button type="submit" disabled={!canManage || isSaving} className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"><Save size={16} />{isSaving ? "Saving…" : "Save changes"}</button>
            </div>
          </form>
        </div>
      );
    }

    if (section === "Project-specific access") {
      return <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><div className="rounded-lg bg-blue-50 p-2.5 text-blue-700"><UsersRound size={20} /></div><div><h2 className="text-lg font-semibold text-slate-900">Project-specific access</h2><p className="mt-1 text-sm text-slate-500">Select which organization members can access this project.</p></div></div>{canManage && <form onSubmit={handleAddMember} className="mt-5 flex flex-wrap gap-3"><select value={memberToAdd} onChange={(event) => setMemberToAdd(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"><option value="">Choose an organization member</option>{availableMembers.map((membership) => {const person = typeof membership.user === "string" ? undefined : membership.user; const memberId = person?._id ?? (typeof membership.user === "string" ? membership.user : "");return <option key={memberId} value={memberId}>{person?.name ?? person?.email ?? memberId} · {membership.role}</option>;})}</select><button disabled={!memberToAdd || isAddingMember} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{isAddingMember ? "Adding…" : "Add member"}</button></form>}<div className="mt-5 divide-y divide-slate-100 rounded-lg border border-slate-100">{projectMembers.length === 0 ? <p className="px-4 py-4 text-sm text-slate-500">No project members found.</p> : projectMembers.map((member) => <div key={member._id} className="flex items-center gap-3 px-4 py-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-sm font-semibold text-slate-600">{(member.name || member.email || "?").slice(0, 1).toUpperCase()}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-900">{member.name}</p><p className="truncate text-xs text-slate-500">{member.email}</p></div>{member._id === ownerId && <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">Project owner</span>}{canManage && member._id !== ownerId && <button type="button" disabled={isRemovingMember} onClick={() => void handleRemoveMember(member._id)} className="rounded-lg px-2.5 py-2 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50">Remove</button>}
</div>)}</div><p className="mt-4 text-xs leading-5 text-slate-500">Project members are selected from this organization. Organization owners retain administrative access.</p></div>;
    }

    if (section === "Project-level permissions") {
      return <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><Shield className="mt-0.5 text-blue-700" size={21} /><div><h2 className="text-lg font-semibold text-slate-900">Project-level permissions</h2><p className="mt-1 text-sm text-slate-500">Administrative access is based on project ownership and organization ownership.</p></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2">{[{ role: "Project owner", permission: "Edit project details, manage project members, and delete the project." }, { role: "Organization owner", permission: "Administrative access to projects in this organization." }, { role: "Project member", permission: "View and work with tasks in this project." }].map((item) => <div key={item.role} className="rounded-lg border border-slate-100 p-4"><p className="text-sm font-semibold text-slate-800">{item.role}</p><p className="mt-2 text-sm leading-5 text-slate-500">{item.permission}</p></div>)}</div><p className="mt-5 rounded-lg bg-slate-50 p-4 text-sm text-slate-600">Fine-grained project role policies are not configured separately; administrative permissions follow the rules above.</p></div>;
    }

    if (section === "Not applicable") {
      return <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><CircleHelp className="mt-0.5 text-slate-400" size={21} /><div><h2 className="text-lg font-semibold text-slate-900">Not applicable to an individual project</h2><p className="mt-1 text-sm text-slate-500">Some controls belong at the organization level rather than on a single project.</p></div></div><div className="mt-5 rounded-lg bg-slate-50 p-4 text-sm leading-6 text-slate-600">Organization name, logo, workspace URL, invitations, and organization-wide roles are managed in organization settings. <button onClick={() => navigate("/settings/organization")} className="font-semibold text-blue-700 hover:underline">Open organization settings</button></div></div>;
    }

    if (section === "Actual project workflow") {
      return <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><Workflow className="mt-0.5 text-blue-700" size={21} /><div><h2 className="text-lg font-semibold text-slate-900">Actual project workflow</h2><p className="mt-1 text-sm text-slate-500">Current task lifecycle used by the project.</p></div></div><ol className="mt-6 grid gap-3 sm:grid-cols-4">{["To Do", "In Progress", "In Review", "Done"].map((status, index) => <li key={status} className="flex items-center gap-3 rounded-lg border border-slate-100 p-4"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">{index + 1}</span><span className="text-sm font-medium text-slate-800">{status}</span></li>)}</ol><p className="mt-4 text-xs text-slate-500">Workflow statuses are currently shared across projects.</p></div>;
    }

    if (section === "Project-specific configuration") {
      return <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">Project-specific configuration</h2><p className="mt-1 text-sm text-slate-500">Identifiers and project metadata.</p><dl className="mt-5 divide-y divide-slate-100 rounded-lg border border-slate-100">{[["Project key", project?.key ?? "Not assigned"], ["Organization", organization?.org_name ?? "—"], ["Created", project?.createdAt ? new Date(project.createdAt).toLocaleString() : "—"]].map(([label, value]) => <div key={label} className="flex flex-wrap gap-2 px-4 py-3"><dt className="w-36 text-sm text-slate-500">{label}</dt><dd className="text-sm font-medium text-slate-800">{value}</dd></div>)}</dl></div>;
    }

    if (section === "Additional access restrictions") {
      return <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-start gap-3"><LockKeyhole className="mt-0.5 text-blue-700" size={21} /><div><h2 className="text-lg font-semibold text-slate-900">Additional access restrictions</h2><p className="mt-1 text-sm text-slate-500">Project access is restricted to assigned project members and organization administrators.</p></div></div><div className="mt-5 rounded-lg border border-emerald-100 bg-emerald-50 p-4"><p className="text-sm font-semibold text-emerald-900">Member-only access is active</p><p className="mt-1 text-sm text-emerald-800">People outside this project's membership cannot open its project details or members.</p></div><p className="mt-4 text-xs leading-5 text-slate-500">Additional domain, IP, or guest restrictions are not currently supported.</p></div>;
    }

    return <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">Individual project</h2><p className="mt-1 text-sm text-slate-500">This settings panel applies only to the project selected below.</p><dl className="mt-5 divide-y divide-slate-100 rounded-lg border border-slate-100">{[["Project", project?.name ?? "—"], ["Project ID", project?._id ?? id], ["Organization ID", organization?.org_id ?? orgId]].map(([label, value]) => <div key={label} className="flex flex-wrap gap-2 px-4 py-3"><dt className="w-36 text-sm text-slate-500">{label}</dt><dd className="break-all font-mono text-xs text-slate-700">{value}</dd></div>)}</dl></div>;
  }

  return <div className="min-h-screen bg-slate-50"><Navbar selectedProjectId={id} /><main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8"><button onClick={() => navigate("/dashboard")} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"><ArrowLeft size={16} />Back to project</button><div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-sm font-medium text-blue-700"><FolderKanban size={16} />Project administration</div><h1 className="text-3xl font-semibold tracking-tight text-slate-950">Project settings</h1><p className="mt-2 text-slate-500">Configure {project?.name ?? "this project"} and its access.</p></div>{project?.key && <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-mono text-sm text-slate-600">{project.key}</span>}</div>{notice && <p role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Check size={16} />{notice}</p>}{errorMessage && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</p>}{isLoading ? <div className="rounded-xl border bg-white p-8 text-sm text-slate-500">Loading project settings…</div> : isError || !project ? <div role="alert" className="rounded-xl border bg-white p-8 text-sm text-rose-700">Unable to load this project. Check your access and try again.</div> : <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]"><aside className="h-fit rounded-xl border border-slate-200 bg-white p-2 shadow-sm">{sections.map((item) => <button key={item} onClick={() => { setSection(item); setErrorMessage(""); setNotice(""); }} className={`mb-0.5 w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${section === item ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}>{item}</button>)}</aside><section>{renderSection()}</section></div>}</main></div>;
}
