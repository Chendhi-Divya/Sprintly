import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Check,
  FolderKanban,
  MailPlus,
  UsersRound,
} from "lucide-react";
import Navbar from "../components/Navbar";
import type { RootState } from "../store/store";
import { setSelectedOrganization } from "../store/authSlice";
import {
  useAcceptOrganizationInvitationMutation,
  useCreateOrganizationInvitationMutation,
  useGetMyOrganizationInvitationsQuery,
  useGetOrganizationByIdQuery,
  useGetOrganizationInvitationsQuery,
  useGetProjectsQuery,
  useRemoveOrganizationMemberMutation,
  useRevokeOrganizationInvitationMutation,
  useUpdateOrganizationMemberRoleMutation,
  useUpdateOrganizationMutation,
  useUpdateProjectMutation,
  type Project,
  type OrganizationRole,
} from "../services/taskApi";

const roles: OrganizationRole[] = ["Owner", "Admin", "Member", "Viewer"];

type SettingsTab = "General" | "Members" | "Project settings";

function getFailureMessage(error: unknown, fallback: string) {
  if (typeof error === "object" && error !== null && "data" in error) {
    const message = (error as { data?: { message?: string } }).data?.message;
    if (message) return message;
  }
  return fallback;
}

function makeProjectKeySuggestion(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const rawKey = (words.length > 1 ? words.map((word) => word[0]).join("") : words[0] ?? "PRJ")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 8);
  return rawKey.length >= 2 ? rawKey : "PRJ";
}

