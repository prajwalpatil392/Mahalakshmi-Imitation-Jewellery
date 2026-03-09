const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage (for Cloudinary upload)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'));
    }
  }
});

// Helper function to upload to Cloudinary
const uploadToCloudinary = (fileBuffer, filename) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'mahalakshmi/products',
        public_id: filename,
        resource_type: 'image'
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

// Upload single product image
router.post('/product', upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const filename = 'product-' + uniqueSuffix;
    
    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, filename);
    
    res.json({
      success: true,
      imageUrl: result.secure_url,
      publicId: result.public_id,
      filename: filename
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload multiple product images
router.post('/products', upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    // Upload all files to Cloudinary
    const uploadPromises = req.files.map(async (file) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = 'product-' + uniqueSuffix;
      const result = await uploadToCloudinary(file.buffer, filename);
      
      return {
        url: result.secure_url,
        publicId: result.public_id,
        filename: filename
      };
    });
    
    const imageUrls = await Promise.all(uploadPromises);
    
    res.json({
      success: true,
      images: imageUrls
    });
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete product image from Cloudinary
router.delete('/product/:publicId', async (req, res) => {
  try {
    const publicId = req.params.publicId;
    
    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(`mahalakshmi/products/${publicId}`);
    
    if (result.result === 'ok') {
      res.json({ success: true, message: 'Image deleted from Cloudinary' });
    } else {
      res.status(404).json({ error: 'Image not found on Cloudinary' });
    }
  } catch (error) {
    console.error('Cloudinary delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
