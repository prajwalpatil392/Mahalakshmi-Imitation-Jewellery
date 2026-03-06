const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const imageService = require('../services/imageService');
const { asyncHandler, AppError } = require('../middleware/errorHandler');
const { uploadLimiter } = require('../middleware/rateLimiter');
const logger = require('../utils/logger');

// Configure multer for memory storage (Cloudinary upload)
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
      cb(new AppError('Only image files are allowed!', 400, 'INVALID_FILE_TYPE'));
    }
  }
});

// Upload single product image to Cloudinary
router.post('/product', uploadLimiter, upload.single('image'), asyncHandler(async (req, res) => {
  if (!req.file) {
    throw new AppError('No file uploaded', 400, 'NO_FILE');
  }
  
  const productId = req.body.productId || Date.now();
  
  // Upload to Cloudinary
  const result = await imageService.uploadProductImage(req.file.buffer, productId);
  
  logger.info('Image uploaded to Cloudinary', { productId, url: result.url });
  
  res.json({
    success: true,
    imageUrl: result.url,
    publicId: result.public_id,
    filename: result.public_id
  });
}));

// Upload multiple product images to Cloudinary
router.post('/products', uploadLimiter, upload.array('images', 5), asyncHandler(async (req, res) => {
  if (!req.files || req.files.length === 0) {
    throw new AppError('No files uploaded', 400, 'NO_FILES');
  }
  
  const productId = req.body.productId || Date.now();
  const uploadPromises = req.files.map((file, index) => 
    imageService.uploadProductImage(file.buffer, `${productId}-${index}`)
  );
  
  const results = await Promise.all(uploadPromises);
  
  const imageUrls = results.map(result => ({
    url: result.url,
    publicId: result.public_id,
    filename: result.public_id
  }));
  
  logger.info('Multiple images uploaded to Cloudinary', { productId, count: imageUrls.length });
  
  res.json({
    success: true,
    images: imageUrls
  });
}));

// Delete product image from Cloudinary
router.delete('/product/:publicId', asyncHandler(async (req, res) => {
  const publicId = req.params.publicId;
  
  await imageService.deleteProductImage(publicId);
  
  logger.info('Image deleted from Cloudinary', { publicId });
  
  res.json({ success: true, message: 'Image deleted' });
}));

module.exports = router;
