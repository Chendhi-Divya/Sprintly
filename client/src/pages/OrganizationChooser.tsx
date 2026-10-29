
import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import {
  useGetOrganizationsQuery,
  type Organization,
} from "../services/taskApi";
import { setSelectedOrganization } from "../store/authSlice";
import { Button } from "../components/ui/button";
import { Building2, Plus } from "lucide-react";

export default function OrganizationChooser() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    data,
    isLoading,
    isError,
    refetch,
  } = useGetOrganizationsQuery();

  const organizations = data?.organizations ?? [];

  useEffect(() => {
    if (isLoading || isError) return;

    if (organizations.length === 0) {
      navigate("/organizations/create", { replace: true });
      return;
    }

    if (organizations.length === 1) {
      const organization = organizations[0];

      dispatch(
        setSelectedOrganization({
          ...organization,
          _id: organization._id ?? organization.org_id,
        }),
      );

      navigate("/dashboard", { replace: true });
    }
  }, [organizations, isLoading, isError, dispatch, navigate]);

  const selectOrganization = (organization: Organization) => {
    dispatch(
      setSelectedOrganization({
        ...organization,
        _id: organization._id ?? organization.org_id,
      }),
    );

    navigate("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">
          Loading organizations...
        </p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <p className="mb-4 text-sm text-destructive">
            Could not load your organizations. Please try again.
          </p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      </div>
    );
  }

  if (organizations.length <= 1) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">
          Opening your workspace...
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
            <Building2
              aria-hidden="true"
              className="h-7 w-7 text-primary"
            />
          </div>

          <h1 className="text-2xl font-semibold">
            Choose your workspace
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Select the organization you want to work in.
          </p>
        </div>

        <div className="space-y-3">
          {organizations.map((organization) => (
            <button
              key={organization._id ?? organization.org_id}
              type="button"
              onClick={() => selectOrganization(organization)}
              className="flex w-full items-center gap-4 rounded-lg border bg-card p-4 text-left transition hover:border-primary/40 hover:bg-accent"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Building2
                  aria-hidden="true"
                  className="h-6 w-6 text-primary"
                />
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">
                  {organization.org_name}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  {organization.org_id}
                </p>
              </div>

              <span className="text-sm text-muted-foreground">
                Open
              </span>
            </button>
          ))}
        </div>

        <div className="mt-6 text-center">
          <Button
            variant="outline"
            onClick={() => navigate("/organizations/create")}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create another organization
          </Button>
        </div>
      </div>
    </main>
  );
}
