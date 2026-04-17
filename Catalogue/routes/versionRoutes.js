import express from 'express';
import {
  createVersion,
  getAllVersions,
  getVersionById,
  updateVersion,
  deleteVersion
} from '../controllers/versionController.js';

const router = express.Router();

router.post('/versions', createVersion);
router.get('/versions', getAllVersions);
router.get('/versions/:id', getVersionById);
router.put('/versions/:id', updateVersion);
router.delete('/versions/:id', deleteVersion);

export default router;
