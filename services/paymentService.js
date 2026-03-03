const Razorpay = require('razorpay');
const crypto = require('crypto');

let razorpayInstance = null;

// Initialize Razorpay if enabled
if (process.env.RAZORPAY_ENABLED === 'true') {
  try {
    razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });
    console.log('✅ Razorpay initialized');
  } catch (error) {
    console.error('❌ Razorpay initialization error:', error.message);
  }
}

// Create Razorpay order
async function createRazorpayOrder(amount, orderId, customerInfo) {
  if (!razorpayInstance) {
    throw new Error('Razorpay is not enabled or configured');
  }

  try {
    const options = {
      amount: Math.round(amount * 100), // Amount in paise (₹1 = 100 paise)
      currency: 'INR',
      receipt: orderId,
      notes: {
        customer_name: customerInfo.name,
        customer_phone: customerInfo.phone,
        order_id: orderId
      }
    };

    const order = await razorpayInstance.orders.create(options);
    console.log('✅ Razorpay order created:', order.id);
    return order;
  } catch (error) {
    console.error('❌ Razorpay order creation error:', error);
    throw error;
  }
}

// Verify Razorpay payment signature
function verifyPaymentSignature(orderId, paymentId, signature) {
  try {
    const text = orderId + '|' + paymentId;
    const generated_signature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    return generated_signature === signature;
  } catch (error) {
    console.error('❌ Payment verification error:', error);
    return false;
  }
}

// Get payment methods configuration
function getPaymentMethods() {
  return {
    cod: process.env.ENABLE_COD === 'true',
    cashAtShop: process.env.ENABLE_CASH_AT_SHOP === 'true',
    online: process.env.ENABLE_ONLINE_PAYMENT === 'true' && process.env.RAZORPAY_ENABLED === 'true',
    razorpayKeyId: process.env.RAZORPAY_ENABLED === 'true' ? process.env.RAZORPAY_KEY_ID : null
  };
}

// Validate payment method
function isPaymentMethodValid(method) {
  const methods = getPaymentMethods();
  
  switch(method) {
    case 'cod':
      return methods.cod;
    case 'cash_at_shop':
      return methods.cashAtShop;
    case 'online':
      return methods.online;
    default:
      return false;
  }
}

module.exports = {
  createRazorpayOrder,
  verifyPaymentSignature,
  getPaymentMethods,
  isPaymentMethodValid
};
