import mongoose from 'mongoose';
import nodemailer from 'nodemailer';

export const transporter =  nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const formatCurrency = (amount = 0) =>
  `Nrs ${Number(amount || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
    
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

export const sendPaymentInvoiceEmail = async ({
  to,
  customerName,
  appointmentId,
  serviceType,
  serviceDate,
  serviceTime,
  billItems = [],
  invoiceUrl
}) => {
  try {
    const subtotal = billItems.reduce((sum, item) => sum + Number(item.itemPrice || 0), 0);
    const serviceChargeTotal = billItems.reduce((sum, item) => sum + Number(item.serviceCharge || 0), 0);
    const grandTotal = subtotal + serviceChargeTotal;

    const billRowsHtml = billItems.map((item, index) => {
      const itemPrice = Number(item.itemPrice || 0);
      const serviceCharge = Number(item.serviceCharge || 0);
      const total = itemPrice + serviceCharge;
      return `
        <tr>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${index + 1}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;">${item.itemName || 'Service Item'}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(itemPrice)}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;">${formatCurrency(serviceCharge)}</td>
          <td style="padding:10px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;">${formatCurrency(total)}</td>
        </tr>
      `;
    }).join('');

    const mailOptions = {
      from: `"Servicify Billing" <${process.env.EMAIL_USER}>`,
      to,
      subject: `Payment Required - Invoice #${appointmentId}`,
      html: `
        <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;">
          <div style="max-width:720px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <div style="background:#1d4ed8;color:#ffffff;padding:20px 24px;">
              <h2 style="margin:0;font-size:22px;">Servicify Digital Invoice</h2>
              <p style="margin:8px 0 0 0;opacity:0.95;">Appointment #${appointmentId}</p>
            </div>

            <div style="padding:24px;">
              <p style="margin:0 0 14px 0;color:#111827;">Hi ${customerName || 'Customer'},</p>
              <p style="margin:0 0 18px 0;color:#374151;line-height:1.6;">
                Your <strong>${serviceType || 'vehicle'}</strong> service is completed and payment is now due.
                Please review your digital bill below.
              </p>

              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:18px;">
                <p style="margin:0 0 6px 0;color:#4b5563;"><strong>Date:</strong> ${serviceDate || 'N/A'}</p>
                <p style="margin:0;color:#4b5563;"><strong>Time:</strong> ${serviceTime || 'N/A'}</p>
              </div>

              <table style="width:100%;border-collapse:collapse;font-size:14px;">
                <thead>
                  <tr style="background:#eff6ff;color:#1e3a8a;">
                    <th style="padding:10px;text-align:left;">S.N</th>
                    <th style="padding:10px;text-align:left;">Item</th>
                    <th style="padding:10px;text-align:right;">Item Price</th>
                    <th style="padding:10px;text-align:right;">Service Charge</th>
                    <th style="padding:10px;text-align:right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${billRowsHtml}
                </tbody>
              </table>

              <div style="margin-top:16px;border-top:1px solid #e5e7eb;padding-top:12px;">
                <p style="margin:6px 0;text-align:right;color:#374151;">Subtotal: <strong>${formatCurrency(subtotal)}</strong></p>
                <p style="margin:6px 0;text-align:right;color:#374151;">Service Charge: <strong>${formatCurrency(serviceChargeTotal)}</strong></p>
                <p style="margin:10px 0 0 0;text-align:right;color:#111827;font-size:16px;">Grand Total: <strong>${formatCurrency(grandTotal)}</strong></p>
              </div>

              <div style="text-align:center;margin-top:24px;">
                <a href="${invoiceUrl}" target="_blank" rel="noopener noreferrer"
                   style="display:inline-block;background:#1d4ed8;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:8px;font-weight:600;">
                  View PDF Invoice
                </a>
              </div>
            </div>

            <div style="padding:16px 24px;background:#f9fafb;border-top:1px solid #e5e7eb;">
              <p style="margin:0;color:#6b7280;font-size:12px;">
                This is an automated billing email from Servicify.
              </p>
            </div>
          </div>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.error('Error sending payment invoice email:', error);
    return false;
  }
};
