const cloudinary = require("cloudinary").v2;

// Parse CLOUDINARY_URL or use individual env vars
if (process.env.CLOUDINARY_URL) {
  // Cloudinary URL format: cloudinary://api_key:api_secret@cloud_name
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL
  });
} else {
  // Use individual environment variables
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dcgfc7bse",
    api_key: process.env.CLOUDINARY_API_KEY || "184371647477156",
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
}

// Validate configuration
const config = cloudinary.config();
if (!config.api_secret) {
  console.error('❌ CRITICAL: Cloudinary api_secret is missing!');
  console.error('Set CLOUDINARY_URL or CLOUDINARY_API_SECRET environment variable');
}

module.exports = cloudinary;