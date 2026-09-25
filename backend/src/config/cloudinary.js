const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

/**
 * Upload a buffer or stream to Cloudinary
 * @param {Buffer} buffer - File buffer
 * @param {Object} options - Upload options (folder, resource_type, etc.)
 * @returns {Promise<Object>} Cloudinary upload result
 */
const uploadToCloudinary = (buffer, options = {}) => {
  return new Promise((resolve, reject) => {
    const streamifier = require('streamifier');
    const defaultOptions = {
      folder: 'placement_portal/resumes',
      resource_type: 'raw',
      ...options,
    };

    const uploadStream = cloudinary.uploader.upload_stream(
      defaultOptions,
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

/**
 * Delete a file from Cloudinary by public_id
 * @param {string} publicId - Cloudinary public ID
 * @param {string} resourceType - 'image' | 'raw' | 'video'
 */
const deleteFromCloudinary = async (publicId, resourceType = 'raw') => {
  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    return result;
  } catch (error) {
    console.error('Cloudinary delete error:', error.message);
    throw error;
  }
};

module.exports = { cloudinary, uploadToCloudinary, deleteFromCloudinary };
