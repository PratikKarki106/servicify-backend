const express = require('express');
const multer = require('multer');
const minioService = require('..//minio');
const router = express.Router();

// Configure multer (memory storage for buffer)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

// Upload profile picture endpoint
router.post('/upload-profile', upload.single('profileImage'), async (req, res) => {
  try {
    const userId = req.user.id; // From authentication middleware
    const objectName = await minioService.uploadProfilePicture(req.file, userId);
    
    // Save objectName to user's record in database
    await db.users.update(userId, { profileImagePath: objectName });
    
    res.json({ success: true, message: 'Profile picture uploaded' });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get profile picture URL
router.get('/profile-picture/:userId', async (req, res) => {
  try {
    // Get objectName from database
    const user = await db.users.findById(req.params.userId);
    const url = await minioService.getProfilePictureUrl(user.profileImagePath);
    res.json({ url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;