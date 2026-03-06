const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: "dcgfc7bse",
  api_key: "184371647477156",
  api_secret: process.env.a5_BksCjjOHbiy_jK2XyH00K2FU
});

module.exports = cloudinary;