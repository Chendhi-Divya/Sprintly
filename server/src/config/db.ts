import mongoose from "mongoose";
export const connectDB = async() => {  //Connect Sprintly's backend to MongoDB.
    try{
        await mongoose.connect(process.env.MONGO_URI!);  //await-"Wait until MongoDB connection is completed."
        console.log("MongoDB connected");
    } catch(error){
        console.error("MongoDB connection failed:", error);
        process.exit(1); //This stops the Node.js application.
    }
};