const AdminUser = require('../models/AdminUser');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: '7d',
    });
};

// Superadmin login
exports.login = async (req, res) => {
    const { email, password } = req.body;

    const user = await AdminUser.findOne({ email });

    if (user && (await user.matchPassword(password))) {
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id)
        });
    } else {
        res.status(401).json({ message: 'Invalid credentials' });
    }
};

// Superadmin creates a new admin or labtech
exports.createUser = async (req, res) => {
    const { name, email, password, role } = req.body;

    const existing = await AdminUser.findOne({ email });
    if (existing) {
        return res.status(400).json({ message: 'User already exists' });
    }

    const user = await AdminUser.create({ name, email, password, role });

    res.status(201).json({
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
    });
};
