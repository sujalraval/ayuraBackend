const path = require('path');
const fs = require('fs');

// Helper function to generate full image URL
const getImageUrl = (req, filename, subfolder = '') => {
    if (!filename) return null;

    // Use environment-based URL construction
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    const host = req.get('host') || 'localhost:5000';

    // Construct URL path with optional subfolder
    const urlPath = subfolder ? `uploads/${subfolder}/${filename}` : `uploads/${filename}`;
    const fullUrl = `${protocol}://${host}/${urlPath}`;

    console.log('Generated image URL:', fullUrl);
    return fullUrl;
};

// Helper function to get the physical file path
const getFilePath = (filename, subfolder = '') => {
    // Assuming this utility is in src/utils/ and uploads is in src/uploads/
    const basePath = path.join(__dirname, '..', 'uploads');

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

module.exports = {
    getImageUrl,
    getFilePath,
    verifyFileExists,
    deleteFile,
    ensureDirectoryExists,
    getUploadDestination
};
