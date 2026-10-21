import mongoose, { Schema, Document } from "mongoose";
const organizationSchema = new Schema({
    org_name: {
        type: String,
        required: true,
        trim: true,
    },
    org_id: {
        type: String,
        required: true,
        unique: true,
    },
    admin: {
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
}, {
    timestamps: true,
    versionKey: false,
});
const Organization = mongoose.model("Organization", organizationSchema);
export default Organization;
//# sourceMappingURL=Organization.js.map