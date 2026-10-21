import mongoose, { Document } from "mongoose";
export interface IProject extends Document {
    name: string;
    description?: string;
    organization: string;
    owner: mongoose.Types.ObjectId;
    members: mongoose.Types.ObjectId[];
}
declare const Project: mongoose.Model<IProject, {}, {}, {}, Document<unknown, {}, IProject, {}, mongoose.DefaultSchemaOptions> & IProject & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IProject>;
export default Project;
//# sourceMappingURL=project.d.ts.map