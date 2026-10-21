import mongoose, { Schema, Document } from "mongoose";
const userSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    password: {
        type: String,
        required: true,
        select: false,
    },
    isVerified: {
        type: Boolean,
        default: false,
    },
}, {
    timestamps: true,
});
const User = mongoose.model("User", userSchema);
export default User;
//# sourceMappingURL=User.js.map