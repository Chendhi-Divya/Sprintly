
import { useEffect, useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Check,
  MailPlus,
  UsersRound,
  X,
  Plus,
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
  useRemoveOrganizationMemberMutation,
  useRevokeOrganizationInvitationMutation,
  useUpdateOrganizationMemberRoleMutation,
  useUpdateOrganizationMutation,
  type OrganizationRole,
  type OrganizationMembership,
  type ProjectUser,
} from "../services/taskApi";

const roles: OrganizationRole[] = [
  "Owner",
  "Admin",
  "Member",
  "Viewer",
];

type SettingsTab = "General" | "Members";

type LocationState = {
  section?: SettingsTab;
};

function getFailureMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null && "data" in error) {
    const data = (error as { data?: unknown }).data;

    if (
      typeof data === "object" &&
      data !== null &&
      "message" in data &&
      typeof data.message === "string"
    ) {
      return data.message;
    }
  }

  return fallback;
}

function getMemberId(
  user: string | ProjectUser | null | undefined
): string {
  if (!user) return "";

  return typeof user === "string" ? user : user._id;
}

export default function OrganizationSettings() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const selectedOrganization = useSelector(
    (state: RootState) => state.auth.selectedOrganization
  );

  const user = useSelector((state: RootState) => state.auth.user);

  const orgId = selectedOrganization?.org_id ?? "";

  const locationState = location.state as LocationState | null;
  const requestedTab = locationState?.section;

  const isFocusedSettingsView = Boolean(requestedTab);

  const [tab, setTab] = useState<SettingsTab>(
    requestedTab ?? "General"
  );

  const [orgName, setOrgName] = useState("");
  const [isEditingOrgName, setIsEditingOrgName] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] =
    useState<OrganizationRole>("Member");

  const [notice, setNotice] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Keep track of members removed successfully.
  // This updates the UI immediately without waiting for the API refetch.
  const [removedMemberIds, setRemovedMemberIds] = useState<Set<string>>(
    new Set()
  );

  // Clear locally removed members when switching organizations.
  useEffect(() => {
    setRemovedMemberIds(new Set());
  }, [orgId]);

  // Fetch selected organization.
  const {
    data,
    isLoading,
    isError,
    error: organizationError,
    refetch: refetchOrganization,
  } = useGetOrganizationByIdQuery(orgId, {
    skip: !orgId,
  });

  const organization = data?.organization;

  // Fetch invitations sent to the current user.
  const {
    data: incomingData,
    isLoading: isLoadingIncoming,
  } = useGetMyOrganizationInvitationsQuery();

  const incomingInvitations = incomingData?.invitations ?? [];

  const currentUserId = user?._id ?? user?.id ?? "";

  // Support both backend response formats:
  // 1. memberships: [{ user, role }]
  // 2. members: [userId or populated user], with admin field.
  const members = useMemo<OrganizationMembership[]>(() => {
    if (!organization) return [];

    const existingMemberships = organization.memberships ?? [];
    const adminId = getMemberId(organization.admin);

    // If the backend already returns memberships, use them.
    if (existingMemberships.length > 0) {
      const normalized = [...existingMemberships];

      // Ensure the organization admin is represented.
      if (
        adminId &&
        !normalized.some(
          (membership) => getMemberId(membership.user) === adminId
        )
      ) {
        normalized.unshift({
          user: organization.admin as string | ProjectUser,
          role: "Owner",
        });
      }

      return normalized;
    }

    // Older backend response: members + admin.
    const oldMembers = organization.members ?? [];

    const normalized = oldMembers.map((member) => ({
      user: member,
      role:
        getMemberId(member) === adminId
          ? ("Owner" as OrganizationRole)
          : ("Member" as OrganizationRole),
    }));

    // Add admin if it was not included in members.
    if (
      organization.admin &&
      !normalized.some(
        (membership) => getMemberId(membership.user) === adminId
      )
    ) {
      normalized.unshift({
        user: organization.admin,
        role: "Owner",
      });
    }

    return normalized;
  }, [organization]);

  // Hide members that have just been successfully removed.
  const visibleMembers = useMemo(
    () =>
      members.filter(
        (membership) =>
          !removedMemberIds.has(getMemberId(membership.user))
      ),
    [members, removedMemberIds]
  );

  const currentMembership = members.find(
    (membership) => getMemberId(membership.user) === currentUserId
  );

  const currentRole = currentMembership?.role;

  const isOrganizationAdmin =
    getMemberId(organization?.admin) === currentUserId;

  const canManage =
    currentRole === "Owner" ||
    currentRole === "Admin" ||
    isOrganizationAdmin;

  // Fetch outgoing invitations only after permissions are known.
  const {
    data: outgoingData,
    isLoading: isLoadingOutgoing,
    isError: isOutgoingError,
  } = useGetOrganizationInvitationsQuery(orgId, {
    skip: !orgId || !canManage,
  });

  const outgoingInvitations = outgoingData?.invitations ?? [];

  const [saveOrganization, { isLoading: isSaving }] =
    useUpdateOrganizationMutation();

  const [createInvitation, { isLoading: isInviting }] =
    useCreateOrganizationInvitationMutation();

  const [updateRole, { isLoading: isUpdatingRole }] =
    useUpdateOrganizationMemberRoleMutation();

  const [removeMember, { isLoading: isRemovingMember }] =
    useRemoveOrganizationMemberMutation();

  const [revokeInvitation, { isLoading: isRevoking }] =
    useRevokeOrganizationInvitationMutation();

  const [acceptInvitation, { isLoading: isAccepting }] =
    useAcceptOrganizationInvitationMutation();

  useEffect(() => {
    if (organization) {
      setOrgName(organization.org_name ?? "");
    }
  }, [organization]);

  useEffect(() => {
    if (requestedTab) {
      setTab(requestedTab);
    }
  }, [requestedTab]);

  useEffect(() => {
    if (!notice) return;

    const timeoutId = window.setTimeout(() => {
      setNotice("");
    }, 3000);

    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  async function handleSave(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedName = orgName.trim();

    if (!trimmedName) {
      setErrorMessage("Organization name is required.");
      return;
    }

    setErrorMessage("");
    setNotice("");

    try {
      const response = await saveOrganization({
        orgId,
        org_name: trimmedName,
      }).unwrap();

      dispatch(
        setSelectedOrganization({
          ...selectedOrganization!,
          _id: response.organization._id,
          org_id: response.organization.org_id,
          org_name: response.organization.org_name,
        })
      );

      setIsEditingOrgName(false);
      setNotice("Organization name updated.");
    } catch (error: unknown) {
      setErrorMessage(
        getFailureMessage(
          error,
          "Could not update the organization name."
        )
      );
    }
  }

  async function handleInvite(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!email.trim()) {
      setErrorMessage("Please enter an email address.");
      return;
    }

    setErrorMessage("");
    setNotice("");

    try {
      const response = await createInvitation({
        orgId,
        email: email.trim(),
        role: inviteRole,
      }).unwrap();

      setEmail("");

      setNotice(
        response.emailSent
          ? "Invitation emailed successfully. It will remain pending until accepted."
          : "Invitation saved, but email delivery failed. Check the server mail settings; the invite is still pending."
      );
    } catch (error: unknown) {
      setErrorMessage(
        getFailureMessage(
          error,
          "Could not create the invitation."
        )
      );
    }
  }

  async function handleAccept(invitationId: string) {
    setErrorMessage("");
    setNotice("");

    try {
      const response = await acceptInvitation(invitationId).unwrap();

      dispatch(
        setSelectedOrganization({
          _id: response.organization._id,
          org_id: response.organization.org_id,
          org_name: response.organization.org_name,
        })
      );

      navigate("/dashboard", { replace: true });
    } catch (error: unknown) {
      setErrorMessage(
        getFailureMessage(
          error,
          "Could not accept the invitation."
        )
      );
    }
  }

  async function handleRoleChange(
    memberId: string,
    role: OrganizationRole
  ) {
    setErrorMessage("");
    setNotice("");

    try {
      await updateRole({
        orgId,
        memberId,
        role,
      }).unwrap();

      await refetchOrganization();

      setNotice("Member role updated.");
    } catch (error: unknown) {
      setErrorMessage(
        getFailureMessage(
          error,
          "Could not update the member role."
        )
      );
    }
  }

  async function handleRemove(memberId: string) {
    if (!memberId) {
      setErrorMessage(
        "Could not identify this member. Please refresh the page."
      );
      return;
    }

    const confirmed = window.confirm(
      "Are you sure you want to remove this member from the organization?"
    );

    if (!confirmed) return;

    setErrorMessage("");
    setNotice("");

    try {
      // 1. Call the DELETE API.
      await removeMember({
        orgId,
        memberId,
      }).unwrap();

      // 2. Hide the member immediately after successful removal.
      setRemovedMemberIds((previousIds) => {
        const updatedIds = new Set(previousIds);
        updatedIds.add(memberId);
        return updatedIds;
      });

      // 3. Show success immediately.
      setNotice("Member removed from the organization.");

      // 4. Refresh organization data in the background.
      // A refresh failure must not show a removal failure because
      // the DELETE API has already succeeded.
      void refetchOrganization().catch((error: unknown) => {
        console.error(
          "Organization refresh after member removal failed:",
          error
        );
      });
    } catch (error: unknown) {
      console.error("Remove organization member failed:", error);

      setErrorMessage(
        getFailureMessage(
          error,
          "Could not remove this member. Please try again."
        )
      );
    }
  }

  async function handleRevoke(invitationId: string) {
    setErrorMessage("");
    setNotice("");

    try {
      await revokeInvitation({
        orgId,
        invitationId,
      }).unwrap();

      setNotice("Invitation revoked.");
    } catch (error: unknown) {
      setErrorMessage(
        getFailureMessage(
          error,
          "Could not revoke the invitation."
        )
      );
    }
  }

  if (!selectedOrganization) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Navbar />

        <main className="mx-auto max-w-3xl px-4 py-12">
          <h1 className="text-3xl font-semibold text-slate-950">
            Organization invitations
          </h1>

          <p className="mt-2 text-slate-500">
            Accept an invitation to join your team's workspace.
          </p>

          <div className="mt-6 space-y-3">
            {isLoadingIncoming ? (
              <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">
                Loading invitations…
              </div>
            ) : incomingInvitations.length === 0 ? (
              <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">
                No pending invitations for your account.
              </div>
            ) : (
              incomingInvitations.map((invitation) => (
                <div
                  key={invitation._id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border bg-white p-5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-slate-900">
                      {invitation.organization?.org_name ??
                        "Organization invitation"}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {invitation.role} access · {invitation.email}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isAccepting}
                    onClick={() => void handleAccept(invitation._id)}
                    className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isAccepting ? "Accepting…" : "Accept invitation"}
                  </button>
                </div>
              ))
            )}
          </div>

          {errorMessage && (
            <p role="alert" className="mt-4 text-sm text-rose-700">
              {errorMessage}
            </p>
          )}

          <button
            type="button"
            className="mt-6 text-sm font-medium text-blue-700 hover:underline"
            onClick={() => navigate("/organizations")}
          >
            Choose another organization
          </button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to workspace
        </button>

        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-950">
              Organization settings
            </h1>

            <p className="mt-2 text-slate-500">
              Manage workspace identity and access.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600">
              {organization?.org_name ?? selectedOrganization.org_name}
            </div>

            {isFocusedSettingsView && (
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                aria-label="Close settings"
                title="Close settings"
                className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>

        {notice && (
          <div
            role="status"
            className="fixed right-5 top-20 z-[70] flex max-w-[calc(100vw-2.5rem)] items-center gap-3 rounded-xl border border-emerald-200 bg-white px-4 py-3 text-sm font-medium text-emerald-800 shadow-lg"
          >
            <Check size={17} className="shrink-0" />
            {notice}

            <button
              type="button"
              onClick={() => setNotice("")}
              aria-label="Dismiss notification"
              className="ml-1 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {errorMessage && (
          <p
            role="alert"
            className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          >
            {errorMessage}
          </p>
        )}

        {isLoading ? (
          <div className="rounded-xl border bg-white p-8 text-sm text-slate-500">
            Loading organization settings…
          </div>
        ) : isError ? (
          <div
            role="alert"
            className="rounded-xl border bg-white p-8 text-sm text-rose-700"
          >
            Unable to load this organization. Check that you are a member and try again.

            <p className="mt-2 text-xs text-rose-600">
              {getFailureMessage(
                organizationError,
                "Please check the organization API response."
              )}
            </p>
          </div>
        ) : (
          <div
            className={`grid gap-6 ${
              isFocusedSettingsView
                ? "grid-cols-1"
                : "lg:grid-cols-[230px_minmax(0,1fr)]"
            }`}
          >
            {!isFocusedSettingsView && (
              <aside className="h-fit rounded-xl border border-slate-200 bg-white p-2 shadow-sm">
                {(["General", "Members"] as SettingsTab[]).map((item) => {
                  const Icon =
                    item === "General" ? Building2 : UsersRound;

                  return (
                    <button
                      type="button"
                      key={item}
                      onClick={() => {
                        setTab(item);
                        setErrorMessage("");
                        setNotice("");
                      }}
                      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition ${
                        tab === item
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      <Icon size={17} />
                      {item}
                    </button>
                  );
                })}
              </aside>
            )}

            <section className="space-y-5">
              {/* GENERAL SETTINGS */}
              {tab === "General" && (
                <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        Organization name
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        The name shown to everyone in this workspace.
                      </p>
                    </div>

                    {canManage && (
                      <div className="flex flex-wrap items-center gap-2">
                        {!isEditingOrgName && (
                          <button
                            type="button"
                            onClick={() => {
                              setOrgName(organization?.org_name ?? "");
                              setIsEditingOrgName(true);
                            }}
                            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Edit organization name
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => navigate("/projects/create")}
                          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                          <Plus size={17} />
                          Create New Project
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditingOrgName ? (
                    <form
                      onSubmit={handleSave}
                      className="mt-5 space-y-4"
                    >
                      <label className="block space-y-1.5 text-sm font-medium text-slate-700">
                        Organization name

                        <input
                          value={orgName}
                          onChange={(event) =>
                            setOrgName(event.target.value)
                          }
                          maxLength={100}
                          required
                          disabled={isSaving}
                          autoFocus
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50"
                          placeholder="Acme Technologies"
                        />
                      </label>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => {
                            setOrgName(organization?.org_name ?? "");
                            setIsEditingOrgName(false);
                          }}
                          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Cancel
                        </button>

                        <button
                          type="submit"
                          disabled={isSaving}
                          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isSaving ? "Saving…" : "Save"}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p className="mt-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-base font-medium text-slate-900">
                      {organization?.org_name ?? selectedOrganization.org_name}
                    </p>
                  )}

                  {!canManage && (
                    <p className="mt-3 text-sm text-slate-500">
                      Only organization Owners and Admins can edit this name.
                    </p>
                  )}
                </div>
              )}

              {/* MEMBERS AND INVITATIONS */}
              {tab === "Members" && (
                <>
                  <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="text-lg font-semibold text-slate-900">
                          Members and invitations
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          Add people by email, manage roles, and review pending access.
                        </p>
                      </div>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {visibleMembers.length} members
                      </span>
                    </div>

                    {canManage && (
                      <form
                        onSubmit={handleInvite}
                        className="mt-5 grid gap-3 rounded-lg bg-slate-50 p-4 sm:grid-cols-[1fr_150px_auto]"
                      >
                        <span className="text-sm font-semibold text-slate-800 sm:col-span-3">
                          Add a member
                        </span>

                        <label className="relative">
                          <MailPlus
                            size={16}
                            className="absolute left-3 top-3 text-slate-400"
                          />

                          <input
                            type="email"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            required
                            placeholder="name@company.com"
                            aria-label="Invite by email"
                            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-blue-500"
                          />
                        </label>

                        <select
                          value={inviteRole}
                          onChange={(event) =>
                            setInviteRole(
                              event.target.value as OrganizationRole
                            )
                          }
                          className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm"
                        >
                          {roles
                            .filter(
                              (role) =>
                                role !== "Owner" &&
                                (currentRole === "Owner" ||
                                  isOrganizationAdmin ||
                                  role !== "Admin")
                            )
                            .map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                        </select>

                        <button
                          type="submit"
                          disabled={isInviting}
                          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                          {isInviting ? "Inviting…" : "Invite"}
                        </button>
                      </form>
                    )}

                    {!canManage && (
                      <p className="mt-5 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                        Only organization Owners and Admins can invite or remove members. Contact an Owner or Admin if you need someone added.
                      </p>
                    )}

                    <div className="mt-5 divide-y divide-slate-100 rounded-lg border border-slate-100">
                      {visibleMembers.length === 0 ? (
                        <p className="px-4 py-5 text-sm text-slate-500">
                          No members were returned by the organization API.
                        </p>
                      ) : (
                        visibleMembers.map((membership, index) => {
                          const person =
                            typeof membership.user === "string"
                              ? undefined
                              : membership.user;

                          const memberId = getMemberId(membership.user);
                          const isSelf = memberId === currentUserId;

                          return (
                            <div
                              key={memberId || index}
                              className="flex flex-wrap items-center gap-3 px-4 py-3.5"
                            >
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-sm font-semibold text-blue-700">
                                {(person?.name ?? person?.email ?? "?")
                                  .slice(0, 1)
                                  .toUpperCase()}
                              </div>

                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-900">
                                  {person?.name ?? "Organization member"}

                                  {isSelf && (
                                    <span className="ml-2 text-xs font-normal text-slate-400">
                                      You
                                    </span>
                                  )}
                                </p>

                                <p className="truncate text-xs text-slate-500">
                                  {person?.email ?? memberId}
                                </p>
                              </div>

                              <select
                                aria-label={`Role for ${person?.name ?? "member"}`}
                                value={membership.role}
                                disabled={
                                  !canManage ||
                                  isSelf ||
                                  isUpdatingRole ||
                                  (membership.role === "Owner" &&
                                    currentRole !== "Owner" &&
                                    !isOrganizationAdmin)
                                }
                                onChange={(event) =>
                                  void handleRoleChange(
                                    memberId,
                                    event.target.value as OrganizationRole
                                  )
                                }
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-sm disabled:bg-slate-50"
                              >
                                {roles
                                  .filter(
                                    (role) =>
                                      role !== "Owner" ||
                                      currentRole === "Owner" ||
                                      isOrganizationAdmin
                                  )
                                  .map((role) => (
                                    <option key={role} value={role}>
                                      {role}
                                    </option>
                                  ))}
                              </select>

                              {canManage &&
                                !isSelf &&
                                membership.role !== "Owner" && (
                                  <button
                                    type="button"
                                    onClick={() => void handleRemove(memberId)}
                                    disabled={isRemovingMember}
                                    className="rounded-lg px-2.5 py-2 text-sm text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                                  >
                                    {isRemovingMember ? "Removing…" : "Remove"}
                                  </button>
                                )}
                            </div>
                          );
                        })
                      )}
                    </div>

                    {canManage && (
                      <div className="mt-6">
                        <h3 className="text-sm font-semibold text-slate-900">
                          Pending invitations
                        </h3>

                        <div className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-100">
                          {isLoadingOutgoing ? (
                            <p className="px-4 py-4 text-sm text-slate-500">
                              Loading pending invitations…
                            </p>
                          ) : isOutgoingError ? (
                            <p className="px-4 py-4 text-sm text-rose-600">
                              Could not load pending invitations. Check the invitations API.
                            </p>
                          ) : outgoingInvitations.length === 0 ? (
                            <p className="px-4 py-4 text-sm text-slate-500">
                              No pending invitations.
                            </p>
                          ) : (
                            outgoingInvitations.map((invitation) => (
                              <div
                                key={invitation._id}
                                className="flex flex-wrap items-center gap-3 px-4 py-3"
                              >
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-medium text-slate-800">
                                    {invitation.email}
                                  </p>

                                  <p className="text-xs text-slate-500">
                                    {invitation.role} · Sent{" "}
                                    {new Date(
                                      invitation.createdAt
                                    ).toLocaleDateString()}
                                  </p>
                                </div>

                                <button
                                  type="button"
                                  disabled={isRevoking}
                                  onClick={() =>
                                    void handleRevoke(invitation._id)
                                  }
                                  className="text-sm font-medium text-rose-600 hover:text-rose-700 disabled:opacity-50"
                                >
                                  Revoke
                                </button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {incomingInvitations.some(
                    (invitation) => Boolean(invitation.organization)
                  ) && (
                    <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
                      <h3 className="font-semibold text-blue-950">
                        Invitations for you
                      </h3>

                      <div className="mt-3 space-y-2">
                        {incomingInvitations
                          .filter((invitation) => invitation.organization)
                          .map((invitation) => (
                            <div
                              key={invitation._id}
                              className="flex flex-wrap items-center gap-3 rounded-lg bg-white p-3"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium text-slate-900">
                                  {invitation.organization?.org_name}
                                </p>

                                <p className="text-xs text-slate-500">
                                  {invitation.role} access · {invitation.email}
                                </p>
                              </div>

                              <button
                                type="button"
                                disabled={isAccepting}
                                onClick={() => void handleAccept(invitation._id)}
                                className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                              >
                                Accept
                              </button>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
