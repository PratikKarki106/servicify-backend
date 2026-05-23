import multer from 'multer';
import Catalog from '../models/Catalog.js';
import {
  uploadCatalogItemImage,
  getCatalogItemImageUrl
} from '../../services/minio.js';

const storage = multer.memoryStorage();
export const catalogImageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, GIF, or WebP images are allowed'));
    }
  }
});

async function resolveCatalogImageForClient(doc) {
  const plain = doc.toObject ? doc.toObject() : { ...doc };
  let displayUrl = '';

  if (plain.imageObjectKey) {
    try {
      displayUrl = await getCatalogItemImageUrl(plain.imageObjectKey);
    } catch (e) {
      console.error('Catalog image presign failed:', e.message);
    }
  } else if (plain.imageUrl?.startsWith('data:')) {
    displayUrl = plain.imageUrl;
  } else if (plain.imageUrl && !plain.imageUrl.startsWith('http')) {
    try {
      displayUrl = await getCatalogItemImageUrl(plain.imageUrl);
    } catch (e) {
      console.error('Catalog image presign (legacy key in imageUrl):', e.message);
    }
  } else if (plain.imageUrl?.startsWith('http')) {
    displayUrl = plain.imageUrl;
  }

  return {
    ...plain,
    imageUrl: displayUrl,
    imageObjectKey: plain.imageObjectKey || ''
  };
}

async function mapCatalogItems(items) {
  return Promise.all(items.map((item) => resolveCatalogImageForClient(item)));
}

// Admin: POST multipart — stores in MinIO, returns key + short-lived display URL for preview
export const uploadCatalogImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No image file uploaded'
      });
    }

    const imageObjectKey = await uploadCatalogItemImage(req.file);
    const imageUrl = await getCatalogItemImageUrl(imageObjectKey);

    res.json({
      success: true,
      imageObjectKey,
      imageUrl
    });
  } catch (error) {
    console.error('UPLOAD CATALOG IMAGE ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to upload catalog image'
    });
  }
};

// ✅ Create new catalog item
export const createCatalogItem = async (req, res) => {
  try {
    const {
      companyId,
      productId,
      versionId,
      ccId,
      itemName,
      description,
      itemPrice,
      serviceCharge,
      estimatedTime,
      imageObjectKey
    } = req.body;

    // Validate required fields
    if (!companyId || !productId || !versionId || !ccId || !itemName || !itemPrice || !serviceCharge || !estimatedTime) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const totalCost = Number(itemPrice) + Number(serviceCharge);

    const catalogItem = new Catalog({
      companyId,
      productId,
      versionId,
      ccId,
      itemName,
      description,
      itemPrice,
      serviceCharge,
      estimatedTime,
      totalCost,
      imageObjectKey: imageObjectKey || ''
    });

    await catalogItem.save();

    const catalogItemJson = await resolveCatalogImageForClient(catalogItem);

    res.status(201).json({
      success: true,
      message: 'Catalog item created successfully',
      catalogItem: catalogItemJson
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

    const catalogItemsRaw = await Catalog.find(filter)
      .populate('companyId', 'name')
      .populate('productId', 'name')
      .populate('versionId', 'name')
      .populate('ccId', 'name')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v');

    const catalogItems = await mapCatalogItems(catalogItemsRaw);

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

    const catalogItemRaw = await Catalog.findById(id);

    if (!catalogItemRaw) {
      return res.status(404).json({
        success: false,
        message: 'Catalog item not found'
      });
    }

    const catalogItem = await resolveCatalogImageForClient(catalogItemRaw);

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

    if (updates.itemPrice != null || updates.serviceCharge != null) {
      const ip = updates.itemPrice != null ? Number(updates.itemPrice) : catalogItem.itemPrice;
      const sc = updates.serviceCharge != null ? Number(updates.serviceCharge) : catalogItem.serviceCharge;
      catalogItem.totalCost = ip + sc;
    }

    catalogItem.updatedAt = new Date();
    await catalogItem.save();

    const catalogItemJson = await resolveCatalogImageForClient(catalogItem);

    res.json({
      success: true,
      message: 'Catalog item updated successfully',
      catalogItem: catalogItemJson
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
    const filter = {};

    const catalogItemsRaw = await Catalog.find(filter)
      .populate('companyId', 'name')
      .populate('productId', 'name')
      .populate('versionId', 'name')
      .populate('ccId', 'name')
      .sort({ createdAt: -1 })
      .select('-__v -updatedAt');

    const mapped = await mapCatalogItems(catalogItemsRaw);
    const catalogItems = mapped.map(({ imageObjectKey, ...rest }) => rest);

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
