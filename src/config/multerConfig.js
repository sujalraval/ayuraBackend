const multer = require('multer');
const path = require('path');
const { getFilePath, ensureDirectoryExists, getUploadDestination } = require('../utils/fileUtils');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Get the appropriate subfolder based on route
        const subfolder = getUploadDestination(req);

        // Get the full folder path - remove the extra 'src'
        const folder = path.join(__dirname, '..', 'uploads', subfolder);

        // Create directory if it doesn't exist
        if (ensureDirectoryExists(folder)) {
            console.log('Multer destination folder:', folder);
            console.log('Absolute path:', path.resolve(folder));
            cb(null, folder);
        } else {
            cb(new Error('Failed to create upload directory'), null);
        }
    },

    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const filename = uniqueSuffix + path.extname(file.originalname);

        console.log('Generated filename:', filename);
        console.log('Original filename:', file.originalname);

        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {
    console.log('File filter - MIME type:', file.mimetype);
    console.log('File filter - Original name:', file.originalname);

    // Allow both images and PDFs
    const allowedTypes = [
        'image/jpeg',
        'image/png',
        'image/jpg',
        'application/pdf',
        'application/octet-stream' // Fallback for some PDF uploads
    ];

    const fileExt = path.extname(file.originalname).toLowerCase();
    const isPdf = fileExt === '.pdf';

    if (!allowedTypes.includes(file.mimetype) && !isPdf) {
        console.log('File rejected - invalid MIME type');
        return cb(new Error('Only JPEG, JPG, PNG images and PDF files are allowed'), false);
    }

    console.log('File accepted');
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