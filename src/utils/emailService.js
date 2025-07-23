const nodemailer = require('nodemailer');
const path = require('path');
const ejs = require('ejs');

// Create transporter
const transporter = nodemailer.createTransport({
    service: process.env.EMAIL_SERVICE,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Email templates directory
const templatesDir = path.join(__dirname, '../emails');

/**
 * Send order approval email
 */
const sendApprovalEmail = async (toEmail, timeSlot) => {
    try {
        const html = await ejs.renderFile(
            path.join(templatesDir, 'approvalEmail.ejs'),
            { timeSlot }
        );

        const mailOptions = {
            from: `"HealthCare App" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: 'Your Lab Test Request Has Been Approved',
            html
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending approval email:', error);
        throw error;
    }
};

/**
 * Send report uploaded email
 */
const sendReportUploadEmail = async (toEmail, orderId) => {
    try {
        const html = await ejs.renderFile(
            path.join(templatesDir, 'reportUploaded.ejs'),
            { orderId }
        );

        const mailOptions = {
            from: `"HealthCare App" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: 'Your Lab Test Report is Ready',
            html
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending report uploaded email:', error);
        throw error;
    }
};

/**
 * Send order confirmation email
 */
const sendOrderConfirmationEmail = async (toEmail, order) => {
    try {
        const html = await ejs.renderFile(
            path.join(templatesDir, 'orderConfirmation.ejs'),
            { order }
        );

        const mailOptions = {
            from: `"HealthCare App" <${process.env.EMAIL_USER}>`,
            to: toEmail,
            subject: 'Your Lab Test Order Confirmation',
            html
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending order confirmation email:', error);
        throw error;
    }
};

module.exports = {
    sendApprovalEmail,
    sendReportUploadEmail,
    sendOrderConfirmationEmail
};