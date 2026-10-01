import mongoose, { Schema, Document } from "mongoose";

export interface IProject extends Document {
  name: string;
  description: string;
  organization: mongoose.Types.ObjectId;
  owner: mongoose.Types.ObjectId;
  members: mongoose.Types.ObjectId[];
  createdAt: Date;
}

const projectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
    },

    organization: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
    },

    owner: {
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
  }
);

export default mongoose.model<IProject>("Project", projectSchema);