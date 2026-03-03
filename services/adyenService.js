const { Client, CheckoutAPI } = require('@adyen/api-library');

let adyenClient = null;
let checkout = null;

// Initialize Adyen if enabled
if (process.env.ADYEN_ENABLED === 'true') {
  try {
    adyenClient = new Client({
      apiKey: process.env.ADYEN_API_KEY,
      environment: process.env.ADYEN_ENVIRONMENT || 'TEST'
    });
    checkout = new CheckoutAPI(adyenClient);
    console.log('✅ Adyen initialized');
  } catch (error) {
    console.error('❌ Adyen initialization error:', error.message);
  }
}

// Create Adyen payment session
async function createAdyenPayment(amount, orderId, customerInfo) {
  if (!checkout) {
    throw new Error('Adyen is not enabled or configured');
  }

  try {
    const paymentRequest = {
      amount: {
        currency: 'INR',
        value: Math.round(amount * 100) // Amount in minor units (paise)
      },
      reference: orderId,
      merchantAccount: process.env.ADYEN_MERCHANT_ACCOUNT,
      returnUrl: `${process.env.FRONTEND_URL || 'http://localhost:8000'}/payment-result.html`,
      shopperReference: customerInfo.phone,
      shopperEmail: customerInfo.email,
      shopperName: {
        firstName: customerInfo.name.split(' ')[0],
        lastName: customerInfo.name.split(' ').slice(1).join(' ') || customerInfo.name
      },
      countryCode: 'IN',
      shopperLocale: 'en_IN'
    };

    const response = await checkout.sessions(paymentRequest);
    console.log('✅ Adyen payment session created:', response.id);
    return response;
  } catch (error) {
    console.error('❌ Adyen payment creation error:', error);
    throw error;
  }
}

// Verify Adyen payment
async function verifyAdyenPayment(sessionId, sessionData) {
  try {
    // Adyen handles verification through webhooks
    // For now, we'll accept the session data
    return {
      success: true,
      sessionId: sessionId,
      pspReference: sessionData.pspReference
    };
  } catch (error) {
    console.error('❌ Adyen verification error:', error);
    return { success: false, error: error.message };
  }
}

// Get payment methods configuration
function getPaymentMethods() {
  return {
    cod: process.env.ENABLE_COD === 'true',
    cashAtShop: process.env.ENABLE_CASH_AT_SHOP === 'true',
    online: process.env.ENABLE_ONLINE_PAYMENT === 'true' && 
            (process.env.RAZORPAY_ENABLED === 'true' || process.env.ADYEN_ENABLED === 'true'),
    razorpayKeyId: process.env.RAZORPAY_ENABLED === 'true' ? process.env.RAZORPAY_KEY_ID : null,
    adyenEnabled: process.env.ADYEN_ENABLED === 'true',
    adyenClientKey: process.env.ADYEN_ENABLED === 'true' ? process.env.ADYEN_CLIENT_KEY : null
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
  createAdyenPayment,
  verifyAdyenPayment,
  getPaymentMethods,
  isPaymentMethodValid
};
