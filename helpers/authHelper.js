const path = require('path');
const fs = require('fs-extra');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const JWT_SECRET = process.env.JWT_SECRET || 'md-engine-secure-jwt-secret-key-2026';

function getUsersFile() {
    return process.env.USERS_FILE || path.join(__dirname, '..', 'data', 'users.json');
}

function loadUsers() {
    const usersFile = getUsersFile();
    try {
        if (!fs.existsSync(usersFile)) {
            fs.ensureDirSync(path.dirname(usersFile));
            fs.writeJsonSync(usersFile, {});
        }
        return fs.readJsonSync(usersFile);
    } catch (e) {
        console.error('Error loading users:', e);
        return {};
    }
}

function saveUsers(users) {
    const usersFile = getUsersFile();
    fs.ensureDirSync(path.dirname(usersFile));
    fs.writeJsonSync(usersFile, users, { spaces: 2 });
}

function authenticate(req, res, next) {
    // 1. Check httpOnly cookie
    let token = req.cookies?.token;
    
    // 2. Fallback to Authorization header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.slice(7).trim();
    }

    if (!token) {
        return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in.' });
    }
}

function setAuthCookie(res, token) {
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
}

function clearAuthCookie(res) {
    res.clearCookie('token', {
        httpOnly: true,
        sameSite: 'lax'
    });
}

function issueToken(username) {
    return jwt.sign({ username }, JWT_SECRET, { expiresIn: '7d' });
}

function hashPassword(password) {
    return bcrypt.hash(password, 10);
}

function comparePassword(password, hash) {
    return bcrypt.compare(password, hash);
}

module.exports = {
    JWT_SECRET,
    getUsersFile,
    get USERS_FILE() {
        return getUsersFile();
    },
    loadUsers,
    saveUsers,
    authenticate,
    setAuthCookie,
    clearAuthCookie,
    issueToken,
    hashPassword,
    comparePassword
};
