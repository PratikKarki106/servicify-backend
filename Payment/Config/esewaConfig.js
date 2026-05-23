import { config } from 'dotenv';
config();

/**
 * eSewa v2 API Configuration
 * Sandbox Integration for ePay form-based payment
 * 
 * Official Endpoint: https://rc-epay.esewa.com.np/api/epay/main/v2/form
 * Product Code: EPAYTEST
 * Secret Key: 8gBm/:&EnhH.1/q
 */
export const app = {
    frontendUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    backendUrl: process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`
};

export const esewa = {
    // v2 API Configuration (Form-based)
    v2ApiEndpoint: process.env.ESEWA_V2_API_ENDPOINT || 'https://rc-epay.esewa.com.np/api/epay/main/v2/form',
    productCode: process.env.ESEWA_PRODUCT_CODE || 'EPAYTEST',
    secretKey: process.env.ESEWA_SECRET_KEY || '8gBm/:&EnhH.1/q',
    
    // Success and Failure URLs (redirect back to backend callback first)
    successUrl: process.env.ESEWA_CALLBACK_URL || `${app.backendUrl}/payment/esewa/callback`,
    failureUrl: process.env.ESEWA_CALLBACK_URL || `${app.backendUrl}/payment/esewa/callback`,
};