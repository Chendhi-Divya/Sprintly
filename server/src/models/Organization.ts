
import mongoose, { Schema, Document } from "mongoose";

export type OrganizationRole =
  | "Owner"
  | "Admin"
  | "Member"
  | "Viewer";

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

  // Current organization owner.
  admin: mongoose.Types.ObjectId;

  // Original organization creator.
  createdBy?: mongoose.Types.ObjectId;

  members: mongoose.Types.ObjectId[];
  memberships: IOrganizationMembership[];

  createdAt?: Date;
  updatedAt?: Date;
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

    // Current organization owner.
    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // User who originally created the organization.
    // Optional to support existing organization records.
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: undefined,
    },

    // All organization members.
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    // Role assigned to each organization member.
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
