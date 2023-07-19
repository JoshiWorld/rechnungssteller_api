var express = require('express');
var router = express.Router();
const mysqlService = require('../services/mysqlService');
const jwt = require('jsonwebtoken');

router.get('/get/list', function(req, res) {
    const token = req.query.token;

    jwt.verify(token, process.env.JWT_SECRET, (error, decodedToken) => {
        if (error) {
            // If verification fails, the token is invalid or expired
            res.status(401).json({ message: 'Unauthorized' });
        } else {
            mysqlService.getArticles((error, results) => {
                if (error) {
                    res.status(500).json({ message: 'Internal server error', error: error });
                    return;
                }

                res.json(results);
            });
        }
    });
});

module.exports = router;
