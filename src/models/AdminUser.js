const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminUserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
        select: false
    },
    role: {
        type: String,
        enum: ['superadmin', 'admin', 'labtech'],
        default: 'admin'
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: Date,
    passwordChangedAt: Date
}, { timestamps: true });

// Hash password before saving
adminUserSchema.pre('save', async function (next) {
    if (!this.isModified('password')) {
        return next();
    }

    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);

        // Set password changed timestamp
        if (!this.isNew) {
            this.passwordChangedAt = new Date();
        }

        next();
    } catch (error) {
        next(error);
    }
});

// Match password method
adminUserSchema.methods.matchPassword = async function (enteredPassword) {
    if (!this.password || !enteredPassword) {
        return false;
    }

    try {
        return await bcrypt.compare(enteredPassword, this.password);
    } catch (error) {
        return false;
    }
};

module.exports = mongoose.model('AdminUser', adminUserSchema);
