import express from 'express';
import {
  createCompany,
  getAllCompanies,
  getCompanyById,
  updateCompany,
  deleteCompany
} from '../controllers/companyController.js';

const router = express.Router();

router.post('/companies', createCompany);
router.get('/companies', getAllCompanies);
router.get('/companies/:id', getCompanyById);
router.put('/companies/:id', updateCompany);
router.delete('/companies/:id', deleteCompany);

export default router;
