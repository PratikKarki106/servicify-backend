import Version from '../models/Version.js';

// ✅ Create new version
export const createVersion = async (req, res) => {
  try {
    const { name, companyId, productId } = req.body;

    if (!name || !companyId || !productId) {
      return res.status(400).json({
        success: false,
        message: 'Version name, companyId, and productId are required'
      });
    }

    const version = new Version({ name, companyId, productId });
    await version.save();

    res.status(201).json({
      success: true,
      message: 'Version created successfully',
      version
    });

  } catch (error) {
    console.error('CREATE VERSION ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create version'
    });
  }
};

// ✅ Get all versions
export const getAllVersions = async (req, res) => {
  try {
    const { companyId, productId, search = '' } = req.query;
    
    const filter = { isActive: true };
    if (companyId) {
      filter.companyId = companyId;
    }
    if (productId) {
      filter.productId = productId;
    }
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const versions = await Version.find(filter)
      .populate('companyId', 'name')
      .populate('productId', 'name')
      .sort({ name: 1 })
      .select('-__v');

    res.json({
      success: true,
      versions
    });

  } catch (error) {
    console.error('GET VERSIONS ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch versions'
    });
  }
};

// ✅ Get version by ID
export const getVersionById = async (req, res) => {
  try {
    const { id } = req.params;

    const version = await Version.findById(id)
      .populate('companyId', 'name')
      .populate('productId', 'name');

    if (!version || !version.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Version not found'
      });
    }

    res.json({
      success: true,
      version
    });

  } catch (error) {
    console.error('GET VERSION ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch version'
    });
  }
};

// ✅ Update version
export const updateVersion = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, companyId, productId } = req.body;

    const version = await Version.findById(id);

    if (!version || !version.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Version not found'
      });
    }

    if (name) version.name = name;
    if (companyId) version.companyId = companyId;
    if (productId) version.productId = productId;

    await version.save();

    res.json({
      success: true,
      message: 'Version updated successfully',
      version
    });

  } catch (error) {
    console.error('UPDATE VERSION ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update version'
    });
  }
};

// ✅ Delete version (soft delete)
export const deleteVersion = async (req, res) => {
  try {
    const { id } = req.params;

    const version = await Version.findById(id);

    if (!version) {
      return res.status(404).json({
        success: false,
        message: 'Version not found'
      });
    }

    version.isActive = false;
    await version.save();

    res.json({
      success: true,
      message: 'Version deleted successfully'
    });

  } catch (error) {
    console.error('DELETE VERSION ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete version'
    });
  }
};
