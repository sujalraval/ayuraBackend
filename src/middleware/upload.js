const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Dynamic folder based on route
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let folder = 'uploads';

        // Check which folder to use based on the URL path
        if (req.baseUrl.includes('testimonials')) {
            folder += '/testimonials';
        } else if (req.baseUrl.includes('expectations')) {
            folder += '/expectations';
        } else if (req.originalUrl.includes('upload-report')) {  // Add this condition for report uploads
            folder += '/reports';
        } else {
            folder += '/others'; // fallback
        }

        // Ensure folder exists
        fs.mkdirSync(folder, { recursive: true });

        cb(null, folder);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// Updated file filter to allow both images and PDFs
const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error('Only JPEG, JPG, PNG images and PDF files are allowed'), false);
    }
    cb(null, true);
};

const upload = multer({ 
    storage, 
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

module.exports = upload;