/**
 * eSewa v2 API Service
 * 
 * Handles eSewa ePay form-based payment integration following v2 API specifications
 * Official Endpoint: https://rc-epay.esewa.com.np/api/epay/main/v2/form
 * 
 * Required Fields:
 * - amount, tax_amount, product_service_charge, product_delivery_charge, total_amount
 * - transaction_uuid, product_code, success_url, failure_url
 * - signed_field_names, signature
 * 
 * Signature Rules:
 * - signed_field_names MUST be: "total_amount,transaction_uuid,product_code"
 * - Message format: "total_amount=XXXX,transaction_uuid=XXXX,product_code=XXXX"
 * - HMAC-SHA256 algorithm, Base64 encoded output
 */

import crypto from 'crypto';
import axios from 'axios';
import { esewa, app } from '../Config/esewaConfig.js';

// Helper to check if a string is valid Base64
const isBase64 = (str) => {
    if (!str || typeof str !== 'string') return false;
    const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
    return base64Regex.test(str.trim());
};

// Helper to get key buffer, dynamically decoding if base64, otherwise utf-8
const getKeyBuffer = (key) => {
    if (isBase64(key)) {
        return Buffer.from(key.trim(), 'base64');
    }
    return Buffer.from(key, 'utf-8');
};

class EsewaService {
    constructor() {
        this.v2ApiEndpoint = esewa.v2ApiEndpoint;
        this.productCode = esewa.productCode;
        this.secretKey = esewa.secretKey;
        this.successUrl = esewa.successUrl;
        this.failureUrl = esewa.failureUrl;
    }

    /**
     * Generate HMAC-SHA256 signature in Base64 format
     * @param {string} message - The raw message string to sign
     * @param {string} key - The secret key for HMAC (Base64 encoded)
     * @returns {string} Base64 encoded signature
     */
    generateSignature(message, key) {
        try {
            const keyBuffer = getKeyBuffer(key);
            const hmac = crypto.createHmac('sha256', keyBuffer);
            hmac.update(message);
            return hmac.digest('base64');
        } catch (error) {
            console.error('Signature generation error:', error);
            throw new Error('Failed to generate signature');
        }
    }

    /**
     * Generate v2 API signature (exactly as per eSewa spec)
     * Message format: total_amount=XXXX,transaction_uuid=XXXX,product_code=XXXX
     * signed_field_names: "total_amount,transaction_uuid,product_code"
     */
    generateEsewaV2Signature(totalAmount, transactionUuid) {
        try {
            // CRITICAL: Exact order and format as per eSewa v2 spec
            // Ensure amounts are formatted to 2 decimal places
            const amount = Number(totalAmount).toFixed(2);
            const uuid = String(transactionUuid).trim();
            const code = String(this.productCode).trim();

            const message = `total_amount=${amount},transaction_uuid=${uuid},product_code=${code}`;
            console.log('=== eSewa Signature Debug ===');
            console.log('Total Amount (input):', totalAmount);
            console.log('Total Amount (formatted):', amount);
            console.log('Transaction UUID:', uuid);
            console.log('Product Code:', code);
            console.log('Message:', message);
            console.log('Secret Key (Base64):', this.secretKey.substring(0, 20) + '...');

            const keyBuffer = getKeyBuffer(this.secretKey);
            console.log('Resolved Key Buffer Length:', keyBuffer.length, 'bytes');

            const hmac = crypto.createHmac('sha256', keyBuffer);
            hmac.update(message);
            const signature = hmac.digest('base64');

            console.log('Generated Signature:', signature);
            console.log('========================\n');
            return signature;
        } catch (error) {
            console.error('eSewa v2 signature generation error:', error);
            throw error;
        }
    }

    /**
     * Generate unique transaction UUID
     * Format: TXN-{timestamp}-{random}
     * @returns {string} Unique transaction UUID
     */
    generateTransactionUuid() {
        try {
            const timestamp = Date.now().toString(36).toUpperCase();
            const random = Math.random().toString(36).substring(2, 10).toUpperCase();
            const uuid = `TXN-${timestamp}-${random}`;
            console.log('Generated transaction UUID:', uuid);
            return uuid;
        } catch (error) {
            console.error('UUID generation error:', error);
            throw new Error('Failed to generate transaction UUID');
        }
    }

