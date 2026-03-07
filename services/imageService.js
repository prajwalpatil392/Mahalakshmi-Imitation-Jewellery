const cloudinary = require('../config/cloudinary');
const fs = require('fs').promises;
const path = require('path');

class ImageService {
  /**
   * Upload product image to Cloudinary
   * @param {Buffer|string} fileData - File buffer or local file path
   * @param {number} productId - Product ID for naming
   * @returns {Promise<Object>} Image details
   */
  async uploadProductImage(fileData, productId) {
    try {
      let uploadOptions = {
        folder: 'mahalakshmi/products',
        public_id: `product_${productId}_${Date.now()}`,
        transformation: [
          { width: 800, height: 800, crop: 'limit', quality: 'auto' },
          { fetch_format: 'auto' }
        ],
        resource_type: 'image'
      };

      let result;

      // Handle Buffer (from multer memory storage) or file path
      if (Buffer.isBuffer(fileData)) {
        // Upload from buffer using upload_stream
        result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            uploadOptions,
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(fileData);
        });
      } else {
        // Upload from file path
        result = await cloudinary.uploader.upload(fileData, uploadOptions);

        // Delete local file after successful upload
        try {
          await fs.unlink(fileData);
        } catch (unlinkError) {
          console.warn('Could not delete local file:', unlinkError.message);
        }
      }

      return {
        url: result.secure_url,
        publicId: result.public_id,
        public_id: result.public_id, // Include both formats for compatibility
        width: result.width,
        height: result.height,
        format: result.format
      };
    } catch (error) {
      console.error('Image upload error:', error);
      throw new Error(`Failed to upload image: ${error.message}`);
    }
  }

  /**
   * Upload multiple product images
   * @param {Array<string>} filePaths - Array of local file paths
   * @param {number} productId - Product ID
   * @returns {Promise<Array>} Array of image details
   */
  async uploadMultipleImages(filePaths, productId) {
    const uploadPromises = filePaths.map((filePath, index) => 
      this.uploadProductImage(filePath, `${productId}_${index}`)
    );
    
    return Promise.all(uploadPromises);
  }

  /**
   * Delete image from Cloudinary
   * @param {string} publicId - Cloudinary public ID
   */
  async deleteImage(publicId) {
    try {
      if (!publicId) return;
      
      const result = await cloudinary.uploader.destroy(publicId);
      
      if (result.result === 'ok') {
        console.log(`Image deleted: ${publicId}`);
      } else {
        console.warn(`Image deletion failed: ${publicId}`, result);
      }
    } catch (error) {
      console.error('Image delete error:', error);
      // Don't throw - deletion failure shouldn't break the flow
    }
  }

  /**
   * Alias for deleteImage (for compatibility)
   */
  async deleteProductImage(publicId) {
    return this.deleteImage(publicId);
  }

  /**
   * Delete multiple images
   * @param {Array<string>} publicIds - Array of Cloudinary public IDs
   */
  async deleteMultipleImages(publicIds) {
    const deletePromises = publicIds
      .filter(id => id)
      .map(id => this.deleteImage(id));
    
    await Promise.allSettled(deletePromises);
  }

  /**
   * Sanitize image URL - fix common URL issues
   * @param {string} url - Image URL
   * @returns {string|null} Sanitized URL
   */
  sanitizeImageUrl(url) {
    if (!url) return null;
    
    // Remove any whitespace
    url = url.trim();
    
    // Fix double protocol issue (https://http://...)
    url = url.replace(/https?:\/\/https?:\/\//gi, 'https://');
    
    // Fix missing protocol separator (https://domain.comhttp://...)
    url = url.replace(/\.com(https?:\/\/)/gi, '.com/');
    url = url.replace(/\.net(https?:\/\/)/gi, '.net/');
    url = url.replace(/\.org(https?:\/\/)/gi, '.org/');
    
    // Ensure HTTPS (security best practice)
    url = url.replace(/^http:\/\//i, 'https://');
    
    // Validate URL format
    try {
      new URL(url);
      return url;
    } catch (error) {
      console.error('Invalid URL:', url);
      return null;
    }
  }

  /**
   * Get optimized image URL with transformations
   * @param {string} url - Original Cloudinary URL
   * @param {Object} options - Transformation options
   * @returns {string} Transformed URL
   */
  getOptimizedUrl(url, options = {}) {
    if (!url || !url.includes('cloudinary.com')) {
      return url;
    }

    const {
      width = 400,
      height = 400,
      crop = 'fill',
      quality = 'auto',
      format = 'auto'
    } = options;

    // Insert transformation parameters into Cloudinary URL
    const transformation = `w_${width},h_${height},c_${crop},q_${quality},f_${format}`;
    
    return url.replace('/upload/', `/upload/${transformation}/`);
  }

  /**
   * Extract Cloudinary public ID from URL
   * @param {string} url - Cloudinary URL
   * @returns {string|null} Public ID
   */
  extractPublicId(url) {
    if (!url || !url.includes('cloudinary.com')) {
      return null;
    }

    try {
      // Extract public ID from URL
      // Example: https://res.cloudinary.com/demo/image/upload/v1234/folder/image.jpg
      const matches = url.match(/\/upload\/(?:v\d+\/)?(.+)\.\w+$/);
      return matches ? matches[1] : null;
    } catch (error) {
      console.error('Error extracting public ID:', error);
      return null;
    }
  }

  /**
   * Validate image file
   * @param {Object} file - Multer file object
   * @returns {boolean} Is valid
   */
  validateImageFile(file) {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5MB

    if (!allowedTypes.includes(file.mimetype)) {
      throw new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
    }

    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 5MB.');
    }

    return true;
  }
}

module.exports = new ImageService();