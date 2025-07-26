const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        let folder = path.join(__dirname, '..', 'uploads'); // Ensure we're in the project root

        // Check the route to determine the correct subfolder
        if (req.originalUrl.includes('/upload-report')) {
            folder = path.join(folder, 'reports');
        } else if (req.baseUrl.includes('testimonials')) {
            folder = path.join(folder, 'testimonials');
        } else if (req.baseUrl.includes('expectations')) {
            folder = path.join(folder, 'expectations');
        } else {
            folder = path.join(folder, 'others');
        }

        // Create directory if it doesn't exist
        fs.mkdirSync(folder, { recursive: true });
        cb(null, folder);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb) => {
    // Allow both images and PDFs
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