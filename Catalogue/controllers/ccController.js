import CC from '../models/CC.js';

// ✅ Create new CC
export const createCC = async (req, res) => {
  try {
    const { name, companyId, productId, versionId } = req.body;

    if (!name || !companyId || !productId || !versionId) {
      return res.status(400).json({
        success: false,
        message: 'CC name, companyId, productId, and versionId are required'
      });
    }

    const cc = new CC({ name, companyId, productId, versionId });
    await cc.save();

    res.status(201).json({
      success: true,
      message: 'CC created successfully',
      cc
    });

  } catch (error) {
    console.error('CREATE CC ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create CC'
    });
  }
};

// ✅ Get all CCs
export const getAllCCs = async (req, res) => {
  try {
    const { companyId, productId, versionId, search = '' } = req.query;
    
    const filter = { isActive: true };
    if (companyId) {
      filter.companyId = companyId;
    }
    if (productId) {
      filter.productId = productId;
    }
    if (versionId) {
      filter.versionId = versionId;
    }
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const ccs = await CC.find(filter)
      .populate('companyId', 'name')
      .populate('productId', 'name')
      .populate('versionId', 'name')
      .sort({ name: 1 })
      .select('-__v');

    res.json({
      success: true,
      ccs
    });

  } catch (error) {
    console.error('GET CCS ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch CCs'
    });
  }
};

// ✅ Get CC by ID
export const getCCById = async (req, res) => {
  try {
    const { id } = req.params;

    const cc = await CC.findById(id)
      .populate('companyId', 'name')
      .populate('productId', 'name')
      .populate('versionId', 'name');

    if (!cc || !cc.isActive) {
      return res.status(404).json({
        success: false,
        message: 'CC not found'
      });
    }

    res.json({
      success: true,
      cc
    });

  } catch (error) {
    console.error('GET CC ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch CC'
    });
  }
};

// ✅ Update CC
export const updateCC = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, companyId, productId, versionId } = req.body;

    const cc = await CC.findById(id);

    if (!cc || !cc.isActive) {
      return res.status(404).json({
        success: false,
        message: 'CC not found'
      });
    }

    if (name) cc.name = name;
    if (companyId) cc.companyId = companyId;
    if (productId) cc.productId = productId;
    if (versionId) cc.versionId = versionId;

    await cc.save();

    res.json({
      success: true,
      message: 'CC updated successfully',
      cc
    });

  } catch (error) {
    console.error('UPDATE CC ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update CC'
    });
  }
};

// ✅ Delete CC (soft delete)
export const deleteCC = async (req, res) => {
  try {
    const { id } = req.params;

    const cc = await CC.findById(id);

    if (!cc) {
      return res.status(404).json({
        success: false,
        message: 'CC not found'
      });
    }

    cc.isActive = false;
    await cc.save();

    res.json({
      success: true,
      message: 'CC deleted successfully'
    });

  } catch (error) {
    console.error('DELETE CC ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete CC'
    });
  }
};
