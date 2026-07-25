import mongoose from "mongoose";
import {ensureCustomerIndexes} from "../utils/ensureCustomerIndexes.js";

const connectDB = async () => {
  mongoose.connection.on("connected", () => {
    console.log("✅ Database connected Successfully!");
  });

  await mongoose.connect(`${process.env.MONGODB_URI}`);

  try {
    await ensureCustomerIndexes(mongoose.connection.db);
  } catch (error) {
    console.error("Failed to ensure customer indexes:", error.message);
  }
};

export default connectDB;