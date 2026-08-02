require("dotenv").config();
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

cloudinary.uploader
  .upload_stream({ resource_type: "raw", folder: "documents" }, (err, result) => {
    if (err) {
      console.error("FAILED:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    } else {
      console.log("SUCCESS:", result.secure_url);
    }
  })
  .end(Buffer.from("hello world"));