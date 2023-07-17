var express = require('express');
var router = express.Router();
const mysqlService = require('../services/mysqlService');

router.post('/create', function(req, res) {
    mysqlService.createUser(req.body.user, (error, results) => {
        if(error) {
            res.status(500).json({ message: 'Internal server error', error: error });
            return;
        }

        res.json(results);
    });
});

router.get('/:id', function(req, res) {
    const id = req.params.id;

    if(typeof id === 'string') {
        mysqlService.getUserByEmail(id)
    }
});

router.put('/update/:userId', function(req, res) {
    const userId = req.params.userId;
    const updatedUser = req.body.updatedUser;

    mysqlService.updateUser(userId, updatedUser, (error, results) => {
        if(error) {
            res.status(500).json({ message: 'Internal server error', error: error });
            return;
        }

        res.json(results);
    });
});

module.exports = router;
