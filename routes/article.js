var express = require('express');
var router = express.Router();
const mysqlService = require('../services/mysqlService');

router.get('/get/list', function(req, res) {
    mysqlService.getArticles((error, results) => {
        if (error) {
            res.status(500).json({ message: 'Internal server error', error: error });
            return;
        }

        res.json(results);
    });
});

module.exports = router;
