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

/**
 * Sends a vendor invitation email with a secure activation link.
 * @param {string} toEmail - Vendor business email
 * @param {string} businessName - Vendor shop/business name
 * @param {string} username - Generated vendor username
 * @param {string} activationLink - Direct activation URL with secure token
 * @param {number} [expiryHours=48] - Token validity in hours
 */
async function sendVendorInvitationEmail(toEmail, businessName, username, activationLink, expiryHours = 48) {
    try {
        const mailOptions = {
            from: process.env.MAIL_FROM || `"Drinkit Platform" drinkit3085@gmail.com`,
            to: toEmail,
            subject: `Drinkit - Vendor Invitation for ${businessName}`,
            text: `Hello,\n\nYou have been invited to join Drinkit as a vendor for ${businessName}.\n\nYour Username: ${username}\n\nPlease activate your account and set your secure password by clicking the link below:\n${activationLink}\n\nThis activation link will expire in ${expiryHours} hours.\n\nRegards,\nDrinkit Operations Team`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e8e4e5; border-radius: 14px; background-color: #ffffff;">
                    <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px solid #731b32; padding-bottom: 15px;">
                        <h2 style="color: #731b32; margin: 0; font-size: 26px; letter-spacing: -0.5px;">Drinkit <span style="font-weight: 400; color: #555;">Vendor Portal</span></h2>
                    </div>
                    <div style="padding: 10px 0;">
                        <p style="font-size: 16px; color: #211b1d; line-height: 1.5;">Welcome <strong>${businessName}</strong>,</p>
                        <p style="font-size: 15px; color: #444; line-height: 1.6;">
                            Congratulations! Your shop has been registered on the <strong>Drinkit Online Multi-Vendor Platform</strong>.
                            To start managing your beverage catalog, inventory, and customer orders, please activate your account.
                        </p>
                        <div style="background-color: #fdf5f7; border-left: 4px solid #731b32; padding: 14px 18px; border-radius: 6px; margin: 20px 0;">
                            <p style="margin: 0 0 6px 0; font-size: 14px; color: #555;">Your Assigned Username:</p>
                            <p style="margin: 0; font-size: 18px; font-weight: 700; color: #731b32;">${username}</p>
                        </div>
                        <div style="text-align: center; margin: 35px 0;">
                            <a href="${activationLink}" style="background-color: #731b32; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 700; display: inline-block; box-shadow: 0 4px 12px rgba(115, 27, 50, 0.25);">
                                Activate Vendor Account & Set Password
                            </a>
                        </div>
                        <p style="font-size: 13px; color: #777; line-height: 1.5;">
                            Or copy and paste this link into your browser:<br>
                            <a href="${activationLink}" style="color: #731b32; word-break: break-all;">${activationLink}</a>
                        </p>
                        <p style="font-size: 13px; color: #888; margin-top: 20px;">
                            ⏱️ This one-time link is valid for <strong>${expiryHours} hours</strong>. For security reasons, never share this link with anyone.
                        </p>
                    </div>
                    <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #e8e4e5; font-size: 12px; color: #888; text-align: center;">
                        <p style="margin: 0;">Drinkit Multi-Vendor Beverage Delivery Platform<br>This is an automated operational notification.</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✉️ Vendor invitation email sent to ${toEmail}. Message ID: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error("❌ Failed to send vendor invitation email via SMTP:", error.message);
        throw error;
    }
}

module.exports = {
    sendOtpEmail,
    sendVendorInvitationEmail
};
