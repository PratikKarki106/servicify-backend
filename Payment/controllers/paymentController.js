// servicify-backend/Payment/controllers/paymentController.js

import Payment from '../models/Payment.js';
import PackagePurchase from '../models/PackagePurchase.js';
import khaltiService from '../services/khaltiService.js';
import esewaService from '../services/esewaService.js';
import { app } from '../Config/khaltiConfig.js';
import { app as esewaAppConfig } from '../Config/esewaConfig.js';
import User from '../../Users/models/User.js';
import Appointment from '../../BookAppointment/models/Appointment.js';
import Package from '../../Package/models/Package.js';
import mongoose from 'mongoose';
import Notification from '../../Users/models/Notification.js';
import AdminNotification from '../../Users/models/AdminNotification.js';
import { earnPoints } from '../../Loyalty/services/loyaltyService.js';
import RedemptionLog from '../../Loyalty/models/RedemptionLog.js';
import Cart from '../../Catalogue/models/Cart.js';
import Purchase from '../../Catalogue/models/Purchase.js';

// @desc    Get total income from completed payments
// @route   GET /payment/admin/total-income
// @access  Private (Admin)
const getTotalIncome = async (req, res) => {
    try {
        const { date } = req.query;
        
        let query = { paymentStatus: 'completed' };
        
        // If date is provided, filter by that date
        if (date) {
            const targetDate = new Date(date);
            const startOfDay = new Date(targetDate);
            startOfDay.setHours(0, 0, 0, 0);
            
            const endOfDay = new Date(targetDate);
            endOfDay.setHours(23, 59, 59, 999);
            
            query.completedAt = {
                $gte: startOfDay,
                $lte: endOfDay
            };
        }
        
        // Sum all completed payments
        const payments = await Payment.find(query);
        
        const totalIncome = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        
        res.json({
            success: true,
            totalIncome: Math.round(totalIncome)
        });
    } catch (error) {
        console.error('Get total income error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// @desc    Initiate payment for appointment or package
// @route   POST /api/payment/initiate
// @access  Private
const initiatePayment = async (req, res) => {
    try {
        const { paymentType, itemId, amount, redeemedValue = 0, gateway = 'khalti' } = req.body;
        const userObjectId = req.user._id;  // ObjectId from auth middleware

        console.log('Payment initiation request:', { paymentType, itemId, amount, redeemedValue, gateway, userObjectId: userObjectId.toString() });

        // Get the full user to access numeric userId
        const user = await User.findById(userObjectId);
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        const numericUserId = user.userId;  // Get the numeric userId
        console.log('User numeric ID:', numericUserId);

        // Validate required fields
        if (!paymentType || !itemId || !amount) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields'
            });
        }

        const numericAmount = Number(amount);
        if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid amount'
            });
        }

        const requestedRedeemedValue = Math.max(0, Number(redeemedValue || 0));

        // Validate payment type
        if (!['appointment', 'package', 'purchase'].includes(paymentType)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid payment type'
            });
        }

        // Handle appointment and package differently
        let itemIdObj;
        
        if (paymentType === 'appointment') {
            // Appointments use numeric appointmentId, not MongoDB _id
            const appointmentIdNum = parseInt(itemId.toString(), 10);
            
            if (isNaN(appointmentIdNum)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid appointment ID'
                });
            }

            // Verify the appointment exists and belongs to user (using numeric userId)
            const appointment = await Appointment.findOne({
                appointmentId: appointmentIdNum,
                userId: numericUserId  // Use numeric userId here
            });

            if (!appointment) {
                return res.status(404).json({
                    success: false,
                    error: 'Appointment not found'
                });
            }

            // Check if already paid
            if (appointment.paymentStatus === 'completed') {
                return res.status(400).json({
                    success: false,
                    error: 'Appointment already paid'
                });
            }

            // Store appointmentId for later use
            itemIdObj = appointmentIdNum;

        } else if (paymentType === 'package') {
            // Packages use MongoDB _id (24 character hex string)
            const itemIdStr = itemId.toString().trim();
            
            if (!itemIdStr || itemIdStr.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid package ID'
                });
            }

            // Check if itemId is a valid 24 character hex string
            if (!/^[0-9a-fA-F]{24}$/.test(itemIdStr)) {
                return res.status(400).json({
                    success: false,
                    error: 'Invalid package ID format'
                });
            }

            itemIdObj = new mongoose.Types.ObjectId(itemIdStr);

            // Verify package exists
            const pkg = await Package.findById(itemIdObj);
            if (!pkg) {
                return res.status(404).json({
                    success: false,
                    error: 'Package not found'
                });
            }

            // Check if user has already purchased this package
            const existingPurchase = await PackagePurchase.findOne({
                userId: req.user._id,
                packageId: itemIdObj
            });

            if (existingPurchase) {
                return res.status(400).json({
                    success: false,
                    error: 'You have already purchased this package. Each package can only be purchased once.'
                });
            }
        } else if (paymentType === 'purchase') {
            const cart = await Cart.findOne({ userId: req.user._id });
            if (!cart || !cart.items || cart.items.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Cart is empty'
                });
            }
            itemIdObj = 'cart';
        }

        let verifiedRedeemedValue = 0;
        if (requestedRedeemedValue > 0) {
            const redemptionLog = await RedemptionLog.findOne({
                userId: userObjectId,
                orderId: String(itemId)
            }).sort({ redeemedAt: -1 });

            if (redemptionLog) {
                verifiedRedeemedValue = Number(redemptionLog.discountApplied || 0);
            }
        }

        // Get user info for customer_info (already fetched above)
        // const user = await User.findById(userObjectId); // Already have user from above

        // Generate unique purchase order ID
        const purchaseOrderId = khaltiService.generatePurchaseOrderId(
            paymentType === 'appointment' ? 'APPT' : paymentType === 'package' ? 'PKG' : 'PUR',
            itemId
        );

        // Prepare customer info
        const customerInfo = {
            name: user.name || user.fullName || 'Customer',
            email: user.email,
            phone: user.phone || ''
        };

        // Prepare purchase order name
        const purchaseOrderName = paymentType === 'appointment'
            ? 'Appointment Payment'
            : paymentType === 'package'
                ? 'Package Purchase'
                : 'Catalog Purchase';

