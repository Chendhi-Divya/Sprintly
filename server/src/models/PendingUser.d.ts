import mongoose, { Document } from "mongoose";
export interface IPendingUser extends Document {
    name: string;
    email: string;
    password: string;
    otp: string;
    otpExpiresAt: Date;
}
declare const PendingUser: mongoose.Model<IPendingUser, {}, {}, {}, Document<unknown, {}, IPendingUser, {}, mongoose.DefaultSchemaOptions> & IPendingUser & Required<{
    _id: mongoose.Types.ObjectId;
}> & {
    __v: number;
} & {
    id: string;
}, any, IPendingUser>;
export default PendingUser;
//# sourceMappingURL=PendingUser.d.ts.map