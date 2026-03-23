// servicify-backend/Payment/services/khaltiService.js

import axios from 'axios';
import { khalti, app } from '../Config/khaltiConfig.js';

class KhaltiService {
    constructor() {
        this.baseUrl = khalti.baseUrl;
        this.secretKey = khalti.secretKey;
        this.returnUrl = khalti.returnUrl;
        this.websiteUrl = app.frontendUrl;
    }

    // Generate unique purchase order ID
    generatePurchaseOrderId(type, id) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        return `${type}-${id}-${timestamp}-${random}`;
    }

    // Initiate payment with Khalti
    async initiatePayment({
        amount,           // in rupees
        purchaseOrderId,
        purchaseOrderName,
        customerInfo = {},
        amountBreakdown = [],
        productDetails = []
    }) {
        try {
            // Convert amount to paisa
            const amountInPaisa = amount * 100;

            const payload = {
                return_url: this.returnUrl,
                website_url: this.websiteUrl,
                amount: amountInPaisa,
                purchase_order_id: purchaseOrderId,
                purchase_order_name: purchaseOrderName,
                customer_info: customerInfo
            };

            // Add optional fields if provided
            if (amountBreakdown.length > 0) {
                payload.amount_breakdown = amountBreakdown;
            }

            if (productDetails.length > 0) {
                payload.product_details = productDetails;
            }

            console.log('Initiating Khalti payment:', payload);

            const response = await axios.post(
                `${this.baseUrl}/epayment/initiate/`,
                payload,
                {
                    headers: {
                        'Authorization': `Key ${this.secretKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                data: response.data,
                pidx: response.data.pidx,
                paymentUrl: response.data.payment_url
            };

        } catch (error) {
            console.error('Khalti initiation error:', error.response?.data || error.message);

            return {
                success: false,
                error: error.response?.data?.detail || 'Payment initiation failed',
                details: error.response?.data
            };
        }
    }

    // Verify payment status using pidx
    async lookupPayment(pidx) {
        try {
            const response = await axios.post(
                `${this.baseUrl}/epayment/lookup/`,
                { pidx },
                {
                    headers: {
                        'Authorization': `Key ${this.secretKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return {
                success: true,
                data: response.data,
                status: response.data.status,
                transactionId: response.data.transaction_id
            };

        } catch (error) {
            console.error('Khalti lookup error:', error.response?.data || error.message);

            return {
                success: false,
                error: error.response?.data?.detail || 'Payment verification failed',
                details: error.response?.data
            };
        }
    }
}

const khaltiService = new KhaltiService();
export default khaltiService;
