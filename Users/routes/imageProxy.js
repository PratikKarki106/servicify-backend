import express from 'express';
import axios from 'axios';
import crypto from 'crypto';

const router = express.Router();

// Simple in-memory cache (key: hash of URL, value: { data, contentType, timestamp })
const imageCache = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

router.get('/image-proxy', async (req, res) => {
  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'URL parameter is required' });
  }

  // Validate that it's a valid URL
  try {
    new URL(url);
  } catch {
    return res.status(400).json({ error: 'Invalid URL format' });
  }

  // Only allow Google profile picture URLs
  if (!url.startsWith('https://lh3.googleusercontent.com/') && 
      !url.startsWith('https://lh4.googleusercontent.com/') &&
      !url.startsWith('https://lh5.googleusercontent.com/') &&
      !url.startsWith('https://lh6.googleusercontent.com/')) {
    return res.status(403).json({ error: 'Only Google profile picture URLs are allowed' });
  }

  // Create cache key from URL
  const cacheKey = crypto.createHash('md5').update(url).digest('hex');

  // Check cache
  const cached = imageCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    console.log('[Image Proxy] Serving from cache:', url);
    res.set('Content-Type', cached.contentType);
    res.set('Cache-Control', 'public, max-age=3600'); // Browser cache for 1 hour
    return res.send(cached.data);
  }

  try {
    console.log('[Image Proxy] Fetching external image:', url);
    
    // Fetch image from external URL
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: 10000
    });

    const contentType = response.headers['content-type'] || 'image/jpeg';
    const imageData = Buffer.from(response.data, 'binary');

    // Cache the image
    imageCache.set(cacheKey, {
      data: imageData,
      contentType,
      timestamp: Date.now()
    });

    // Limit cache size to 1000 images
    if (imageCache.size > 1000) {
      const oldestKey = imageCache.keys().next().value;
      imageCache.delete(oldestKey);
    }

    // Send image with cache headers
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=3600'); // Browser cache for 1 hour
    res.send(imageData);

  } catch (error) {
    console.error('[Image Proxy] Error fetching image:', error.message);
    
    // If we have expired cache, serve it as fallback
    if (cached) {
      console.log('[Image Proxy] Serving expired cache as fallback');
      res.set('Content-Type', cached.contentType);
      res.set('Cache-Control', 'public, max-age=3600');
      return res.send(cached.data);
    }

    res.status(500).json({ error: 'Failed to fetch image' });
  }
});

// Cache cleanup: remove expired entries every hour
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of imageCache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      imageCache.delete(key);
    }
  }
  console.log('[Image Proxy] Cache cleanup complete. Current size:', imageCache.size);
}, 60 * 60 * 1000);

export default router;
