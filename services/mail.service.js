// ==========================================================
// DRINKIT - MAIL SERVICE
// ==========================================================

const nodemailer = require("nodemailer");

// Create transport configuration using environment variables
const transporter = nodemailer.createTransport({
    host: process.env.MAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.MAIL_PORT) || 587,
    secure: Number(process.env.MAIL_PORT) === 465, // True for 465, false for other ports
    auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASSWORD
    }
});

/**
 * Sends a verification OTP email to a user.
 * @param {string} toEmail - The recipient's email address.
 * @param {string} firstName - The recipient's first name.
 * @param {string} otpCode - The 6-digit OTP code.
 * @returns {Promise<boolean>}
 */
async function sendOtpEmail(toEmail, firstName, otpCode) {
    try {
        const mailOptions = {
            from: process.env.MAIL_FROM || `"Drinkit Team" drinkit3085@gmail.com`,
            to: toEmail,
            subject: "Drinkit - Verify Your Email",
            text: `Hello ${firstName},\n\nYour Drinkit verification OTP is:\n\n${otpCode}\n\nThis OTP is valid for a limited time.\n\nIf you did not request this verification, please ignore this email.\n\nRegards,\nDrinkit Team`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e8e4e5; border-radius: 12px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px solid #731b32; padding-bottom: 15px;">
                        <h2 style="color: #731b32; margin: 0; font-size: 26px;">Drinkit</h2>
                    </div>
                    <div style="padding: 10px 0;">
                        <p style="font-size: 16px; color: #211b1d; line-height: 1.5;">Hello <strong>${firstName}</strong>,</p>
                        <p style="font-size: 16px; color: #211b1d; line-height: 1.5;">Your Drinkit verification OTP is:</p>
                        <div style="text-align: center; margin: 30px 0;">
                            <span style="font-size: 32px; font-weight: 800; color: #731b32; letter-spacing: 4px; background-color: #f8eef1; padding: 12px 24px; border-radius: 8px; border: 1px dashed #731b32;">${otpCode}</span>
                        </div>
                        <p style="font-size: 14px; color: #707070; line-height: 1.5;">This OTP is valid for a limited time of <strong>5 minutes</strong>.</p>
                        <p style="font-size: 14px; color: #707070; line-height: 1.5;">If you did not request this verification, please ignore this email.</p>
                    </div>
                    <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e8e4e5; font-size: 12px; color: #707070; text-align: center;">
                        <p style="margin: 0;">Regards,<br><strong>Drinkit Team</strong></p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✉️ Email OTP sent successfully to ${toEmail}. Message ID: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error("❌ Nodemailer Send Mail Error:", error);
        throw error;
    }
}

module.exports = {
    sendOtpEmail
};
