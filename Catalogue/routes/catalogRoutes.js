import express from 'express';
import {
  createCatalogItem,
  getAllCatalogItems,
  getCatalogItemById,
  updateCatalogItem,
  deleteCatalogItem,
  getUserCatalogItems
} from '../controllers/catalogController.js';

const router = express.Router();

// Admin routes
router.post('/catalog', createCatalogItem);
router.get('/catalog', getAllCatalogItems);
router.get('/catalog/:id', getCatalogItemById);
router.put('/catalog/:id', updateCatalogItem);
router.delete('/catalog/:id', deleteCatalogItem);

// User routes
router.get('/catalog/user/items', getUserCatalogItems);

export default router;