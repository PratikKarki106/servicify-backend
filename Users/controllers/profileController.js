import User from '../models/User.js';
import multer from 'multer';
import { uploadProfilePicture, getProfilePictureUrl, deleteProfilePicture } from '../../services/minio.js';

// Configure multer for memory storage (for MinIO upload)
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/;
  const extname = allowedTypes.test(file.originalname.toLowerCase().slice(-(file.originalname.lastIndexOf('.')+1)));
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif, webp)'));
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter
});

// Get user profile
export const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Generate profile picture URL
    let profilePictureUrl = null;
    if (user.profilePicture) {
      try {
        // Check if it's an external URL (e.g., Google OAuth profile picture)
        if (user.profilePicture.startsWith('http://') || user.profilePicture.startsWith('https://')) {
          // Proxy through our backend to avoid CORS and rate limiting issues
          const backendUrl = process.env.CLIENT_URL?.replace('5173', '5000') || 'http://localhost:5000';
          const proxyUrl = `${backendUrl}/api/image-proxy?url=${encodeURIComponent(user.profilePicture)}`;
          profilePictureUrl = proxyUrl;
          console.log('[getProfile] Using proxied external profile picture URL');
        } else {
          // It's a MinIO object path, generate pre-signed URL
          profilePictureUrl = await getProfilePictureUrl(user.profilePicture);
          console.log('[getProfile] Generated MinIO profile picture URL:', profilePictureUrl);
        }
      } catch (urlError) {
        console.error('Error generating profile picture URL:', urlError.message);
        // If URL generation fails, still return the profile but without the URL
        profilePictureUrl = null;
      }
    }

    res.json({
      success: true,
      data: {
        ...user.toObject(),
        profilePictureUrl
      }
    });
  } catch (error) {
    console.error('Error fetching profile:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update user profile
export const updateProfile = async (req, res) => {
  try {
    const { name, phone, address } = req.body;
    
    const updateData = {};
    if (name) updateData.name = name;
    if (phone) updateData.phone = phone;
    if (address) updateData.address = address;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({ success: true, data: user, message: 'Profile updated successfully' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Upload profile picture
export const uploadProfilePictureController = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    console.log('📷 Uploading profile picture:', {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      userId: req.user.id
    });

    // Upload to MinIO
    const objectName = await uploadProfilePicture(req.file, req.user.id);

    console.log('✅ Uploaded to MinIO:', objectName);

    // Store object path in database
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePicture: objectName },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Generate pre-signed URL
    const profilePictureUrl = await getProfilePictureUrl(objectName);

    console.log('✅ Profile picture URL generated:', profilePictureUrl);

    res.json({
      success: true,
      data: user,
      message: 'Profile picture uploaded successfully',
      profilePictureUrl
    });
  } catch (error) {
    console.error('❌ Upload profile picture error:', error.message);
    if (error.code === 'ECONNREFUSED') {
      return res.status(500).json({ 
        success: false, 
        message: 'Unable to connect to storage service. Please try again later.' 
      });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete profile picture
export const deleteProfilePictureController = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Delete from MinIO if profile picture exists
    if (user.profilePicture) {
      await deleteProfilePicture(user.profilePicture);
    }

    user.profilePicture = null;
    await user.save();

    res.json({ success: true, message: 'Profile picture deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
