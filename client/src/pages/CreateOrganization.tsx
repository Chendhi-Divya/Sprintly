
import { useState } from "react";
import type { FormEvent } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";

import { setSelectedOrganization } from "../store/authSlice";
import { useCreateOrganizationMutation } from "../services/taskApi";

export default function CreateOrganization() {
  const [orgName, setOrgName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [createOrganization, { isLoading }] =
    useCreateOrganizationMutation();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    const organizationName = orgName.trim();

    if (!organizationName) {
      setErrorMessage("Please enter an organization name.");
      return;
    }

    try {
      // STEP 1: Create only the organization.
      const response = await createOrganization({
        org_name: organizationName,
      }).unwrap();

      // STEP 2: Save the created organization in Redux.
      dispatch(
        setSelectedOrganization(response.organization)
      );

      // STEP 3: Navigate to the separate project creation page.
      console.log("Organization created:", response.organization);
console.log("Navigating to project creation page");

navigate("/projects/create", { replace: true });

console.log("Current URL:", window.location.pathname);

    } catch (error: unknown) {
      const apiError = error as {
        data?: { message?: string };
      };

      setErrorMessage(
        apiError?.data?.message ||
          "Could not create the organization. Please try again."
      );
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6 text-center">
          <Building2 className="mx-auto mb-3 h-8 w-8" />

          <h1 className="text-2xl font-semibold">
            Create your organization
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Create an organization to start managing your
            projects and collaborating with your team.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="org_name">
              Organization name
            </Label>

            <Input
              id="org_name"
              name="org_name"
              placeholder="enter organization name"
              value={orgName}
              onChange={(event) =>
                setOrgName(event.target.value)
              }
              maxLength={100}
              required
              disabled={isLoading}
            />
          </div>

          {errorMessage && (
            <p
              role="alert"
              className="rounded-md bg-destructive/10 p-3 text-sm text-destructive"
            >
              {errorMessage}
            </p>
          )}

          <Button
            className="w-full"
            type="submit"
            disabled={isLoading}
          >
            {isLoading
              ? "Creating organization..."
              : "Create organization"}
          </Button>
        </form>
      </div>
    </main>
  );
}
