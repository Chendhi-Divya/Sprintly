
import { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Building2 } from "lucide-react";

import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { setSelectedOrganization } from "../store/authSlice";

export default function CreateOrganization() {
  const [orgName, setOrgName] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");

    const name = orgName.trim();

    if (!name) {
      setErrorMessage("Please enter an organization name.");
      return;
    }

    try {
      setIsLoading(true);
      const result = await fetch("/api/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ org_name: name }),
      });
      const response = await result.json();

      if (!result.ok) {
        throw { data: response };
      }

      dispatch(setSelectedOrganization(response.organization));
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      setErrorMessage(
        error?.data?.message || "Could not create the organization."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-sm">
        <div className="mb-6 text-center">
          <Building2 className="mx-auto mb-3 h-8 w-8" />
          <h1 className="text-2xl font-semibold">Create your organization</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Set up a workspace for your team in Sprintly.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org_name">Organization name</Label>
            <Input
              id="org_name"
              name="org_name"
              placeholder="e.g. Riktam Technologies"
              value={orgName}
              onChange={(event) => setOrgName(event.target.value)}
              maxLength={100}
              required
            />
          </div>

          {errorMessage && (
            <p role="alert" className="text-sm text-red-600">
              {errorMessage}
            </p>
          )}

          <Button className="w-full" type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create organization"}
          </Button>

          <Button
            className="w-full"
            type="button"
            onClick={() => navigate("/organizations")}
          >
            Back to organization selection
          </Button>
        </form>
      </div>
    </main>
  );
}
