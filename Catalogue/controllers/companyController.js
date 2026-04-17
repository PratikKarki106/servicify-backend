import Company from '../models/Company.js';

// ✅ Create new company
export const createCompany = async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'Company name is required'
      });
    }

    const existingCompany = await Company.findOne({ name });
    if (existingCompany) {
      return res.status(400).json({
        success: false,
        message: 'Company already exists'
      });
    }

    const company = new Company({ name });
    await company.save();

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      company
    });

  } catch (error) {
    console.error('CREATE COMPANY ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create company'
    });
  }
};

// ✅ Get all companies
export const getAllCompanies = async (req, res) => {
  try {
    const { search = '' } = req.query;
    
    const filter = { isActive: true };
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const companies = await Company.find(filter)
      .sort({ name: 1 })
      .select('-__v');

    res.json({
      success: true,
      companies
    });

  } catch (error) {
    console.error('GET COMPANIES ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch companies'
    });
  }
};

// ✅ Get company by ID
export const getCompanyById = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findById(id);

    if (!company || !company.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    res.json({
      success: true,
      company
    });

  } catch (error) {
    console.error('GET COMPANY ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch company'
    });
  }
};

// ✅ Update company
export const updateCompany = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    const company = await Company.findById(id);

    if (!company || !company.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    if (name) {
      company.name = name;
    }

    await company.save();

    res.json({
      success: true,
      message: 'Company updated successfully',
      company
    });

  } catch (error) {
    console.error('UPDATE COMPANY ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update company'
    });
  }
};

// ✅ Delete company (soft delete)
export const deleteCompany = async (req, res) => {
  try {
    const { id } = req.params;

    const company = await Company.findById(id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found'
      });
    }

    company.isActive = false;
    await company.save();

    res.json({
      success: true,
      message: 'Company deleted successfully'
    });

  } catch (error) {
    console.error('DELETE COMPANY ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete company'
    });
  }
};
