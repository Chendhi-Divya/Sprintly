
import mongoose, { Schema, Document } from "mongoose";

export interface IPendingEmailChange extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  otp: string;
  otpExpiresAt: Date;
}

const pendingEmailChangeSchema = new Schema<IPendingEmailChange>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
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
  { timestamps: true }
);

// One pending email change per user.
pendingEmailChangeSchema.index({ userId: 1 }, { unique: true });

const PendingEmailChange = mongoose.model<IPendingEmailChange>(
  "PendingEmailChange",
  pendingEmailChangeSchema
);

export default PendingEmailChange;