export default function OrganizationSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const selectedOrganization = useSelector((state: RootState) => state.auth.selectedOrganization);
  const user = useSelector((state: RootState) => state.auth.user);
  const orgId = selectedOrganization?.org_id ?? "";
  const requestedTab = (location.state as { section?: SettingsTab } | null)?.section;
  const [tab, setTab] = useState<SettingsTab>(requestedTab ?? "General");
  const [orgName, setOrgName] = useState("");
  const [isEditingOrgName, setIsEditingOrgName] = useState(false);
  const [email, setEmail] = useState("");
  const [editingProjectId, setEditingProjectId] = useState("");
  const [projectName, setProjectName] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [inviteRole, setInviteRole] = useState<OrganizationRole>("Member");
  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const { data, isLoading, isError } = useGetOrganizationByIdQuery(orgId, { skip: !orgId });
  const organization = data?.organization;
  const { data: projectsData } = useGetProjectsQuery(orgId, { skip: !orgId });
  const [updateProject, { isLoading: isSavingProject }] = useUpdateProjectMutation();
  const projects = projectsData?.projects ?? [];
  const { data: incomingData } = useGetMyOrganizationInvitationsQuery();
  const currentUserId = user?._id ?? user?.id ?? "";
  const currentRole = organization?.memberships?.find((membership) =>
    typeof membership.user === "string"
      ? membership.user === currentUserId
      : membership.user?._id === currentUserId
  )?.role;
  const canManage = currentRole === "Owner" || currentRole === "Admin";
  const { data: outgoingData } = useGetOrganizationInvitationsQuery(orgId, { skip: !orgId || !canManage });
  const [saveOrganization, { isLoading: isSaving }] = useUpdateOrganizationMutation();
  const [createInvitation, { isLoading: isInviting }] = useCreateOrganizationInvitationMutation();
  const [updateRole, { isLoading: isUpdatingRole }] = useUpdateOrganizationMemberRoleMutation();
  const [removeMember, { isLoading: isRemovingMember }] = useRemoveOrganizationMemberMutation();
  const [revokeInvitation, { isLoading: isRevoking }] = useRevokeOrganizationInvitationMutation();
  const [acceptInvitation, { isLoading: isAccepting }] = useAcceptOrganizationInvitationMutation();

  useEffect(() => {
    if (!organization) return;
    setOrgName(organization.org_name ?? "");
  }, [organization]);

  const members = useMemo(() => organization?.memberships ?? [], [organization?.memberships]);

  useEffect(() => {
    if (requestedTab) setTab(requestedTab);
  }, [requestedTab]);

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setNotice("");
    
      const response = await saveOrganization({ orgId, org_name: orgName.trim() }).unwrap();
      dispatch(setSelectedOrganization({
        _id: response.organization._id,
        org_id: response.organization.org_id,
        org_name: response.organization.org_name,
      }));
      setIsEditingOrgName(false);
     
    
  }

  async function handleInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setNotice("");
    try {
      const response = await createInvitation({ orgId, email: email.trim(), role: inviteRole }).unwrap();
      setEmail("");
      setNotice(response.emailSent
        ? "Invitation emailed successfully. It will remain pending until accepted."
        : "Invitation saved, but email delivery failed. Check the server mail settings; the invite is still pending.");
    } catch (error) {
      setErrorMessage(getFailureMessage(error, "Could not create the invitation."));
    }
  }

  async function handleAccept(invitationId: string) {
    setErrorMessage("");
    setNotice("");
    try {
      const response = await acceptInvitation(invitationId).unwrap();
      dispatch(setSelectedOrganization({
        _id: response.organization._id,
        org_id: response.organization.org_id,
        org_name: response.organization.org_name,
      }));
      navigate("/dashboard");
    } catch (error) {
      setErrorMessage(getFailureMessage(error, "Could not accept the invitation."));
    }
  }

  async function handleRoleChange(memberId: string, role: OrganizationRole) {
    try {
      await updateRole({ orgId, memberId, role }).unwrap();
      setNotice("Member role updated.");
    } catch (error) {
      setErrorMessage(getFailureMessage(error, "Could not update the member role."));
    }
  }

  async function handleRemove(memberId: string) {
    if (!window.confirm("Remove this person from the organization?")) return;
    try {
      await removeMember({ orgId, memberId }).unwrap();
      setNotice("Member removed from the organization.");
    } catch (error) {
      setErrorMessage(getFailureMessage(error, "Could not remove this member."));
    }
  }

  async function handleRevoke(invitationId: string) {
    try {
      await revokeInvitation({ orgId, invitationId }).unwrap();
      setNotice("Invitation revoked.");
    } catch (error) {
      setErrorMessage(getFailureMessage(error, "Could not revoke the invitation."));
    }
  }

  function startProjectEdit(project: Project) {
    setEditingProjectId(project._id);
    setProjectName(project.name);
    setProjectKey(project.key ?? "");
    setErrorMessage("");
    setNotice("");
  }

  async function handleProjectSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingProjectId || !projectName.trim()) return;
    
      await updateProject({ id: editingProjectId, name: projectName.trim(), key: projectKey.trim().toUpperCase(), description: projects.find((project) => project._id === editingProjectId)?.description ?? "" }).unwrap();
      setEditingProjectId("");
  
  }

  if (!selectedOrganization) {
    return <div className="min-h-screen bg-slate-50"><Navbar /><main className="mx-auto max-w-3xl px-4 py-12"><h1 className="text-3xl font-semibold text-slate-950">Organization invitations</h1><p className="mt-2 text-slate-500">Accept an invitation to join your team's workspace.</p><div className="mt-6 space-y-3">{(incomingData?.invitations ?? []).length === 0 ? <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">No pending invitations for your account.</div> : incomingData?.invitations.map((invitation) => <div key={invitation._id} className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-5"><div className="min-w-0 flex-1"><p className="font-semibold text-slate-900">{invitation.organization?.org_name ?? "Organization invitation"}</p><p className="mt-1 text-sm text-slate-500">{invitation.role} access · {invitation.email}</p></div><button type="button" disabled={isAccepting} onClick={() => void handleAccept(invitation._id)} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">Accept invitation</button></div>)}</div>{errorMessage && <p role="alert" className="mt-4 text-sm text-rose-700">{errorMessage}</p>}<button className="mt-6 text-sm font-medium text-blue-700 hover:underline" onClick={() => navigate("/organizations")}>Choose another organization</button></main></div>;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <button onClick={() => navigate("/dashboard")} className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900">
          <ArrowLeft size={16} /> Back to workspace
        </button>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">Organization settings</h1>
            <p className="mt-2 text-slate-500">Manage workspace identity, people, and access.</p>
          </div>
          <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600">{organization?.org_name ?? selectedOrganization.org_name}</div>
        </div>

        {notice && <div role="status" className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800"><Check size={16} />{notice}</div>}
        {errorMessage && <p role="alert" className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{errorMessage}</p>}
        {isLoading ? <div className="rounded-xl border bg-white p-8 text-sm text-slate-500">Loading organization settings…</div> : isError ? <div role="alert" className="rounded-xl border bg-white p-8 text-sm text-rose-700">Unable to load this organization. Check that you are a member and try again.</div> : (
          <div className="grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)]">
            <aside className="h-fit rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
              {(["General", "Members", "Project settings"] as SettingsTab[]).map((item) => {
                const Icon = item === "General" ? Building2 : item === "Members" ? UsersRound : FolderKanban;
                return <button key={item} onClick={() => { setTab(item); setErrorMessage(""); setNotice(""); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${tab === item ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-50"}`}><Icon size={17} />{item}</button>;
              })}
            </aside>

            <section className="space-y-5">
              {tab === "General" && <>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Organization name</h2>
                      <p className="mt-1 text-sm text-slate-500">The name shown to everyone in this workspace.</p>
                    </div>
                    {canManage && !isEditingOrgName && <button type="button" onClick={() => { setOrgName(organization?.org_name ?? ""); setIsEditingOrgName(true); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">Edit organization name</button>}
                  </div>
                  {isEditingOrgName ? (
                    <form onSubmit={handleSave} className="mt-5 space-y-4">
                      <label className="block space-y-1.5 text-sm font-medium text-slate-700">Organization name<input value={orgName} onChange={(event) => setOrgName(event.target.value)} maxLength={100} required disabled={isSaving} autoFocus className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50" placeholder="Acme Technologies" /></label>
                      <div className="flex justify-end gap-2">
                        <button type="button" disabled={isSaving} onClick={() => { setOrgName(organization?.org_name ?? ""); setIsEditingOrgName(false); }} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Cancel</button>
                        <button type="submit" disabled={isSaving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{isSaving ? "Saving…" : "Save name"}</button>
                      </div>
                    </form>
                  ) : <p className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-base font-medium text-slate-900">{organization?.org_name ?? selectedOrganization.org_name}</p>}
                  {!canManage && <p className="mt-3 text-sm text-slate-500">Only organization Owners and Admins can edit this name.</p>}
                </div>
              </>}

              {tab === "Members" && <>
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold text-slate-900">Members and invitations</h2><p className="mt-1 text-sm text-slate-500">Add people by email, manage roles, and review pending access.</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{members.length} members</span></div>
                  {canManage && <form onSubmit={handleInvite} className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-[1fr_150px_auto]">
                    <span className="text-sm font-semibold text-slate-800 sm:col-span-3">Add a member</span>
                    <label className="relative"><MailPlus size={16} className="absolute left-3 top-3 text-slate-400" /><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="name@company.com" aria-label="Invite by email" className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500" /></label>
                    <select value={inviteRole} onChange={(event) => setInviteRole(event.target.value as OrganizationRole)} className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm">{roles.filter((role) => role !== "Owner" && (currentRole === "Owner" || role !== "Admin")).map((role) => <option key={role} value={role}>{role}</option>)}</select>
                    <button disabled={isInviting} className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{isInviting ? "Inviting…" : "Invite"}</button>
                  </form>}
                  {!canManage && <p className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Only organization Owners and Admins can invite or remove members. Contact an Owner or Admin if you need someone added.</p>}
                  <div className="mt-5 divide-y divide-slate-100 rounded-lg border border-slate-100">
                    {members.map((membership, index) => {
                      const person = typeof membership.user === "string" ? undefined : membership.user;
                      const memberId = person?._id ?? (typeof membership.user === "string" ? membership.user : "");
                      const isSelf = memberId === currentUserId;
                      return <div key={memberId || index} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">{(person?.name ?? person?.email ?? "?").slice(0, 1).toUpperCase()}</div>
                        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-900">{person?.name ?? "Organization member"}{isSelf && <span className="ml-2 text-xs font-normal text-slate-400">You</span>}</p><p className="truncate text-xs text-slate-500">{person?.email ?? ""}</p></div>
                        <select aria-label={`Role for ${person?.name ?? "member"}`} value={membership.role} disabled={!canManage || isSelf || isUpdatingRole || membership.role === "Owner" && currentRole !== "Owner"} onChange={(event) => void handleRoleChange(memberId, event.target.value as OrganizationRole)} className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm disabled:bg-slate-50">{roles.map((role) => <option key={role} value={role}>{role}</option>)}</select>
                        {canManage && !isSelf && membership.role !== "Owner" && <button type="button" onClick={() => void handleRemove(memberId)} disabled={isRemovingMember} className="rounded-lg px-2.5 py-2 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50">Remove</button>}
                      </div>;
                    })}
                  </div>
                  {canManage && <div className="mt-6"><h3 className="text-sm font-semibold text-slate-900">Pending invitations</h3><div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-100">{(outgoingData?.invitations ?? []).length === 0 ? <p className="px-4 py-4 text-sm text-slate-500">No pending invitations.</p> : outgoingData?.invitations.map((invitation) => <div key={invitation._id} className="flex flex-wrap items-center gap-3 px-4 py-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-800">{invitation.email}</p><p className="text-xs text-slate-500">{invitation.role} · Sent {new Date(invitation.createdAt).toLocaleDateString()}</p></div><button type="button" disabled={isRevoking} onClick={() => void handleRevoke(invitation._id)} className="text-sm font-medium text-rose-600 hover:text-rose-700">Revoke</button></div>)}</div></div>}
                </div>
                {(incomingData?.invitations ?? []).filter((invitation) => invitation.organization).length > 0 && <div className="rounded-xl border border-blue-200 bg-blue-50 p-5"><h3 className="font-semibold text-blue-950">Invitations for you</h3><div className="mt-3 space-y-2">{incomingData?.invitations.filter((invitation) => invitation.organization).map((invitation) => <div key={invitation._id} className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-3"><div className="min-w-0 flex-1"><p className="text-sm font-medium text-slate-900">{invitation.organization?.org_name}</p><p className="text-xs text-slate-500">{invitation.role} access · {invitation.email}</p></div><button type="button" disabled={isAccepting} onClick={() => void handleAccept(invitation._id)} className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700">Accept</button></div>)}</div></div>}
              </>}

              {tab === "Project settings" && <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"><div><h2 className="text-lg font-semibold text-slate-900">Project settings</h2><p className="mt-1 text-sm text-slate-500">Edit project names and issue keys, and view each project ID and owner.</p></div>{!canManage && <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Only organization Owners and Admins can edit project settings.</p>}<div className="mt-5 divide-y divide-slate-100 rounded-lg border border-slate-100">{projects.length === 0 ? <p className="px-4 py-5 text-sm text-slate-500">No projects in this organization yet.</p> : projects.map((project) => {const owner = typeof project.owner === "object" ? project.owner : undefined;const isEditing = editingProjectId === project._id;return <div key={project._id} className="flex flex-col gap-3 px-4 py-4"><div className="flex flex-wrap items-start gap-4"><div className="min-w-0 flex-1">{isEditing ? <form onSubmit={handleProjectSave} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_150px_auto_auto]"><label className="space-y-1 text-xs font-medium text-slate-500">Project name<input value={projectName} onChange={(event) => { const nextName = event.target.value; setProjectName(nextName); setProjectKey(makeProjectKeySuggestion(nextName)); }} aria-label={`Project name for ${project.name}`} required maxLength={100} disabled={isSavingProject} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal text-slate-900 outline-none focus:border-blue-500" /></label><label className="space-y-1 text-xs font-medium text-slate-500">Issue key<input value={projectKey} onChange={(event) => setProjectKey(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8))} aria-label={`Issue key for ${project.name}`} required minLength={2} maxLength={8} disabled={isSavingProject} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono font-normal text-slate-900 outline-none focus:border-blue-500" /></label><button type="submit" disabled={isSavingProject} className="self-end rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{isSavingProject ? "Saving…" : "Save"}</button><button type="button" disabled={isSavingProject} onClick={() => setEditingProjectId("")} className="self-end rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-600">Cancel</button></form> : <><h3 className="font-medium text-slate-900">{project.name}</h3><dl className="mt-2 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-3"><div><dt className="inline text-slate-400">Issue key: </dt><dd className="inline font-mono text-slate-700">{project.key ?? "—"}</dd></div><div><dt className="inline text-slate-400">Project ID: </dt><dd className="inline font-mono text-slate-700">{project._id}</dd></div><div><dt className="inline text-slate-400">Owner: </dt><dd className="inline text-slate-700">{owner?.name ?? owner?.email ?? (typeof project.owner === "string" ? project.owner : "—")}</dd></div></dl></>}</div>{canManage && !isEditing && <button type="button" onClick={() => startProjectEdit(project)} className="self-start rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Edit project</button>}</div></div>;})}</div></div>}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