// Create payment record in database
        const paymentData = {
            userId: userObjectId,
            paymentType,
            purchaseOrderId,
            amount: numericAmount,
            amountInPaisa: numericAmount * 100,
            paymentStatus: 'initiated',
            gateway: gateway,
            callbackData: {
                loyalty: {
                    redeemedValue: verifiedRedeemedValue
                }
            }
        };

        // Set the appropriate ID field based on payment type
        if (paymentType === 'appointment') {
            // For appointments, store both numeric ID and MongoDB _id
            const appointment = await Appointment.findOne({ appointmentId: itemIdObj });
            paymentData.appointmentId = itemIdObj;  // Numeric appointmentId
            paymentData.appointmentDbId = appointment._id;  // MongoDB _id
        } else if (paymentType === 'package') {
            // For packages, store the package _id
            paymentData.packageId = itemIdObj;
        } else {
            paymentData.callbackData = {
                ...paymentData.callbackData,
                cartRef: 'cart'
            };
        }

const payment = new Payment(paymentData);

        await payment.save();

        // Initiate payment with the selected gateway
        let result;
        if (gateway === 'esewa') {
            // Generate transaction UUID for eSewa v2 API
            const transactionUuid = esewaService.generateTransactionUuid();
            
            // Generate form payload for eSewa v2 API (form-based)
            const esewaPayload = esewaService.generatePaymentFormPayload({
                amount: numericAmount,
                taxAmount: 0,  // Can be customized based on business logic
                serviceCharge: 0,
                deliveryCharge: 0,
                transactionUuid
            });

            console.log('eSewa v2 payload generation:', esewaPayload);

            if (!esewaPayload.success) {
                // Update payment record as failed
                payment.paymentStatus = 'failed';
                payment.callbackData = { error: esewaPayload.error };
                await payment.save();

                console.error('eSewa payload generation failed:', esewaPayload.error);

                return res.status(400).json({
                    success: false,
                    error: esewaPayload.error
                });
            }

            // Store eSewa transaction data for verification later
            payment.esewaTransactionUuid = transactionUuid;
            payment.esewaFormPayload = esewaPayload.payload;
            await payment.save();

            result = {
                success: true,
                // Return the form payload and endpoint for frontend to submit
                esewaPayload: esewaPayload.payload,
                esewaFormEndpoint: esewaService.v2ApiEndpoint,
                transactionUuid,
                purchaseOrderId
            };
        } else {
            // Default to Khalti
            result = await khaltiService.initiatePayment({
                amount: numericAmount,
                purchaseOrderId,
                purchaseOrderName,
                customerInfo
            });

            console.log('Khalti response:', result);

            if (!result.success) {
                // Update payment record as failed
                payment.paymentStatus = 'failed';
                payment.callbackData = { error: result.error, details: result.details };
                await payment.save();

                console.error('Khalti initiation failed:', result.error, result.details);

                return res.status(400).json({
                    success: false,
                    error: result.error,
                    details: result.details
                });
            }

            // Update payment with Khalti pidx
            payment.khaltiPidx = result.pidx;
            await payment.save();
        }

        // Return response based on gateway
        if (gateway === 'esewa') {
            res.json({
                success: true,
                esewaPayload: result.esewaPayload,
                esewaFormEndpoint: result.esewaFormEndpoint,
                transactionUuid: result.transactionUuid,
                purchaseOrderId
            });
        } else {
            res.json({
                success: true,
                paymentUrl: result.paymentUrl,
                pidx: result.pidx,
                purchaseOrderId
            });
        }

    } catch (error) {
        console.error('Initiate payment error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// @desc    Khalti callback endpoint (Khalti redirects here)
// @route   GET /api/payment/khalti/callback
// @access  Public (called by Khalti)
const khaltiCallback = async (req, res) => {
    try {
        const { pidx, status, transaction_id, purchase_order_id } = req.query;

        console.log('Khalti callback received:', { pidx, status, transaction_id, purchase_order_id });

        if (!pidx) {
            return res.redirect(`${app.frontendUrl}/payment/failed?error=Invalid callback`);
        }

        // Find the payment record
        const payment = await Payment.findOne({ khaltiPidx: pidx });

        if (!payment) {
            return res.redirect(`${app.frontendUrl}/payment/failed?error=Payment not found`);
        }

        // Verify payment with Khalti lookup API
        const verification = await khaltiService.lookupPayment(pidx);

        // Store callback data
        payment.callbackData = { query: req.query, verification: verification.data };
        await payment.save();

        // Check if payment is completed
        if (verification.success && verification.status === 'Completed') {
            // Update payment record
            payment.paymentStatus = 'completed';
            payment.khaltiStatus = verification.status;
            payment.khaltiTransactionId = verification.transactionId;
            payment.completedAt = new Date();
            await payment.save();

            // Get user info for notification
            const user = await User.findById(payment.userId);
            const userNumericId = user ? user.userId : null;

            // Handle based on payment type
            if (payment.paymentType === 'appointment') {
                console.log('🔄 Updating appointment status for payment:', {
                    appointmentDbId: payment.appointmentDbId,
                    appointmentId: payment.appointmentId,
                    paymentId: payment._id
                });

                // Update appointment status to completed
                const updateResult = await Appointment.findByIdAndUpdate(
                    payment.appointmentDbId,
                    {
                        status: 'completed',  // Update main status field
                        paymentId: payment._id
                    },
                    { new: true }  // Return the updated document
                );

                console.log('✅ Appointment update result:', updateResult ? {
                    id: updateResult.appointmentId,
                    status: updateResult.status
                } : 'null');

                if (!updateResult) {
                    console.error('❌ Failed to update appointment - not found');
                }

                // Create user notification for successful payment
                if (userNumericId) {
                    await Notification.create({
                        userId: userNumericId,
                        title: 'Payment Successful! 🎉',
                        message: `Your payment of Rs. ${payment.amount} for appointment #${payment.appointmentId} has been received successfully.`,
                        type: 'appointment',
                        metadata: {
                            appointmentId: payment.appointmentId.toString(),
                            paymentId: payment._id.toString(),
                            amount: payment.amount,
                            link: `/user/history/${payment.appointmentId}`
                        }
                    });
                    console.log('✅ User notification created for successful payment');
                }

                // Loyalty earning happens only after successful payment completion.
                // If points were redeemed on this order, send redeemedValue from checkout to prevent double-dipping.
                await earnPoints({
                    userId: payment.userId,
                    totalExpenditure: payment.amount,
                    referenceId: payment._id.toString(),
                    redeemedValue: Number(payment.callbackData?.loyalty?.redeemedValue || 0)
                });

                // Create admin notification for payment received
                await AdminNotification.create({
                    title: 'Payment Received 💰',
                    message: `Received Rs. ${payment.amount} from ${user?.name || 'User'} for appointment #${payment.appointmentId}`,
                    type: 'payment',
                    priority: 'high',
                    metadata: {
                        appointmentId: payment.appointmentId.toString(),
                        userId: userNumericId,
                        paymentId: payment._id.toString(),
                        amount: payment.amount,
                        link: `/admin/appointments/${payment.appointmentId}`
                    }
                });
                console.log('✅ Admin notification created for payment received');

                // Redirect to success page with appointment ID (numeric)
                return res.redirect(
                    `${app.frontendUrl}/payment/success?type=appointment&id=${payment.appointmentId}`
                );

            } else if (payment.paymentType === 'package') {
                // Get package details
                const pkg = await Package.findById(payment.packageId);

                // Fallback for packages without credits field: derive credits from amount
                const packageCredits = pkg.credits || Math.floor(payment.amount / 100);
                const validityDays = pkg.validityDays || 365;

                // Calculate expiry date
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + validityDays);

                // Create package purchase record
                const packagePurchase = new PackagePurchase({
                    userId: payment.userId,
                    packageId: payment.packageId,
                    packageName: pkg.name,
                    totalCredits: packageCredits,
                    remainingCredits: packageCredits,
                    amount: payment.amount,
                    paymentId: payment._id,
                    expiryDate
                });

                await packagePurchase.save();

                // Increment totalPurchases counter in Package model
                await Package.findByIdAndUpdate(payment.packageId, {
                  $inc: { totalPurchases: 1 }
                });

                // Update payment with package purchase ID
                payment.packagePurchaseId = packagePurchase._id;
                await payment.save();

                // Create user notification for successful package payment
                if (userNumericId) {
                    await Notification.create({
                        userId: userNumericId,
                        title: 'Package Purchased Successfully! 📦',
                        message: `Your payment of Rs. ${payment.amount} for ${pkg.name} has been received. ${pkg.credits} credits added to your account.`,
                        type: 'general',
                        metadata: {
                            packageId: payment.packageId.toString(),
                            packagePurchaseId: packagePurchase._id.toString(),
                            amount: payment.amount,
                            link: '/user/packages'
                        }
                    });
                    console.log('✅ User notification created for package purchase');
                }

                // Create admin notification for package payment received
                await AdminNotification.create({
                    title: 'Package Payment Received 💰',
                    message: `Received Rs. ${payment.amount} from ${user?.name || 'User'} for ${pkg.name} package`,
                    type: 'payment',
                    priority: 'high',
                    metadata: {
                        packageId: payment.packageId.toString(),
                        userId: userNumericId,
                        paymentId: payment._id.toString(),
                        amount: payment.amount,
                        link: `/admin/packages/${payment.packageId}`
                    }
                });
                console.log('✅ Admin notification created for package payment');

                // Redirect to success page with package purchase ID
                return res.redirect(
                    `${app.frontendUrl}/payment/success?type=package&id=${packagePurchase._id}`
                );
            } else if (payment.paymentType === 'purchase') {
                const cart = await Cart.findOne({ userId: payment.userId });
                if (!cart || !cart.items?.length) {
                    return res.redirect(`${app.frontendUrl}/payment/failed?error=Cart empty`);
                }

                const purchase = await Purchase.create({
                    purchaseCode: `CAT-${Date.now()}`,
                    userId: payment.userId,
                    items: cart.items.map((i) => ({
                        catalogItemId: i.catalogItemId,
                        itemName: i.itemSnapshot?.itemName || 'Catalog Item',
                        quantity: i.quantity,
                        unitPrice: i.unitPrice,
                        totalPrice: i.totalPrice
                    })),
                    subtotal: cart.subtotal,
                    discount: 0,
                    totalAmount: cart.subtotal,
                    paymentStatus: 'completed'
                });

                payment.purchaseId = purchase._id;
                await payment.save();

                await earnPoints({
                    userId: payment.userId,
                    totalExpenditure: purchase.totalAmount,
                    referenceId: purchase._id.toString(),
                    redeemedValue: Number(payment.callbackData?.loyalty?.redeemedValue || 0),
                    description: 'Points earned from catalog purchase'
                });

                cart.items = [];
                cart.subtotal = 0;
                await cart.save();

                return res.redirect(
                    `${app.frontendUrl}/payment/success?type=purchase&id=${purchase._id}`
                );
            }
        } else {
            // Payment failed or not completed
            payment.paymentStatus = 'failed';
            payment.khaltiStatus = verification.status || status;
            await payment.save();

            // Get user info for failed payment notification
            const user = await User.findById(payment.userId);
            const userNumericId = user ? user.userId : null;

            // Create user notification for failed payment
            if (userNumericId) {
                await Notification.create({
                    userId: userNumericId,
                    title: 'Payment Failed ❌',
                    message: `Your payment of Rs. ${payment.amount} could not be processed. Please try again.`,
                    type: 'general',
                    metadata: {
                        paymentId: payment._id.toString(),
                        amount: payment.amount,
                        link: '/user/payment'
                    }
                });
                console.log('✅ User notification created for failed payment');
            }

            return res.redirect(
                `${app.frontendUrl}/payment/failed?error=Payment ${status || 'failed'}`
            );
        }

    } catch (error) {
        console.error('Khalti callback error:', error);
        res.redirect(`${app.frontendUrl}/payment/failed?error=Server error`);
    }
};

// @desc    eSewa v2 API callback endpoint (eSewa redirects user here after payment)
// @route   POST /api/payment/esewa/callback
// @access  Public (called by eSewa)
const esewaCallback = async (req, res) => {
    try {
        console.log('eSewa v2 callback received. Query:', req.query, 'Body:', req.body);

        let responseData = req.body;

        // eSewa v2 redirects via GET with ?data=...
        if (req.query.data) {
            try {
                const decodedString = Buffer.from(req.query.data, 'base64').toString('utf-8');
                responseData = JSON.parse(decodedString);
                console.log('Decoded eSewa v2 callback data:', responseData);
            } catch (err) {
                console.error('Error decoding eSewa callback data:', err);
                return res.redirect(`${app.frontendUrl}/payment/failed?error=Invalid+callback+data`);
            }
        }

        const { 
            total_amount, 
            transaction_uuid,
            product_code,
            signature,
            signed_field_names,
            status
        } = responseData;

        // Verify all required fields are present
        if (!signature || !signed_field_names || !total_amount || !transaction_uuid || !product_code) {
            console.error('eSewa callback: Missing required fields');
            return res.status(400).json({
                success: false,
                error: 'Invalid callback - missing required fields'
            });
        }

        // Verify signature integrity
        const signatureVerification = esewaService.verifyResponseSignature(responseData);
        
        if (!signatureVerification.success) {
            console.error('eSewa signature verification failed');
            return res.status(400).json({
                success: false,
                error: 'Invalid signature'
            });
        }

        // Find the payment record using transaction_uuid
        const payment = await Payment.findOne({ 
            esewaTransactionUuid: transaction_uuid
        });

        if (!payment) {
            console.error('eSewa callback: Payment record not found');
            return res.redirect(`${app.frontendUrl}/payment/failed?error=Payment+not+found`);
        }

        // Store complete callback data
        payment.callbackData = { esewaResponse: responseData };
        await payment.save();

        // Check if payment is completed
        if (status === 'COMPLETE') {
            // Update payment record
            payment.paymentStatus = 'completed';
            payment.esewaStatus = status;
            payment.esewaResponse = responseData;
            payment.completedAt = new Date();
            await payment.save();

            // Get user info for notification
            const user = await User.findById(payment.userId);
            const userNumericId = user ? user.userId : null;

            // Handle based on payment type (same logic as Khalti)
            if (payment.paymentType === 'appointment') {
                const updateResult = await Appointment.findByIdAndUpdate(
                    payment.appointmentDbId,
                    { status: 'completed', paymentId: payment._id },
                    { new: true }
                );

                if (updateResult && userNumericId) {
                    await Notification.create({
                        userId: userNumericId,
                        title: 'Payment Successful! 🎉',
                        message: `Your payment of Rs. ${payment.amount} for appointment #${payment.appointmentId} has been received successfully.`,
                        type: 'appointment',
                        metadata: {
                            appointmentId: payment.appointmentId.toString(),
                            paymentId: payment._id.toString(),
                            amount: payment.amount,
                            link: `/user/history/${payment.appointmentId}`
                        }
                    });
                }

                await earnPoints({
                    userId: payment.userId,
                    totalExpenditure: payment.amount,
                    referenceId: payment._id.toString(),
                    redeemedValue: Number(payment.callbackData?.loyalty?.redeemedValue || 0)
                });

                await AdminNotification.create({
                    title: 'Payment Received 💰',
                    message: `Received Rs. ${payment.amount} from ${user?.name || 'User'} for appointment #${payment.appointmentId}`,
                    type: 'payment',
                    priority: 'high',
                    metadata: {
                        appointmentId: payment.appointmentId.toString(),
                        userId: userNumericId,
                        paymentId: payment._id.toString(),
                        amount: payment.amount,
                        gateway: 'esewa'
                    }
                });

                return res.redirect(
                    `${app.frontendUrl}/payment/success?type=appointment&id=${payment.appointmentId}&gateway=esewa`
                );

            } else if (payment.paymentType === 'package') {
                const pkg = await Package.findById(payment.packageId);
                const packageCredits = pkg.credits || Math.floor(payment.amount / 100);
                const validityDays = pkg.validityDays || 365;
                const expiryDate = new Date();
                expiryDate.setDate(expiryDate.getDate() + validityDays);

                const packagePurchase = new PackagePurchase({
                    userId: payment.userId,
                    packageId: payment.packageId,
                    packageName: pkg.name,
                    totalCredits: packageCredits,
                    remainingCredits: packageCredits,
                    amount: payment.amount,
                    paymentId: payment._id,
                    expiryDate
                });

                await packagePurchase.save();
                await Package.findByIdAndUpdate(payment.packageId, { $inc: { totalPurchases: 1 } });
                payment.packagePurchaseId = packagePurchase._id;
                await payment.save();

                await earnPoints({
                    userId: payment.userId,
                    totalExpenditure: payment.amount,
                    referenceId: packagePurchase._id.toString(),
                    redeemedValue: Number(payment.callbackData?.loyalty?.redeemedValue || 0)
                });

                if (userNumericId) {
                    await Notification.create({
                        userId: userNumericId,
                        title: 'Package Purchased Successfully! 📦',
                        message: `Your payment of Rs. ${payment.amount} for ${pkg.name} has been received.`,
                        type: 'general',
                        metadata: {
                            packageId: payment.packageId.toString(),
                            packagePurchaseId: packagePurchase._id.toString(),
                            amount: payment.amount,
                            link: '/user/packages'
                        }
                    });
                }

                await AdminNotification.create({
                    title: 'Package Payment Received 💰',
                    message: `Received Rs. ${payment.amount} from ${user?.name || 'User'} for ${pkg.name} package`,
                    type: 'payment',
                    priority: 'high',
                    metadata: {
                        packageId: payment.packageId.toString(),
                        userId: userNumericId,
                        paymentId: payment._id.toString(),
                        amount: payment.amount,
                        gateway: 'esewa'
                    }
                });

                return res.redirect(
                    `${app.frontendUrl}/payment/success?type=package&id=${packagePurchase._id}&gateway=esewa`
                );

            } else if (payment.paymentType === 'purchase') {
                const cart = await Cart.findOne({ userId: payment.userId });
                if (cart && cart.items?.length) {
                    const purchase = await Purchase.create({
                        purchaseCode: `CAT-${Date.now()}`,
                        userId: payment.userId,
                        items: cart.items.map((i) => ({
                            catalogItemId: i.catalogItemId,
                            itemName: i.itemSnapshot?.itemName || 'Catalog Item',
                            quantity: i.quantity,
                            unitPrice: i.unitPrice,
                            totalPrice: i.totalPrice
                        })),
                        subtotal: cart.subtotal,
                        totalAmount: cart.subtotal,
                        paymentStatus: 'completed'
                    });

                    payment.purchaseId = purchase._id;
                    await payment.save();

                    await earnPoints({
                        userId: payment.userId,
                        totalExpenditure: purchase.totalAmount,
                        referenceId: purchase._id.toString(),
                        redeemedValue: Number(payment.callbackData?.loyalty?.redeemedValue || 0),
                        description: 'Points earned from catalog purchase'
                    });

                    cart.items = [];
                    cart.subtotal = 0;
                    await cart.save();

                    return res.redirect(
                        `${app.frontendUrl}/payment/success?type=purchase&id=${purchase._id}&gateway=esewa`
                    );
                }
            }
        }

        // Payment failed or not completed
        payment.paymentStatus = 'failed';
        payment.esewaStatus = status;
        await payment.save();

        const user = await User.findById(payment.userId);
        const userNumericId = user ? user.userId : null;

        if (userNumericId) {
            await Notification.create({
                userId: userNumericId,
                title: 'Payment Failed ❌',
                message: `Your payment of Rs. ${payment.amount} could not be processed.`,
                type: 'general',
                metadata: {
                    paymentId: payment._id.toString(),
                    amount: payment.amount,
                    link: '/user/payment'
                }
            });
        }

        return res.redirect(
            `${app.frontendUrl}/payment/failed?error=Payment+${status || 'failed'}`
        );

    } catch (error) {
        console.error('eSewa callback error:', error);
        res.redirect(`${app.frontendUrl}/payment/failed?error=Server+error`);
    }
};

// @desc    Verify payment status (called by frontend after callback)
// @route   POST /api/payment/verify
// @access  Private
const verifyPayment = async (req, res) => {
    try {
        const { pidx, purchaseOrderId } = req.body;
        const userId = req.user._id;

        if (!pidx && !purchaseOrderId) {
            return res.status(400).json({
                success: false,
                error: 'Missing pidx or purchaseOrderId'
            });
        }

        // Find payment
        let payment;
        if (pidx) {
            payment = await Payment.findOne({ 
                $or: [
                    { khaltiPidx: pidx }, 
                    { esewaBookingId: pidx },
                    { esewaTransactionUuid: pidx }
                ], 
                userId 
            });
        } else {
            payment = await Payment.findOne({ purchaseOrderId, userId });
        }

        if (!payment) {
            return res.status(404).json({
                success: false,
                error: 'Payment not found'
            });
        }

        // If payment is already completed, return success
        if (payment.paymentStatus === 'completed') {
            return res.json({
                success: true,
                status: 'completed',
                paymentType: payment.paymentType,
                referenceId: payment.appointmentId || payment.packagePurchaseId || payment.purchaseId
            });
        }

        // Handle eSewa payment verification
        if (payment.gateway === 'esewa') {
            const esewaId = payment.esewaTransactionUuid || payment.esewaBookingId;
            if (esewaId) {
                const verification = await esewaService.checkPaymentStatus(
                    esewaId, 
                    payment.amount
                );

                if (verification.success && verification.status === 'COMPLETE') {
                    payment.paymentStatus = 'completed';
                    payment.esewaStatus = verification.status;
                    payment.completedAt = new Date();
                    await payment.save();

                    return res.json({
                        success: true,
                        status: 'completed',
                        paymentType: payment.paymentType,
                        referenceId: payment.appointmentId || payment.packagePurchaseId || payment.purchaseId
                    });
                }
            }
        }

        // Handle Khalti payment verification
        if (payment.khaltiPidx) {
            const verification = await khaltiService.lookupPayment(payment.khaltiPidx);

            if (verification.success && verification.status === 'Completed') {
                payment.paymentStatus = 'completed';
                payment.khaltiStatus = verification.status;
                payment.khaltiTransactionId = verification.transactionId;
                payment.completedAt = new Date();
                await payment.save();

                return res.json({
                    success: true,
                    status: 'completed',
                    paymentType: payment.paymentType,
                    referenceId: payment.appointmentId || payment.packagePurchaseId || payment.purchaseId
                });
            }
        }

        // Payment not completed
        res.json({
            success: true,
            status: payment.paymentStatus,
            gatewayStatus: payment.khaltiStatus || payment.esewaStatus
        });

    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

// @desc    Get payment history for user
// @route   GET /api/payment/history
// @access  Private
const getPaymentHistory = async (req, res) => {
    try {
        const userId = req.user._id;
        const { page = 1, limit = 10 } = req.query;

        const payments = await Payment.find({ userId })
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('appointmentId', 'date time serviceName')
            .populate('packageId', 'name credits');

        const total = await Payment.countDocuments({ userId });

        res.json({
            success: true,
            payments,
            totalPages: Math.ceil(total / limit),
            currentPage: page
        });

    } catch (error) {
        console.error('Get payment history error:', error);
        res.status(500).json({
            success: false,
            error: 'Server error'
        });
    }
};

export {
    initiatePayment,
    khaltiCallback,
    esewaCallback,
    verifyPayment,
    getPaymentHistory,
    getTotalIncome
};
