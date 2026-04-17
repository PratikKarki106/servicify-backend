import Package from '../models/Package.js';
import PackagePurchase from '../../Payment/models/PackagePurchase.js';
import User from '../../Users/models/User.js';

// Get all packages
export const getAllPackages = async (req, res) => {
  try {
    console.log('Fetching all packages...');
    const packages = await Package.find();
    console.log(`Found ${packages.length} packages in database`);

    // Add totalPurchases count to each package without modifying the database
    const packagesWithPurchaseData = await Promise.all(
      packages.map(async (pkg) => {
        const purchaseCount = await PackagePurchase.countDocuments({ packageId: pkg._id });
        const pkgObj = pkg.toObject();
        pkgObj.totalPurchases = purchaseCount;
        return pkgObj;
      })
    );

    console.log('Successfully prepared packages response');
    res.json({ success: true, data: packagesWithPurchaseData });
  } catch (error) {
    console.error('❌ Error in getAllPackages:', error);
    console.error('❌ Error stack:', error.stack);
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      name: error.name
    });
    res.status(500).json({ 
      success: false, 
      message: error.message,
      error: error.toString()
    });
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
    const { name, description, actualPrice, discountedPrice, purchaseDeadline, features, serviceType, isActive } = req.body;
    
    // Validate features array length
    if (!features || !Array.isArray(features) || features.length === 0) {
      return res.status(400).json({ success: false, message: 'Features are required and cannot be empty' });
    }
    
    if (features.length > 5) {
      return res.status(400).json({ success: false, message: 'Features cannot exceed 5 items' });
    }

    const newPackage = new Package({
      name,
      description,
      actualPrice,
      discountedPrice,
      purchaseDeadline,
      features,
      serviceType,
      isActive
    });
    
    await newPackage.save();
    res.status(201).json({ success: true, data: newPackage });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update package
export const updatePackage = async (req, res) => {
  try {
    const { name, description, actualPrice, discountedPrice, purchaseDeadline, features, serviceType, isActive } = req.body;
    
    // Validate features array length if provided
    if (features && features.length > 5) {
      return res.status(400).json({ success: false, message: 'Features cannot exceed 5 items' });
    }

    const updatedPackage = await Package.findByIdAndUpdate(
      req.params.id,
      {
        name,
        description,
        actualPrice,
        discountedPrice,
        purchaseDeadline,
        features,
        serviceType,
        isActive
      },
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
    const totalRevenue = packages.reduce((sum, pkg) => sum + (pkg.discountedPrice * pkg.totalPurchases), 0);
    const expiredPackages = packages.filter(pkg => pkg.isExpired).length;

    res.json({
      success: true,
      data: {
        totalPackages,
        activePackages,
        totalRevenue,
        expiredPackages
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get user's purchased packages
export const getUserPackages = async (req, res) => {
  try {
    // Get user ID from auth middleware
    const userId = req.user._id;

    // Find all package purchases for this user
    // Include packages even if they're expired/deleted from admin
    const purchases = await PackagePurchase.find({ userId })
      .populate('packageId')
      .sort({ purchasedAt: -1 });

    // Format the response
    const userPackages = purchases.map(purchase => ({
      _id: purchase._id,
      packageId: purchase.packageId ? purchase.packageId._id : null,
      packageName: purchase.packageName,
      totalCredits: purchase.totalCredits,
      usedCredits: purchase.usedCredits,
      remainingCredits: purchase.remainingCredits,
      amount: purchase.amount,
      purchasedAt: purchase.purchasedAt,
      expiryDate: purchase.expiryDate,
      isActive: purchase.isActive && purchase.expiryDate > new Date() && purchase.remainingCredits > 0,
      // Store original package data if still available
      originalPackage: purchase.packageId,
      purchaseId: purchase._id
    }));

    res.json({ success: true, data: userPackages });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};