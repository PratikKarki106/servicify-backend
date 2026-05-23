import express from 'express';
import {
  createCC,
  getAllCCs,
  getCCById,
  updateCC,
  deleteCC
} from '../controllers/ccController.js';

const router = express.Router();

router.post('/ccs', createCC);
router.get('/ccs', getAllCCs);
router.get('/ccs/:id', getCCById);
router.put('/ccs/:id', updateCC);
router.delete('/ccs/:id', deleteCC);

export default router;
