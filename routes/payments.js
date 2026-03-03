const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { 
  createRazorpayOrder, 
  verifyPaymentSignature, 
  getPaymentMethods,
  isPaymentMethodValid 
} = require('../services/paymentService');
const {
  createAdyenPayment,
  verifyAdyenPayment
} = require('../services/adyenService');

// Get available payment methods
router.get('/methods', (req, res) => {
  try {
    const methods = getPaymentMethods();
    res.json(methods);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create payment order (Razorpay or Adyen)
router.post('/create-order', async (req, res) => {
  try {
    const { amount, orderId, customerInfo, gateway } = req.body;

    if (!amount || !orderId || !customerInfo) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Use Adyen if specified and enabled
    if (gateway === 'adyen' && process.env.ADYEN_ENABLED === 'true') {
      const adyenSession = await createAdyenPayment(amount, orderId, customerInfo);
      return res.json({
        success: true,
        gateway: 'adyen',
        sessionId: adyenSession.id,
        sessionData: adyenSession.sessionData,
        clientKey: process.env.ADYEN_CLIENT_KEY,
        environment: process.env.ADYEN_ENVIRONMENT || 'test'
      });
    }

    // Default to Razorpay
    const razorpayOrder = await createRazorpayOrder(amount, orderId, customerInfo);
    
    res.json({
      success: true,
      gateway: 'razorpay',
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Verify payment after successful transaction
router.post('/verify', async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      order_id 
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !order_id) {
      return res.status(400).json({ error: 'Missing payment details' });
    }

    // Verify signature
    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid payment signature' 
      });
    }

    // Update order with payment details
    await db.query(
      `UPDATE orders SET 
        payment_status = 'paid',
        payment_method = 'online',
        payment_id = ?,
        razorpay_order_id = ?,
        payment_verified_at = NOW()
      WHERE order_id = ?`,
      [razorpay_payment_id, razorpay_order_id, order_id]
    );

    res.json({ 
      success: true, 
      message: 'Payment verified successfully',
      paymentId: razorpay_payment_id
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update payment method for COD or Cash at Shop
router.patch('/update-method/:orderId', async (req, res) => {
  try {
    const { orderId } = req.params;
    const { paymentMethod } = req.body;

    if (!isPaymentMethodValid(paymentMethod)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }

    // Map payment method names
    const methodMap = {
      'cod': 'Cash on Delivery',
      'cash_at_shop': 'Cash at Shop',
      'online': 'Online Payment'
    };

    await db.query(
      `UPDATE orders SET 
        payment_method = ?,
        payment_status = ?
      WHERE order_id = ?`,
      [methodMap[paymentMethod], paymentMethod === 'online' ? 'pending' : 'pending', orderId]
    );

    res.json({ 
      success: true, 
      message: 'Payment method updated',
      paymentMethod: methodMap[paymentMethod]
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get payment details for an order
router.get('/order/:orderId', async (req, res) => {
  try {
    const [orders] = await db.query(
      `SELECT payment_method, payment_status, payment_id, razorpay_order_id, payment_verified_at 
       FROM orders WHERE order_id = ?`,
      [req.params.orderId]
    );

    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    res.json(orders[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
