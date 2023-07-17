var express = require('express');
var router = express.Router();
const mysqlService = require('../services/mysqlService');
const { sendMail } = require('../services/emailService');

/* GET users listing. */
router.get('/:id', function(req, res) {
    mysqlService.getOrder(req.params.id, (error, results) => {
        if (error) {
            res.status(500).json({ message: 'Internal server error', error: error });
            return;
        }

        res.json(results);
    });
});

router.get('/list/get', function(req, res) {
    mysqlService.getOrders((error, results) => {
        if (error) {
            res.status(500).json({ message: 'Internal server error', error: error });
            return;
        }

        res.json(results);
    });
});

router.post('/create', function(req, res) {
   mysqlService.createOrder(req.body.order, (error, results) => {
       if(error) {
           res.status(500).json({ message: 'Internal server error', error: error });
           return;
       }

       res.json(results);
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

    mysqlService.addArticlesToOrder(order, (error, results) => {
        if (error) {
            res.status(500).json({ message: 'Internal server error', error: error });
            return;
        }

        res.json(results);
    });
})


module.exports = router;
