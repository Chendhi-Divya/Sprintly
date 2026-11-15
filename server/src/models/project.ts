
import mongoose, { Schema, Document } from "mongoose";

export interface IProject extends Document {
  name: string;
  key: string;
  description?: string;
  organization: string;
  owner: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
}

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    key: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 8,
    },

    description: {
      type: String,
      trim: true,
    },

    organization: {
      type: String,
      required: true,
    },

    owner: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: {
      type: [
        {
          type: Schema.Types.ObjectId,
          ref: "User",
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Project keys must be unique only within the same organization.
projectSchema.index(
  { organization: 1, key: 1 },
  { unique: true }
);

const Project = mongoose.model<IProject>("Project", projectSchema);

export default Project;
