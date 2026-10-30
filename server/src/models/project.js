
import mongoose, { Schema } from "mongoose";

const projectSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      trim: true,
      default: "",
    },

    organization: {
      type: String,
      required: true,
    },

    // Unique identifier used for issue IDs, e.g. SDEMO-1.
    key: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      minlength: 2,
      maxlength: 8,
      match: /^[A-Z][A-Z0-9]*$/,
      unique: true,
    },

    // The next issue number to allocate for this project.
    nextIssueNumber: {
      type: Number,
      default: 1,
      min: 1,
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
    versionKey: false,
  }
);

const Project = mongoose.model("Project", projectSchema);

export default Project;
