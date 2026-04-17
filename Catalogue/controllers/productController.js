import Product from '../models/Product.js';

// ✅ Create new product
export const createProduct = async (req, res) => {
  try {
    const { name, companyId } = req.body;

    if (!name || !companyId) {
      return res.status(400).json({
        success: false,
        message: 'Product name and companyId are required'
      });
    }

    const product = new Product({ name, companyId });
    await product.save();

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      product
    });

  } catch (error) {
    console.error('CREATE PRODUCT ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to create product'
    });
  }
};

// ✅ Get all products
export const getAllProducts = async (req, res) => {
  try {
    const { companyId, search = '' } = req.query;
    
    const filter = { isActive: true };
    if (companyId) {
      filter.companyId = companyId;
    }
    if (search) {
      filter.name = { $regex: search, $options: 'i' };
    }

    const products = await Product.find(filter)
      .populate('companyId', 'name')
      .sort({ name: 1 })
      .select('-__v');

    res.json({
      success: true,
      products
    });

  } catch (error) {
    console.error('GET PRODUCTS ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch products'
    });
  }
};

// ✅ Get product by ID
export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id).populate('companyId', 'name');

    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    res.json({
      success: true,
      product
    });

  } catch (error) {
    console.error('GET PRODUCT ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch product'
    });
  }
};

// ✅ Update product
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, companyId } = req.body;

    const product = await Product.findById(id);

    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    if (name) product.name = name;
    if (companyId) product.companyId = companyId;

    await product.save();

    res.json({
      success: true,
      message: 'Product updated successfully',
      product
    });

  } catch (error) {
    console.error('UPDATE PRODUCT ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to update product'
    });
  }
};

// ✅ Delete product (soft delete)
export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    product.isActive = false;
    await product.save();

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (error) {
    console.error('DELETE PRODUCT ERROR 👉', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete product'
    });
  }
};
