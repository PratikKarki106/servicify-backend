import Package from '../models/Package.js';

// Get all packages
export const getAllPackages = async (req, res) => {
  try {
    const packages = await Package.find();
    res.json({ success: true, data: packages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get single package
export const getPackageById = async (req, res) => {
  try {
    const packageData = await Package.findById(req.params.id);
    if (!packageData) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }
    res.json({ success: true, data: packageData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create package
export const createPackage = async (req, res) => {
  try {
    const packageData = req.body;
    const newPackage = new Package(packageData);
    await newPackage.save();
    res.status(201).json({ success: true, data: newPackage });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update package
export const updatePackage = async (req, res) => {
  try {
    const updatedPackage = await Package.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!updatedPackage) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }
    res.json({ success: true, data: updatedPackage });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete package
export const deletePackage = async (req, res) => {
  try {
    const deletedPackage = await Package.findByIdAndDelete(req.params.id);
    if (!deletedPackage) {
      return res.status(404).json({ success: false, message: 'Package not found' });
    }
    res.json({ success: true, message: 'Package deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get statistics
export const getPackageStatistics = async (req, res) => {
  try {
    const totalPackages = await Package.countDocuments();
    const activePackages = await Package.countDocuments({ isActive: true });
    
    const packages = await Package.find();
    const totalRevenue = packages.reduce((sum, pkg) => sum + (pkg.price * pkg.totalPurchases), 0);
    
    res.json({
      success: true,
      data: {
        totalPackages,
        activePackages,
        totalRevenue,
        expiredPackages: 0 // Add logic later
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};