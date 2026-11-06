
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [message, setMessage] = useState("Preparing your invitation...");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setMessage("Invalid invitation link. Invitation token is missing.");
      return;
    }

    sessionStorage.setItem("organizationInvitationToken", token);

    setMessage("Invitation received. Please log in to continue.");

    navigate("/login", { replace: true });
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-gray-600">{message}</p>
    </div>
  );
}
