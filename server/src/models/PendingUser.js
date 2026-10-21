import mongoose, { Document, Schema } from "mongoose";
const pendingUserSchema = new Schema({
    name: {
        type: String,
        required: true,
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
    },
    otp: {
        type: String,
        required: true,
    },
    otpExpiresAt: {
        type: Date,
        required: true,
    },
}, {
    timestamps: true,
});
const PendingUser = mongoose.model("PendingUser", pendingUserSchema);
export default PendingUser;
//# sourceMappingURL=PendingUser.js.map