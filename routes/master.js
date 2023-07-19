var express = require('express');
var router = express.Router();
const mysqlService = require('../services/mysqlService');
const jwt = require('jsonwebtoken');

router.post('/create', function(req, res) {
    mysqlService.createMaster(req.body.user, (error, result) => {
        if (error) {
            res.status(500).json({ message: 'Internal server error', error: error });
            return;
        }

        res.json(result);
    })
});

router.get('/get', function(req, res) {
    const password = req.query.password;

    mysqlService.getMaster('admin', password, (error, result) => {
        if (error) {
            res.status(500).json({ message: 'Internal server error', error: error });
            return;
        }

        if (result) {
            // Master record found, generate JWT token
            const payload = { id: result.role };
            const secretKey = process.env.JWT_SECRET; // Replace with your own secret key
            const options = { expiresIn: '30d' }; // Set expiration time as desired

            jwt.sign(payload, secretKey, options, (err, token) => {
                if (err) {
                    res.status(500).json({ message: 'Error generating JWT token', error: err });
                    return;
                }

                // Include the token in the response
                res.json({ token: token });
            });
        } else {
            // No master record found or password doesn't match
            res.status(401).json({ message: 'Unauthorized' });
        }
    });
});

router.get('/verify', function(req, res) {
    const token = req.query.token;

    jwt.verify(token, process.env.JWT_SECRET, (error, decodedToken) => {
        if (error) {
            // If verification fails, the token is invalid or expired
            res.status(401).json({ message: 'Unauthorized' });
        } else {
            res.status(200).json({ message: 'Token verified' });
        }
    });
});
module.exports = router;
