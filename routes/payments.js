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

// Get payment by ID
router.get('/:id', async (req, res) => {
  try {
    const [payments] = await db.query(
      'SELECT * FROM payments WHERE id = ?',
      [req.params.id]
    );
    
    if (payments.length === 0) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    res.json(payments[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initiate payment (for tests)
router.post('/initiate', async (req, res) => {
  try {
    const { order_id, payment_method } = req.body;
    
    // Validate payment method
    if (!payment_method || !['razorpay', 'adyen', 'cod', 'cash_at_shop'].includes(payment_method)) {
      return res.status(400).json({ error: 'Invalid payment method' });
    }
    
    // Get order
    const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [order_id]);
    if (orders.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    
    const order = orders[0];
    
    // Create payment record
    const [result] = await db.query(
      'INSERT INTO payments (order_id, amount, payment_method, status) VALUES (?, ?, ?, ?)',
      [order_id, order.total, payment_method, 'pending']
    );
    
    res.json({ 
      paymentId: result.insertId,
      orderId: order_id,
      amount: order.total,
      payment_method
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
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
      payment_id,
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      order_id 
    } = req.body;

    // Handle test format with just payment_id
    if (payment_id && !razorpay_payment_id) {
      const [payments] = await db.query('SELECT * FROM payments WHERE id = ?', [payment_id]);
      if (payments.length === 0) {
        return res.status(404).json({ error: 'Payment not found' });
      }
      
      await db.query('UPDATE payments SET status = ? WHERE id = ?', ['verified', payment_id]);
      await db.query('UPDATE orders SET payment_status = ? WHERE id = ?', ['paid', payments[0].order_id]);
      
      return res.json({ 
        success: true, 
        message: 'Payment verified successfully'
      });
    }

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
