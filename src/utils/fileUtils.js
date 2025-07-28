const path = require('path');
const fs = require('fs');

// Helper function to generate full file URL
const getImageUrl = (req, filename, subfolder = '') => {
    if (!filename) return null;

    // If it's already a full URL, return as is
    if (filename.startsWith('http')) {
        return filename;
    }

    // Always use HTTPS for production
    const protocol = 'https';
    const host = 'ayuras.life';

    // Construct URL path with subfolder
    let urlPath;
    if (subfolder) {
        urlPath = `uploads/${subfolder}/${filename}`;
    } else {
        urlPath = `uploads/${filename}`;
    }

    const fullUrl = `${protocol}://${host}/${urlPath}`;

    console.log('Generated file URL:', fullUrl);
    console.log('Subfolder:', subfolder, 'Filename:', filename);

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

    // Get the base uploads directory path
    const basePath = path.join(__dirname, '..', 'src', 'uploads');

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
    return path.join(__dirname, '..', 'src', 'uploads');
};

module.exports = {
    getImageUrl,
    getFilePath,
    verifyFileExists,
    deleteFile,
    ensureDirectoryExists,
    getUploadDestination,
    getUploadsPath
};
