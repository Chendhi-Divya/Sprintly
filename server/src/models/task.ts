import mongoose, { Schema, Document } from "mongoose";

interface ITask extends Document {
  title: string;
  description?: string;

  type: "Epic" | "Story" | "Task" | "Bug" | "Sub-task";

  status: "To Do" | "In Progress" | "Done";

  priority: "Low" | "Medium" | "High" | "Urgent";

  assignee?: mongoose.Types.ObjectId;
  reporter: mongoose.Types.ObjectId;

  project: mongoose.Types.ObjectId;
  organization: string;

  parentTask?: mongoose.Types.ObjectId;

  dueDate?: Date;
}

const taskSchema = new Schema<ITask>(
  {
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
      enum: ["Epic", "Story", "Task", "Bug", "Sub-task"],
      required: true,
    },

    status: {
      type: String,
      enum: ["To Do", "In Progress", "Done"],
      default: "To Do",
    },

    priority: {
      type: String,
      enum: ["Low", "Medium", "High", "Urgent"],
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
  },
  {
    timestamps: true,

  }
);

const Task = mongoose.model<ITask>("Task", taskSchema);

export default Task;