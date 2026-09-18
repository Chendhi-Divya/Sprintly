import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  useVerifyEmailMutation,
  useResendOTPMutation,
} from "../services/authApi";

function VerifyEmail() {

  //Used to move to another page.
  const navigate = useNavigate();

  //Used to get the email sent from the Register page.
  const location = useLocation();

  //Get the email from navigation state.
  const email = location.state?.email;

  //Store the OTP entered by the user.
  const [otp, setOtp] = useState("");

  //Connect this page to the verify email API.
  const [verifyEmail, { isLoading }] = useVerifyEmailMutation();

  //Connect this page to the resend OTP API.
  const [resendOTP] = useResendOTPMutation();

  const handleVerify = async () => {

    try {

      //Send email and OTP to backend.
      const result = await verifyEmail({
        email: email,
        otp: otp,
      }).unwrap();

      console.log(result);

      //After successful verification, go to login page.
      navigate("/login");

    } catch (error) {

      console.log(error);
    }
  };

  const handleResendOTP = async () => {

    try {

      //Request a new OTP from the backend.
      const result = await resendOTP({
        email: email,
      }).unwrap();

      console.log(result);

    } catch (error) {

      console.log(error);
    }
  };

  return (
    <div>

      <h1>Verify Email</h1>

      <p>
        Enter the OTP sent to {email}
      </p>

      <input
        type="text"
        placeholder="Enter OTP"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
      />

      <button
        onClick={handleVerify}
        disabled={isLoading}
      >
        {isLoading ? "Verifying..." : "Verify Email"}
      </button>

      <br />

      <button onClick={handleResendOTP}>
        Resend OTP
      </button>

    </div>
  );
}

export default VerifyEmail;