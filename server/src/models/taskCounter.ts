
import mongoose, { Schema } from "mongoose";

const taskCounterSchema = new Schema({
  _id: String,
  seq: {
    type: Number,
    default: 0,
  },
});

export default mongoose.model("TaskCounter", taskCounterSchema);
