import { config } from 'dotenv';
config();

export const khalti = {
    publicKey: process.env.KHALTI_PUBLIC_KEY,
    secretKey: process.env.KHALTI_SECRET_KEY,
    merchantId: process.env.KHALTI_MERCHANT_ID,
    baseUrl: process.env.KHALTI_BASE_URL,
    returnUrl: process.env.KHALTI_RETURN_URL
};
export const app = {
    frontendUrl: process.env.CLIENT_URL || 'http://localhost:5173',
    backendUrl: `http://localhost:${process.env.PORT || 5000}`
};