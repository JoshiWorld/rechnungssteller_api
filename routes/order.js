var express = require('express');
var router = express.Router();
const mysqlService = require('../services/mysqlService');
const { sendMail } = require('../services/emailService');
const jwt = require('jsonwebtoken');

/* GET users listing. */
router.get('/:id', function(req, res) {
    mysqlService.getOrder(req.params.id, (error, results) => {
        if (error) {
            res.status(500).json({ message: 'Internal server error', error: error });
            return;
        }
        if(results.paid === 1) {
            res.status(401).json({ message: 'Unauthorized' });
            return;
        }

        res.json(results);
    });
});

router.get('/list/get', function(req, res) {
    const token = req.query.token;

    jwt.verify(token, process.env.JWT_SECRET, (error, decodedToken) => {
        if (error) {
            // If verification fails, the token is invalid or expired
            res.status(401).json({ message: 'Unauthorized' });
        } else {
            mysqlService.getOrders((error, results) => {
                if (error) {
                    res.status(500).json({ message: 'Internal server error', error: error });
                    return;
                }

                res.json(results);
            });
        }
    });
});

router.post('/create', function(req, res) {
    const token = req.query.token;

    jwt.verify(token, process.env.JWT_SECRET, (error, decodedToken) => {
        if (error) {
            // If verification fails, the token is invalid or expired
            res.status(401).json({ message: 'Unauthorized' });
        } else {
            mysqlService.createOrder(req.body.order, (error, results) => {
                if(error) {
                    res.status(500).json({ message: 'Internal server error', error: error });
                    return;
                }

                res.json(results);
            });
        }
    });
});

router.put('/:id', function(req, res) {
    const orderUUID = req.params.id;
    const updatedOrder = req.body.order;

    mysqlService.updateOrder(orderUUID, updatedOrder, (error, results) => {
        if (error) {
            res.status(500).json({ message: 'Internal server error', error: error });
            return;
        }

        res.json(results);
    });
});

router.delete('/:id', (req, res) => {
    const orderId = req.params.id;
    const token = req.query.token;

    jwt.verify(token, process.env.JWT_SECRET, (error, decodedToken) => {
        if (error) {
            // If verification fails, the token is invalid or expired
            res.status(401).json({ message: 'Unauthorized' });
        } else {
            mysqlService.deleteOrder(orderId, (error, affectedRows) => {
                if (error) {
                    console.error('Error deleting order:', error);
                    res.status(500).json({ error: 'Failed to delete order' });
                } else if (affectedRows === 0) {
                    res.status(404).json({ error: 'Order not found' });
                } else {
                    res.status(200).json({ message: 'Order deleted successfully' });
                }
            });
        }
    });
});

router.get('/pay/:id', (req, res) => {
    const orderId = req.params.id;
    const token = req.query.token;

    jwt.verify(token, process.env.JWT_SECRET, (error, decodedToken) => {
        if (error) {
            // If verification fails, the token is invalid or expired
            res.status(401).json({ message: 'Unauthorized' });
        } else {
            mysqlService.updateOrderToPaid(orderId, (error, affectedRows) => {
                if (error) {
                    console.error('Error paid order:', error);
                    res.status(500).json({ error: 'Failed to paid order' });
                } else if (affectedRows === 0) {
                    res.status(404).json({ error: 'Order not found' });
                } else {
                    res.status(200).json({ message: 'Order paid successfully' });
                }
            });
        }
    });
});

router.post('/sendOrder', function(req, res) {
    const order = req.body.order;

    sendMail({
        recipient: order.user.email,
        subject: "BROKOLY MUSIC INVOICE",
        text: "Bitte nicht auf diese E-Mail antworten!"
    }, order);

    res.json({message: "email sent"});
});

router.post('/addArticles', function(req, res) {
    const order = req.body.order;
    const token = req.query.token;

    jwt.verify(token, process.env.JWT_SECRET, (error, decodedToken) => {
        if (error) {
            // If verification fails, the token is invalid or expired
            res.status(401).json({ message: 'Unauthorized' });
        } else {
            mysqlService.addArticlesToOrder(order, (error, results) => {
                if (error) {
                    res.status(500).json({ message: 'Internal server error', error: error });
                    return;
                }

                res.json(results);
            });
        }
    });
})


module.exports = router;
