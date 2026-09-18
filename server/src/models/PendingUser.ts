import mongoose, { Document, Schema } from "mongoose";

export interface IPendingUser extends Document {
  name: string;
  email: string;
  password: string;
  otp: string;
  otpExpiresAt: Date;
}

const pendingUserSchema = new Schema<IPendingUser>(
  {
    name: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
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

const PendingUser = mongoose.model<IPendingUser>(
  "PendingUser",
  pendingUserSchema
);

export default PendingUser;