import mongoose from "mongoose";
export const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI); //await-"Wait until MongoDB connection is completed."
        console.log("MongoDB connected");
    }
    catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exit(1); //This stops the Node.js application.
    }
};
//# sourceMappingURL=db.js.map