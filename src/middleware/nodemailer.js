const nodemailer = require('nodemailer');

const sendApprovalEmail = async (to, timeSlot) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.ADMIN_EMAIL,
            pass: process.env.ADMIN_PASS
        }
    });

    const mailOptions = {
        from: process.env.ADMIN_EMAIL,
        to,
        subject: 'Lab Test Request Approved',
        html: `
      <h2>Your request has been approved!</h2>
      <p>A lab technician will visit you during your selected time slot: <strong>${timeSlot}</strong>.</p>
      <p>Thank you for choosing our service!</p>
    `
    };

    await transporter.sendMail(mailOptions);
};
