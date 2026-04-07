import mongoose from 'mongoose';
import nodemailer from 'nodemailer';

const transporter =  nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});
    
export const sendPasswordResetEmail = async (email, pin) => {
    try {
        const mailOptions = {
            from: `"Servicify Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Password Reset PIN - Servicify',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Password Reset Request</h2>
                    <p>You requested to reset your password for Servicify account.</p>
                    <div style="background: #f4f4f4; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center;">
                        <h3 style="margin: 0; color: #007bff; font-size: 32px; letter-spacing: 5px;">${pin}</h3>
                        <p style="margin: 10px 0 0 0; color: #666;">This PIN will expire in 15 minutes</p>
                    </div>
                    <p>If you didn't request this, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="color: #999; font-size: 12px;">This is an automated message, please do not reply.</p>
                </div>
      `
        };
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending password reset email:', error);
        return false;
    }
};

export const sendEmailVerification = async (email, pin) => {
    try {
        const mailOptions = {
            from: `"Servicify Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Email Verification - Servicify',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">Email Verification</h2>
                    <p>Thank you for registering with Servicify! Please verify your email address.</p>
                    <div style="background: #f4f4f4; padding: 20px; margin: 20px 0; border-radius: 5px; text-align: center;">
                        <h3 style="margin: 0; color: #28a745; font-size: 32px; letter-spacing: 5px;">${pin}</h3>
                        <p style="margin: 10px 0 0 0; color: #666;">Enter this 6-digit code to verify your email. This code will expire in 15 minutes.</p>
                    </div>
                    <p>If you didn't register for a Servicify account, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
                    <p style="color: #999; font-size: 12px;">This is an automated message, please do not reply.</p>
                </div>
      `
        };
        await transporter.sendMail(mailOptions);
        return true;
    } catch (error) {
        console.error('Error sending email verification:', error);
        return false;
    }
};