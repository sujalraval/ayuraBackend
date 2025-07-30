const path = require('path');
const fs = require('fs');

// Helper function to generate full file URL
const getImageUrl = (req, filename, subfolder = '') => {
    if (!filename) return null;

    // If it's already a full URL, return as is
    if (filename.startsWith('http')) {
        return filename;
    }

    // Determine the correct host based on the request
    const protocol = 'https';
    let host = req.get('host') || 'ayuras.life';

    // If request comes from admin, use main domain for images
    if (host.includes('admin.ayuras.life')) {
        host = 'ayuras.life';
    }

    // Construct URL path with subfolder
    let urlPath;
    if (subfolder) {
        urlPath = `uploads/${subfolder}/${filename}`;
    } else {
        urlPath = `uploads/${filename}`;
    }

    const fullUrl = `${protocol}://${host}/${urlPath}`;

    console.log('Generated file URL:', fullUrl);
    console.log('Host:', host, 'Subfolder:', subfolder, 'Filename:', filename);

    return fullUrl;
};

// Helper function to get the physical file path
const getFilePath = (filename, subfolder = '') => {
    if (!filename) return null;

    // If it's a full URL, extract filename
    if (filename.startsWith('http')) {
        const urlParts = filename.split('/');
        filename = urlParts[urlParts.length - 1];
    }

    // Use the correct base path - /var/www/uploads instead of src/uploads
    const basePath = '/var/www/uploads';

    if (subfolder) {
        return path.join(basePath, subfolder, filename);
    }
    return path.join(basePath, filename);
};

// Helper function to verify file exists
const verifyFileExists = (filePath) => {
    const exists = fs.existsSync(filePath);
    console.log(`File ${filePath} exists:`, exists);
    console.log(`Absolute path: ${path.resolve(filePath)}`);

    if (exists) {
        const stats = fs.statSync(filePath);
        console.log(`File size: ${stats.size} bytes`);
        console.log(`Last modified: ${stats.mtime}`);
    }

    return exists;
};

// Helper function to delete file safely
const deleteFile = (filePath) => {
    try {
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            console.log('Successfully deleted file:', filePath);
            return true;
        } else {
            console.warn('File does not exist:', filePath);
            return false;
        }
    } catch (err) {
        console.error('Error deleting file:', filePath, err.message);
        return false;
    }
};

// Helper function to create directory if it doesn't exist
const ensureDirectoryExists = (dirPath) => {
    try {
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log('Created directory:', dirPath);
        }
        return true;
    } catch (err) {
        console.error('Error creating directory:', dirPath, err.message);
        return false;
    }
};

// Get upload destination based on route
const getUploadDestination = (req) => {
    if (req.originalUrl.includes('/upload-report') || req.baseUrl.includes('reports')) {
        return 'reports';
    } else if (req.baseUrl.includes('testimonials')) {
        return 'testimonials';
    } else if (req.baseUrl.includes('expectations')) {
        return 'expectations';
    } else {
        return 'others';
    }
};

// Helper to get absolute uploads path
const getUploadsPath = () => {
    return '/var/www/uploads';
};

// Helper function to find existing files in directory
const findExistingFile = (filename, subfolder = '') => {
    try {
        const dirPath = path.join('/var/www/uploads', subfolder);
        if (!fs.existsSync(dirPath)) {
            return null;
        }

        const files = fs.readdirSync(dirPath);
        console.log(`Available files in ${dirPath}:`, files);

        // First try exact match
        if (files.includes(filename)) {
            return filename;
        }

        // If no exact match, return null - don't guess
        return null;
    } catch (err) {
        console.error('Error finding existing file:', err);
        return null;
    }
};

module.exports = {
    getImageUrl,
    getFilePath,
    verifyFileExists,
    deleteFile,
    ensureDirectoryExists,
    getUploadDestination,
    getUploadsPath,
    findExistingFile
};
