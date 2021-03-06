const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const checkAuth = require('../middleware/check-auth');
const nexmo = require('../middleware/nexmo-sms');


const Order = require('../models/order');
const Product = require('../models/product');


router.get('/', (req, res, next) => {
    Order.find()
    .select('_id order')
    .populate({
        path: 'order.items.productId',
        model: 'Product',
        select: 'name price'
    })
    .exec()
    .then(docs => {
        res.status(200).json({
            count: docs.length,
            orders: docs
        });
    })
    .catch(err => {
        res.json(500).json({
            error: err
        });
    });
});

router.post('/', (req, res, next) => {
    console.log(req.body);
    if (!(req.body.order && req.body.order.items && req.body.order.items.length > 0) &&
        !(req.body.order.customerName && req.body.order.phone && req.body.order.address)) {
        return res.status(400).json({
            message: "Invalid order details"
        });
    }
    const newOrder = new Order({
        _id: mongoose.Types.ObjectId(),
        order: req.body.order,
    });
    userPhone = req.body.order.phone; 
    newOrder.order.netAmount = 0;
    newOrder.order.otpCode = Math.floor(Math.random()* 999999-100001) + 100001;
    productIds = req.body.order.items.map(a => a.productId);
    productQuantities = req.body.order.items.map(a => a.quantity);
    Product.find({ _id: {$in: productIds} })
    .exec()
    .then(result => {
        if(result.length > 0 && result.length == productIds.length){
            result.map(x => {
                productIds.forEach((id, index) => {
                    if(id == x._id) {
                        newOrder.order.netAmount += productQuantities[index] * x.price;
                    }
                });
            });
            return newOrder.save();
        }
        return res.status(404).json({
            message: "Product not found"
        })
    })
    .then(result => {
        nexmo.sendOtp(newOrder.order.otpCode, userPhone);
        res.status(200).json({
            _id: result._id,
            order: result.order
        });
    })
    .catch(err => res.status(404).json({
        error: err
    }));
    
});

router.get('/:orderId', (req, res, next) => {
    Order.findById(req.params.orderId)
    .select('_id order')
    .populate({
        path: 'order.items.product',
        model: 'Product',
        select: 'name price'
    })
    .exec()
    .then(order => {
        if(!order) {
            return res.status(404).json({
                message: 'Order not found'
            })
        }
        res.status(200).json(order);
    })
    .catch(err => {
        res.status(500).json({
            error: err
        });
    });
});

router.delete('/:orderId', (req, res, next) => {
    const id = req.params.orderId;
    Order.remove({ _id: id })
    .exec()
    .then(result => {
        res.status(200).json({
            message: "Order deleted",
            response: result
        });
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            error: err
        });
    });
});

router.patch('/:orderId', (req, res, next) => {
    const id = req.params.orderId;
    // const updateOps = {};
    var otpVerified = false;
    console.log(req.body);
    // for(const ops of req.body){
    //     updateOps[ops.propName] = ops.value;
    // }
    console.log("req.body.otpCode: ", req.body.otpItem.otpCode)
    if (req.body.otpItem.otpCode) {
            
        nexmo.verifyOtp(req.body.otpItem.otpCode, id).then(
            result => {
                console.log('result: ', result);
                otpVerified = result;
                if (otpVerified) {
                    Order.update({ _id: id }, { $set: {'order.status': 2} })
                    .exec()
                    .then(result => {
                        console.log("Updated: ", result);
                        try{
                            nexmo.sendConfirmationSms(id);
                        } catch (error) {
                            console.log(error);
                        }
                        res.status(200).json({
                            message: 'Order updated'
                        });
                    })
                    .catch(err => {
                        console.log(err);
                        res.status(500).json({
                            error: err
                        });
                    });
                } else {
                    res.status(401).json({
                        message: 'Invalid OTP'
                    });
                }
        })
        .catch(
            err => {
                console.log(err);
                res.status(500).json({
                error: err
                });
            }
        )
        //otpVerified = nexmo.verifyOtp(req.body.otpItem.otpCode, id);

        
    }
    
});

module.exports = router;