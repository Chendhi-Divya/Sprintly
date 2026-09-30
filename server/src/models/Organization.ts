import mongoose, { Schema, Document } from "mongoose";

interface IOrganization extends Document {
  org_name: string;
  org_id: string;
  admin: mongoose.Types.ObjectId;
  members:mongoose.Types.ObjectId[];
}

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

    admin: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
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