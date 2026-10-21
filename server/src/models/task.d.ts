import mongoose, { Document } from "mongoose";
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
declare const Task: mongoose.Model<ITask, {}, {}, {}, Document<unknown, {}, ITask, {}, mongoose.DefaultSchemaOptions> & ITask & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, ITask>;
export default Task;
//# sourceMappingURL=task.d.ts.map