import mongoose, { Schema, type Document } from "mongoose";

export interface IChangePasswordOTP extends Document {
  userId: mongoose.Types.ObjectId;
  otp: string;
  newPassword: string;
  otpExpiresAt: Date;
}

const changePasswordOTPSchema = new Schema<IChangePasswordOTP>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    otp: {
      type: String,
      required: true,
    },
    newPassword: {
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

const ChangePasswordOTP = mongoose.model<IChangePasswordOTP>(
  "ChangePasswordOTP",
  changePasswordOTPSchema
);

export default ChangePasswordOTP;