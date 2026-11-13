
import mongoose, { Schema, type Document } from "mongoose";

export type SprintStatus = "Planning" | "Active" | "Completed";

export interface ISprint extends Document {
  title: string;
  description?: string;
  project: mongoose.Types.ObjectId;
  status: SprintStatus;
  tasks: mongoose.Types.ObjectId[];
  startDate?: Date;
  endDate?: Date;
  createdBy: mongoose.Types.ObjectId;
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sprintSchema = new Schema<ISprint>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    status: {
      type: String,
      enum: ["Planning", "Active", "Completed"],
      default: "Planning",
      required: true,
    },
    tasks: {
      type: [{ type: Schema.Types.ObjectId, ref: "Task" }],
      default: [],
    },
    startDate: Date,
    endDate: Date,
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    startedAt: Date,
    completedAt: Date,
  },
  { timestamps: true, versionKey: false }
);

// Migrate documents created by the earlier sprint prototype on read.
sprintSchema.pre("init", function (doc) {
  const legacyDoc = doc as ISprint & {
    name?: unknown;
    goal?: unknown;
  };

  if (!doc.title && typeof legacyDoc.name === "string") {
    doc.title = legacyDoc.name;
  }

  if (!doc.description && typeof legacyDoc.goal === "string") {
    doc.description = legacyDoc.goal;
  }

  if (!Array.isArray(doc.tasks)) {
    doc.tasks = [];
  }
});

// Only one Active Sprint is allowed per project.
sprintSchema.index(
  { project: 1 },
  {
    unique: true,
    partialFilterExpression: { status: "Active" },
  }
);

export default mongoose.model<ISprint>("Sprint", sprintSchema);
