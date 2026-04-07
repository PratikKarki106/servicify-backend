import Vehicle from '../models/Vehicle.js';

// Get all vehicles for current user
export const getVehicles = async (req, res) => {
  try {
    console.log('GET /vehicles request received');
    
    // Get userId from headers (from frontend)
    const userId = req.headers['x-user-id'] || req.body.userId || 'test-user';
    console.log('User ID:', userId);
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required. Please login again.'
      });
    }
    
    const vehicles = await Vehicle.find({ userId }).sort({ createdAt: -1 });
    
    console.log(`Found ${vehicles.length} vehicles for user ${userId}`);
    
    return res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehicles
    });
    
  } catch (error) {
    console.error('Error in getVehicles:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching vehicles',
      error: error.message
    });
  }
};

// Get single vehicle
export const getVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] || req.body.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    const vehicle = await Vehicle.findOne({ _id: id, userId });
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }
    
    return res.status(200).json({
      success: true,
      data: vehicle
    });
    
  } catch (error) {
    console.error('Error in getVehicle:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching vehicle',
      error: error.message
    });
  }
};

// Add new vehicle
export const addVehicle = async (req, res) => {
  try {
    console.log('POST /vehicles request received:', req.body);
    
    const userId = req.headers['x-user-id'] || req.body.userId;
    const { name, color, version, plateNumber, mileage } = req.body;
    
    // Basic validation
    if (!name || !color || !version || !plateNumber || mileage === undefined) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required: name, color, version, plateNumber, mileage'
      });
    }
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    // Create vehicle
    const vehicle = new Vehicle({
      userId,
      name: name.trim(),
      color: color.trim(),
      version: version.trim(),
      plateNumber: plateNumber.trim().toUpperCase(),
      mileage: Number(mileage),
      lastService: req.body.lastService || new Date(),
      nextService: req.body.nextService || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    });
    
    await vehicle.save();
    
    console.log('Vehicle saved successfully:', vehicle);
    
    return res.status(201).json({
      success: true,
      message: 'Vehicle added successfully',
      data: vehicle
    });
    
  } catch (error) {
    console.error('Error in addVehicle:', error);
    
    // Check for duplicate plate number
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A vehicle with this plate number already exists'
      });
    }
    
    return res.status(500).json({
      success: false,
      message: 'Server error while adding vehicle',
      error: error.message
    });
  }
};

// Update vehicle
export const updateVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] || req.body.userId;
    const updateData = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    // Find and update vehicle
    const vehicle = await Vehicle.findOneAndUpdate(
      { _id: id, userId },
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found or you do not have permission'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Vehicle updated successfully',
      data: vehicle
    });
    
  } catch (error) {
    console.error('Error in updateVehicle:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating vehicle',
      error: error.message
    });
  }
};

// Delete vehicle
export const deleteVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.headers['x-user-id'] || req.body.userId;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required'
      });
    }
    
    const vehicle = await Vehicle.findOneAndDelete({ _id: id, userId });
    
    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found or you do not have permission'
      });
    }
    
    return res.status(200).json({
      success: true,
      message: 'Vehicle deleted successfully'
    });
    
  } catch (error) {
    console.error('Error in deleteVehicle:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting vehicle',
      error: error.message
    });
  }
};