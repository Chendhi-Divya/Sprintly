import mongoose, { Schema, Document } from "mongoose";
const projectSchema = new Schema({
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
        type: String,
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
}, {
    timestamps: true,
    versionKey: false,
});
const Project = mongoose.model("Project", projectSchema);
export default Project;
//# sourceMappingURL=project.js.map