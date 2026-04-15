const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const db = require('../database');
const { JWT_SECRET } = require('../middleware/auth');
const { OAuth2Client } = require('google-auth-library');
const { authenticator } = require('otplib');
const { encryptText, decryptText } = require('../utils/encryption');

const router = express.Router();
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const MFA_TOKEN_SECRET = process.env.MFA_TOKEN_SECRET || JWT_SECRET;

const generateToken = (payload, expiresIn = '24h') => jwt.sign(payload, JWT_SECRET, { expiresIn });
const generateMfaTempToken = (payload) => jwt.sign(payload, MFA_TOKEN_SECRET, { expiresIn: '5m' });

const verifyMfaTempToken = (token) => new Promise((resolve, reject) => {
  jwt.verify(token, MFA_TOKEN_SECRET, (err, decoded) => {
    if (err) return reject(err);
    resolve(decoded);
  });
});

// Register
router.post('/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({ error: 'All fields are required' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const otpSecret = authenticator.generateSecret();
        const encryptedSecret = encryptText(otpSecret);

        db.run(
            'INSERT INTO users (username, email, password, mfa_enabled, otp_secret) VALUES (?, ?, ?, ?, ?)',
            [username, email, hashedPassword, 1, encryptedSecret],
            function (err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'Username or email already exists' });
                    }
                    return res.status(500).json({ error: 'Database error' });
                }

                const tempToken = generateMfaTempToken({ id: this.lastID, username, email, mfaPending: true });
                const otpauthUrl = authenticator.keyuri(email, 'Todo App', otpSecret);

                res.status(201).json({
                    message: 'MFA setup required',
                    mfaRequired: true,
                    tempToken,
                    user: { id: this.lastID, username, email, mfaEnabled: true },
                    mfaSetup: {
                        secret: otpSecret,
                        otpauthUrl,
                        message: 'Scan this QR code in your authenticator app or enter the secret manually, then enter the code below.'
                    }
                });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        // Find user
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }

            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            const validPassword = await bcrypt.compare(password, user.password);
            if (!validPassword) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            if (user.mfa_enabled) {
                const tempToken = generateMfaTempToken({ id: user.id, username: user.username, email: user.email, mfaPending: true });
                return res.json({
                    message: 'Multi-factor authentication required',
                    mfaRequired: true,
                    tempToken
                });
            }

            const token = generateToken({ id: user.id, username: user.username }, '24h');
            res.json({
                message: 'Login successful',
                token,
                user: { id: user.id, username: user.username, email: user.email, mfaEnabled: false }
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

// Google OAuth Link
router.post('/google', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) return res.status(400).json({ error: 'Token is required' });

        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, name, sub } = payload;

        // Check if user exists check local DB for email
        db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
            if (err) return res.status(500).json({ error: 'Database error' });

                if (user) {
                const appToken = generateToken({ id: user.id, username: user.username }, '24h');
                return res.json({
                    message: 'Login successful',
                    token: appToken,
                    user: { id: user.id, username: user.username, email: user.email, mfaEnabled: false }
                });
            } else {
                const randomPassword = crypto.randomUUID();
                const hashedPassword = await bcrypt.hash(randomPassword, 10);
                db.run(
                    'INSERT INTO users (username, email, password, mfa_enabled, otp_secret) VALUES (?, ?, ?, ?, ?)',
                    [name, email, hashedPassword, 0, null],
                    function (err) {
                        if (err) {
                            return res.status(500).json({ error: 'Failed to create user account' });
                        }
                        const appToken = generateToken({ id: this.lastID, username: name }, '24h');
                        res.status(201).json({
                            message: 'Login successful',
                            token: appToken,
                            user: { id: this.lastID, username: name, email, mfaEnabled: false }
                        });
                    }
                );
            }
        });
    } catch (error) {
        console.error('Google Auth Error:', error);
        res.status(401).json({ error: 'Invalid Google Token' });
    }
});

// MFA verify
router.post('/mfa/verify', async (req, res) => {
    try {
        const { token, code } = req.body;
        if (!token || !code) {
            return res.status(400).json({ error: 'Token and code are required' });
        }

        const payload = await verifyMfaTempToken(token);
        if (!payload || !payload.mfaPending) {
            return res.status(401).json({ error: 'Invalid MFA flow' });
        }

        db.get('SELECT * FROM users WHERE id = ?', [payload.id], (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Database error' });
            }
            if (!user) {
                return res.status(401).json({ error: 'Invalid MFA flow' });
            }

            const secret = decryptText(user.otp_secret);
            const isValid = authenticator.check(code, secret);
            if (!isValid) {
                return res.status(401).json({ error: 'Invalid or expired MFA code' });
            }

            const authToken = generateToken({ id: user.id, username: user.username }, '24h');
            res.json({
                message: 'MFA verification successful',
                token: authToken,
                user: { id: user.id, username: user.username, email: user.email }
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
