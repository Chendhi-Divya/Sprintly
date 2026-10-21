import mongoose, { Document } from "mongoose";
interface IOrganization extends Document {
    org_name: string;
    org_id: string;
    admin: mongoose.Types.ObjectId;
    members: mongoose.Types.ObjectId[];
}
declare const Organization: mongoose.Model<IOrganization, {}, {}, {}, Document<unknown, {}, IOrganization, {}, mongoose.DefaultSchemaOptions> & IOrganization & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IOrganization>;
export default Organization;
//# sourceMappingURL=Organization.d.ts.map