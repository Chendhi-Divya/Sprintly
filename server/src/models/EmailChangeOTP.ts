import mongoose, { Document, Schema } from "mongoose";

export interface IEmailChangeOTP extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  otp: string;
  otpExpiresAt: Date;
}

const emailChangeOTPSchema = new Schema<IEmailChangeOTP>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    otp: {
      type: String,
      required: true,
    },

    otpExpiresAt: {
      type: Date,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const EmailChangeOTP = mongoose.model<IEmailChangeOTP>(
  "EmailChangeOTP",
  emailChangeOTPSchema
);

export default EmailChangeOTP;