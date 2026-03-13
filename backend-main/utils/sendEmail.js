// backend/utils/sendEmail.js
const nodemailer = require('nodemailer');

/**
 * Send an email using SMTP credentials from .env
 * @param {object} options - { to, subject, html }
 */
const sendEmail = async ({ to, subject, html }) => {
    const transporter = nodemailer.createTransport({
        host:   process.env.EMAIL_HOST,
        port:   parseInt(process.env.EMAIL_PORT || '587'),
        secure: process.env.EMAIL_PORT === '465',  // true for port 465
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });

    const mailOptions = {
        from: `"${process.env.EMAIL_FROM_NAME || 'SmartArch'}" <${process.env.EMAIL_USER}>`,
        to,
        subject,
        html
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`📧 Email sent: ${info.messageId}`);
    return info;
};

module.exports = sendEmail;
