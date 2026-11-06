
import mongoose, { Schema, Document } from "mongoose";

export interface ITaskAttachment {
  _id?: mongoose.Types.ObjectId;
  fileId: mongoose.Types.ObjectId;
  filename: string;
  originalName: string;
  url: string;
  mimetype: string;
  size: number;
  uploadedAt: Date;
}

interface ITask extends Document {
  taskKey?: string;
  title: string;
  description?: string;
  type: "Epic" | "Story" | "Task" | "Bug";
  status: "To Do" | "In Progress" | "In Review" | "Done";
  priority: "Low" | "Medium" | "High";
  assignee?: mongoose.Types.ObjectId;
  reporter: mongoose.Types.ObjectId;
  project: mongoose.Types.ObjectId;
  organization: string;
  parentTask?: mongoose.Types.ObjectId;
  dueDate?: Date;
  attachments: ITaskAttachment[];
}

const attachmentSchema = new Schema<ITaskAttachment>(
  {
    fileId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    filename: {
      type: String,
      required: true,
    },
    originalName: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    mimetype: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: false }
);

const taskSchema = new Schema<ITask>(
  {
    taskKey: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["Epic", "Story", "Task", "Bug"],
      required: true,
    },
    status: {
      type: String,
      enum: ["To Do", "In Progress", "In Review", "Done"],
      default: "To Do",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Medium",
    },
    assignee: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    reporter: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    project: {
      type: Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
    organization: {
      type: String,
      required: true,
    },
    parentTask: {
      type: Schema.Types.ObjectId,
      ref: "Task",
    },
    dueDate: {
      type: Date,
    },
    attachments: {
      type: [attachmentSchema],
      default: [],
    },
  },
  { timestamps: true }
);

export default mongoose.model<ITask>("Task", taskSchema);
