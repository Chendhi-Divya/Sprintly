import mongoose, { Schema, type Document } from "mongoose";
import type { OrganizationRole } from "./Organization.js";

export interface IOrganizationInvitation extends Document {
  organizationId: string;
  email: string;
  role: OrganizationRole;
  invitedBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const invitationSchema = new Schema<IOrganizationInvitation>(
  {
    organizationId: { type: String, required: true, index: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    role: {
      type: String,
      enum: ["Admin", "Member", "Viewer"],
      default: "Member",
    },
    invitedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  { timestamps: true, versionKey: false }
);

invitationSchema.index({ organizationId: 1, email: 1 }, { unique: true });

export default mongoose.model<IOrganizationInvitation>(
  "OrganizationInvitation",
  invitationSchema
);
