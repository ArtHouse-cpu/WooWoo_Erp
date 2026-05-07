import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

export const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;
    
    // Check if CLOUDINARY_URL is available
    if (!process.env.CLOUDINARY_URL) {
      console.log("CLOUDINARY_URL not found in env, skipping cloudinary upload.");
      return null;
    }

    // upload the file on cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // delete local file after successful upload
    try {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } catch (err) {
      console.error("Error deleting local file after cloudinary upload:", err);
    }
    return response.secure_url;
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    // remove the locally saved temporary file as the upload operation failed
    try {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } catch (err) {
      console.error("Error deleting local file after cloudinary failure:", err);
    }
    return null;
  }
};