    /**
     * Initiate eSewa v2 payment
     * Returns form payload data for frontend to submit to eSewa
     * 
     * @param {Object} options - Payment options
     * @param {number} options.amount - Item amount (before tax/charges)
     * @param {number} options.taxAmount - Tax amount (default: 0)
     * @param {number} options.serviceCharge - Service charge (default: 0)
     * @param {number} options.deliveryCharge - Delivery charge (default: 0)
     * @param {string} options.transactionUuid - Unique transaction UUID
     * @returns {Object} Form payload for eSewa
     */
    generatePaymentFormPayload({
        amount = 0,
        taxAmount = 0,
        serviceCharge = 0,
        deliveryCharge = 0,
        transactionUuid
    }) {
        try {
            // Validate inputs
            const numAmount = Number(amount);
            const numTax = Number(taxAmount) || 0;
            const numService = Number(serviceCharge) || 0;
            const numDelivery = Number(deliveryCharge) || 0;

            if (numAmount <= 0 || !Number.isFinite(numAmount)) {
                throw new Error('Invalid amount');
            }

            if (!transactionUuid) {
                throw new Error('Transaction UUID is required');
            }

            // Calculate total amount - ensure it is formatted to 2 decimal places
            const totalAmount = (numAmount + numTax + numService + numDelivery).toFixed(2);

            console.log('Payload Generation:');
            console.log('  Item Amount:', numAmount);
            console.log('  Tax Amount:', numTax);
            console.log('  Service Charge:', numService);
            console.log('  Delivery Charge:', numDelivery);
            console.log('  Total Amount:', totalAmount);

            // Generate signature using v2 spec - pass formatted totalAmount
            const signature = this.generateEsewaV2Signature(totalAmount, transactionUuid);

            // Build the form payload exactly as per eSewa v2 spec
            const payload = {
                // Amount fields - as strings with 2 decimal places
                amount: numAmount.toFixed(2),
                tax_amount: numTax.toFixed(2),
                product_service_charge: numService.toFixed(2),
                product_delivery_charge: numDelivery.toFixed(2),
                total_amount: totalAmount,

                // Transaction identifiers
                transaction_uuid: transactionUuid,
                product_code: this.productCode,

                // Redirect URLs
                success_url: this.successUrl,
                failure_url: this.failureUrl,

                // Signature fields (CRITICAL: exact format)
                signed_field_names: 'total_amount,transaction_uuid,product_code',
                signature: signature
            };

            console.log('eSewa v2 payment payload:', payload);
            return {
                success: true,
                payload,
                totalAmount,
                transactionUuid
            };
        } catch (error) {
            console.error('Payment payload generation error:', error);
            return {
                success: false,
                error: error.message || 'Failed to generate payment payload'
            };
        }
    }

    verifyResponseSignature(responseData) {
        try {
            const { signature, signed_field_names } = responseData;

            if (!signature) {
                return {
                    success: false,
                    error: 'Missing signature for verification'
                };
            }

            let message = '';
            if (signed_field_names) {
                // Dynamically reconstruct the message based on signed_field_names as per eSewa spec
                const signedFields = signed_field_names.split(',');
                const messageParts = signedFields.map(field => {
                    const cleanField = field.trim();
                    const value = responseData[cleanField];
                    return `${cleanField}=${value !== undefined ? value : ''}`;
                });
                message = messageParts.join(',');
            } else {
                // Fallback to default v2 message format if signed_field_names is missing
                const { total_amount, transaction_uuid, product_code } = responseData;
                if (!total_amount || !transaction_uuid || !product_code) {
                    return {
                        success: false,
                        error: 'Missing required fields for default signature verification'
                    };
                }
                message = `total_amount=${total_amount},transaction_uuid=${transaction_uuid},product_code=${product_code}`;
            }

            console.log('=== eSewa Signature Verification Debug ===');
            console.log('Message to verify:', message);
            console.log('Received signature:', signature);

            // Resolve key buffer before generating signature
            const keyBuffer = getKeyBuffer(this.secretKey);
            const hmac = crypto.createHmac('sha256', keyBuffer);
            hmac.update(message);
            const expectedSignature = hmac.digest('base64');

            console.log('Expected signature:', expectedSignature);

            // Compare signatures
            const isValid = expectedSignature === signature;

            if (isValid) {
                console.log('✅ eSewa response signature verified successfully');
                return {
                    success: true,
                    verified: true
                };
            } else {
                console.error('❌ eSewa response signature verification failed');
                return {
                    success: false,
                    verified: false,
                    error: 'Signature mismatch - possible tampering'
                };
            }
        } catch (error) {
            console.error('Signature verification error:', error);
            return {
                success: false,
                error: 'Signature verification failed'
            };
        }
    }

    /**
     * Generate purchase order ID
     * Used to track orders uniquely in the system
     */
    generatePurchaseOrderId(prefix, itemId) {
        try {
            const timestamp = Date.now();
            const random = Math.random().toString(36).substring(2, 8).toUpperCase();
            return `${prefix}-${itemId}-${timestamp}-${random}`;
        } catch (error) {
            console.error('Purchase order ID generation error:', error);
            throw new Error('Failed to generate purchase order ID');
        }
    }

    /**
     * Check transaction status directly from eSewa API
     * @param {string} transactionUuid - Transaction UUID
     * @param {number} totalAmount - Total amount of transaction
     */
    async checkPaymentStatus(transactionUuid, totalAmount) {
        try {
            const amount = String(Math.floor(Number(totalAmount)));
            const uuid = String(transactionUuid).trim();
            const code = String(this.productCode).trim();
            
            // Replace /main/v2/form with /transaction/status/ to get the status endpoint
            const statusUrl = this.v2ApiEndpoint.replace('/main/v2/form', '/transaction/status/');
            
            console.log(`Checking eSewa status at: ${statusUrl} for uuid: ${uuid}, amount: ${amount}`);
            
            const response = await axios.get(statusUrl, {
                params: {
                    product_code: code,
                    total_amount: amount,
                    transaction_uuid: uuid
                }
            });
            
            console.log('eSewa status check response:', response.data);
            
            if (response.data && response.data.status === 'COMPLETE') {
                return {
                    success: true,
                    status: 'COMPLETE',
                    data: response.data
                };
            }
            
            return {
                success: false,
                status: response.data ? response.data.status : 'UNKNOWN',
                data: response.data
            };
        } catch (error) {
            console.error('eSewa status check error:', error.response?.data || error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

const esewaService = new EsewaService();
export default esewaService;