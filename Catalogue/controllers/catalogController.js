import Catalog from '../models/Catalog.js';

// ✅ Create new catalog item
export const createCatalogItem = async (req, res) => {
  try {
    const { 
      itemName, 
      description, 
      itemPrice, 
      serviceCharge, 
      estimatedTime, 
    } = req.body;

    // Validate required fields
    if (!itemName || !itemPrice || !serviceCharge || !estimatedTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const catalogItem = new Catalog({
      itemName,
      description,
      itemPrice,
      serviceCharge,
      estimatedTime,
    });

    await catalogItem.save();

    res.status(201).json({
      success: true,
      message: 'Catalog item created successfully',
      catalogItem
    });

  } catch (error) {
    console.error('CREATE CATALOG ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create catalog item'
    });
  }
};

// ✅ Get all catalog items
export const getAllCatalogItems = async (req, res) => {
  try {
    const { 
      sortBy = 'createdAt', 
      sortOrder = 'desc',
      page = 1,
      limit = 20
    } = req.query;

    const filter = { isActive: true };
    

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const catalogItems = await Catalog.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const total = await Catalog.countDocuments(filter);

    res.json({
      success: true,
      catalogItems,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('GET CATALOG ITEMS ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch catalog items'
    });
  }
};

// ✅ Get catalog item by ID
export const getCatalogItemById = async (req, res) => {
  try {
    const { id } = req.params;

    const catalogItem = await Catalog.findById(id);

    if (!catalogItem) {
      return res.status(404).json({
        success: false,
        message: 'Catalog item not found'
      });
    }

    res.json({
      success: true,
      catalogItem
    });

  } catch (error) {
    console.error('GET CATALOG ITEM ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch catalog item'
    });
  }
};

// ✅ Update catalog item
export const updateCatalogItem = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const catalogItem = await Catalog.findById(id);

    if (!catalogItem) {
      return res.status(404).json({
        success: false,
        message: 'Catalog item not found'
      });
    }

    // Update fields
    Object.keys(updates).forEach(key => {
      if (key in catalogItem) {
        catalogItem[key] = updates[key];
      }
    });

    catalogItem.updatedAt = new Date();
    await catalogItem.save();

    res.json({
      success: true,
      message: 'Catalog item updated successfully',
      catalogItem
    });

  } catch (error) {
    console.error('UPDATE CATALOG ITEM ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update catalog item'
    });
  }
};

// ✅ Delete catalog item (soft delete)
export const deleteCatalogItem = async (req, res) => {
  try {
    const { id } = req.params;

    const catalogItem = await Catalog.findById(id);

    if (!catalogItem) {
      return res.status(404).json({
        success: false,
        message: 'Catalog item not found'
      });
    }

    // Soft delete
    catalogItem.isActive = false;
    catalogItem.updatedAt = new Date();
    await catalogItem.save();

    res.json({
      success: true,
      message: 'Catalog item deleted successfully'
    });

  } catch (error) {
    console.error('DELETE CATALOG ITEM ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete catalog item'
    });
  }
};

// ✅ Get catalog items for user (only active items)
export const getUserCatalogItems = async (req, res) => {
  try {
    const filter = { isActive: true };

    const catalogItems = await Catalog.find(filter)
      .sort({ createdAt: -1 })
      .select('-__v -isActive -updatedAt');

    res.json({
      success: true,
      catalogItems
    });

  } catch (error) {
    console.error('GET USER CATALOG ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch catalog items'
    });
  }
};