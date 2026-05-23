import express from 'express';
import {
  createCatalogItem,
  getAllCatalogItems,
  getCatalogItemById,
  updateCatalogItem,
  deleteCatalogItem,
  getUserCatalogItems,
  uploadCatalogImage,
  catalogImageUpload
} from '../controllers/catalogController.js';
import { authenticateJWT } from '../../Users/middleware/authenticateJWT.js';
import { authorizeRoles } from '../../Users/middleware/authorizedRoles.js';

const router = express.Router();

// User routes (static paths before /catalog/:id)
router.get('/catalog/user/items', getUserCatalogItems);

// Admin: MinIO image upload
router.post(
  '/catalog/upload-image',
  authenticateJWT,
  authorizeRoles('admin'),
  catalogImageUpload.single('image'),
  uploadCatalogImage
);

// Admin routes
router.post('/catalog', createCatalogItem);
router.get('/catalog', getAllCatalogItems);
router.get('/catalog/:id', getCatalogItemById);
router.put('/catalog/:id', updateCatalogItem);
router.delete('/catalog/:id', deleteCatalogItem);

export default router;