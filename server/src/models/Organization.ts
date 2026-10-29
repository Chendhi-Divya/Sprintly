
import mongoose, { Schema, Document } from "mongoose";

export type OrganizationRole = "Owner" | "Admin" | "Member" | "Viewer";

export interface IOrganizationMembership {
  user: mongoose.Types.ObjectId;
  role: OrganizationRole;
}

interface IOrganization extends Document {
  org_name: string;
  org_id: string;
  description?: string;
  logoUrl?: string;
  slug?: string;
  admin: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  memberships: IOrganizationMembership[];
}

const membershipSchema = new Schema<IOrganizationMembership>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    role: {
      type: String,
      enum: ["Owner", "Admin", "Member", "Viewer"],
      required: true,
      default: "Member",
    },
  },
  {
    _id: false,
  }
);

const organizationSchema = new Schema<IOrganization>(
  {
    org_name: {
      type: String,
      required: true,
      trim: true,
    },

    org_id: {
      type: String,
      required: true,
      unique: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    logoUrl: {
      type: String,
      trim: true,
      default: "",
    },

    slug: {
      type: String,
      trim: true,
      lowercase: true,
      unique: true,
      sparse: true,
    },

    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Keep this field while existing controllers use it.
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Role assigned to each user in this organisation.
    memberships: {
      type: [membershipSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Organization = mongoose.model<IOrganization>(
  "Organization",
  organizationSchema
);

export default Organization;
