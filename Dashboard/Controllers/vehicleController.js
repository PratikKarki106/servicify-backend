import Vehicle from '../models/Vehicle.js';
import { uploadBluebookImage, getBluebookImageUrl, deleteBluebookImage } from '../../services/minio.js';
import User from '../../Users/models/User.js';

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

    // Generate presigned URLs for bluebook images
    const vehiclesWithUrls = await Promise.all(
      vehicles.map(async (vehicle) => {
        const vehicleObj = vehicle.toObject();
        if (vehicleObj.bluebookImage) {
          try {
            vehicleObj.bluebookImageUrl = await getBluebookImageUrl(vehicleObj.bluebookImage);
          } catch (error) {
            console.error('Error generating image URL:', error);
            vehicleObj.bluebookImageUrl = null;
          }
        }
        return vehicleObj;
      })
    );

    console.log(`Found ${vehicles.length} vehicles for user ${userId}`);

    return res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehiclesWithUrls
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

    const vehicleObj = vehicle.toObject();
    if (vehicleObj.bluebookImage) {
      try {
        vehicleObj.bluebookImageUrl = await getBluebookImageUrl(vehicleObj.bluebookImage);
      } catch (error) {
        console.error('Error generating image URL:', error);
        vehicleObj.bluebookImageUrl = null;
      }
    }

    return res.status(200).json({
      success: true,
      data: vehicleObj
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

    // Upload bluebook image if provided
    let bluebookImagePath = null;
    if (req.file) {
      try {
        bluebookImagePath = await uploadBluebookImage(req.file, userId);
        console.log('Bluebook image uploaded to MinIO:', bluebookImagePath);
      } catch (error) {
        console.error('Error uploading bluebook image:', error);
        return res.status(500).json({
          success: false,
          message: 'Error uploading bluebook image',
          error: error.message
        });
      }
    }

    // Create vehicle
    const vehicle = new Vehicle({
      userId,
      name: name.trim(),
      color: color.trim(),
      version: version.trim(),
      plateNumber: plateNumber.trim().toUpperCase(),
      mileage: Number(mileage),
      bluebookImage: bluebookImagePath,
      lastService: req.body.lastService || new Date(),
      nextService: req.body.nextService || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
    });

    await vehicle.save();

    console.log('Vehicle saved successfully:', vehicle);

    // Generate presigned URL for the image
    const vehicleObj = vehicle.toObject();
    if (vehicleObj.bluebookImage) {
      try {
        vehicleObj.bluebookImageUrl = await getBluebookImageUrl(vehicleObj.bluebookImage);
      } catch (error) {
        console.error('Error generating image URL:', error);
      }
    }

    return res.status(201).json({
      success: true,
      message: 'Vehicle added successfully',
      data: vehicleObj
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

    // Delete bluebook image from MinIO if it exists
    if (vehicle.bluebookImage) {
      try {
        await deleteBluebookImage(vehicle.bluebookImage);
        console.log('Bluebook image deleted from MinIO:', vehicle.bluebookImage);
      } catch (error) {
        console.error('Error deleting bluebook image:', error);
      }
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

// Admin: Get all pending vehicles with user details
export const getPendingVehicles = async (req, res) => {
  try {
    console.log('GET /vehicles/admin/pending request received');

    const status = req.query.status || 'pending';
    
    const vehicles = await Vehicle.find({ status }).sort({ createdAt: -1 });

    // Generate presigned URLs and fetch user details for each vehicle
    const vehiclesWithDetails = await Promise.all(
      vehicles.map(async (vehicle) => {
        const vehicleObj = vehicle.toObject();
        
        // Generate presigned URL for bluebook image
        if (vehicleObj.bluebookImage) {
          try {
            vehicleObj.bluebookImageUrl = await getBluebookImageUrl(vehicleObj.bluebookImage);
          } catch (error) {
            console.error('Error generating image URL:', error);
            vehicleObj.bluebookImageUrl = null;
          }
        }

        // Fetch user details
        try {
          const user = await User.findOne({ userId: parseInt(vehicleObj.userId) });
          vehicleObj.userDetails = user ? {
            name: user.name,
            email: user.email,
            phone: user.phone,
            profilePicture: user.profilePicture
          } : null;
        } catch (error) {
          console.error('Error fetching user details:', error);
          vehicleObj.userDetails = null;
        }

        return vehicleObj;
      })
    );

    console.log(`Found ${vehicles.length} vehicles with status: ${status}`);

    return res.status(200).json({
      success: true,
      count: vehicles.length,
      data: vehiclesWithDetails
    });

  } catch (error) {
    console.error('Error in getPendingVehicles:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while fetching vehicles',
      error: error.message
    });
  }
};

// Admin: Verify a vehicle
export const verifyVehicle = async (req, res) => {
  try {
    const { id } = req.params;

    const vehicle = await Vehicle.findByIdAndUpdate(
      id,
      { 
        status: 'verified',
        rejectionReason: null
      },
      { new: true, runValidators: true }
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    console.log(`Vehicle ${id} verified by admin`);

    return res.status(200).json({
      success: true,
      message: 'Vehicle verified successfully',
      data: vehicle
    });

  } catch (error) {
    console.error('Error in verifyVehicle:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while verifying vehicle',
      error: error.message
    });
  }
};

// Admin: Reject a vehicle
export const rejectVehicle = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const vehicle = await Vehicle.findByIdAndUpdate(
      id,
      { 
        status: 'rejected',
        rejectionReason: reason.trim()
      },
      { new: true, runValidators: true }
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    console.log(`Vehicle ${id} rejected by admin. Reason: ${reason}`);

    return res.status(200).json({
      success: true,
      message: 'Vehicle rejected successfully',
      data: vehicle
    });

  } catch (error) {
    console.error('Error in rejectVehicle:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while rejecting vehicle',
      error: error.message
    });
  }
};

// Admin: Update vehicle status (can change to any status)
export const updateVehicleStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, reason } = req.body;

    if (!status || !['pending', 'verified', 'rejected'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be pending, verified, or rejected'
      });
    }

    const updateData = { status };
    
    // If rejecting, set the reason
    if (status === 'rejected') {
      if (!reason || !reason.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required when rejecting a vehicle'
        });
      }
      updateData.rejectionReason = reason.trim();
    } else {
      // If not rejecting, clear the rejection reason
      updateData.rejectionReason = null;
    }

    const vehicle = await Vehicle.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!vehicle) {
      return res.status(404).json({
        success: false,
        message: 'Vehicle not found'
      });
    }

    console.log(`Vehicle ${id} status updated to ${status} by admin`);

    return res.status(200).json({
      success: true,
      message: `Vehicle status updated to ${status} successfully`,
      data: vehicle
    });

  } catch (error) {
    console.error('Error in updateVehicleStatus:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while updating vehicle status',
      error: error.message
    });
  }
};