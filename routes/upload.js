const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cloudinary = require('cloudinary').v2;

// Check if Cloudinary is configured
const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

// Configure Cloudinary only if credentials are provided
if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('✅ Cloudinary configured');
} else {
  console.log('⚠️ Cloudinary not configured, using local file storage');
}

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads', 'products');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage based on Cloudinary availability
const storage = isCloudinaryConfigured 
  ? multer.memoryStorage() // Use memory for Cloudinary
  : multer.diskStorage({    // Use disk for local storage
      destination: function (req, file, cb) {
        cb(null, uploadsDir);
      },
      filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
      }
    });

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
    
    if (isCloudinaryConfigured) {
      // Upload to Cloudinary
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const filename = 'product-' + uniqueSuffix;
      const result = await uploadToCloudinary(req.file.buffer, filename);
      
      res.json({
        success: true,
        imageUrl: result.secure_url,
        publicId: result.public_id,
        filename: filename
      });
    } else {
      // Use local file storage
      const imageUrl = `/uploads/products/${req.file.filename}`;
      
      res.json({
        success: true,
        imageUrl: imageUrl,
        filename: req.file.filename
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload multiple product images
router.post('/products', upload.array('images', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    if (isCloudinaryConfigured) {
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
    } else {
      // Use local file storage
      const imageUrls = req.files.map(file => ({
        url: `/uploads/products/${file.filename}`,
        filename: file.filename
      }));
      
      res.json({
        success: true,
        images: imageUrls
      });
    }
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete product image
router.delete('/product/:publicId', async (req, res) => {
  try {
    const publicId = req.params.publicId;
    
    if (isCloudinaryConfigured) {
      // Delete from Cloudinary
      const result = await cloudinary.uploader.destroy(`mahalakshmi/products/${publicId}`);
      
      if (result.result === 'ok') {
        res.json({ success: true, message: 'Image deleted from Cloudinary' });
      } else {
        res.status(404).json({ error: 'Image not found on Cloudinary' });
      }
    } else {
      // Delete from local storage
      const filePath = path.join(uploadsDir, publicId);
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.json({ success: true, message: 'Image deleted from local storage' });
      } else {
        res.status(404).json({ error: 'Image not found' });
      }
    }
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
