const twilio = require('twilio');

let client = null;

// Initialize Twilio client if enabled
if (process.env.SMS_ENABLED === 'true') {
  try {
    client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  } catch (error) {
    console.error('❌ Twilio initialization error:', error.message);
  }
}

// Send SMS notification
async function sendSMS(to, message) {
  if (!client || process.env.SMS_ENABLED !== 'true') {
    console.log('📱 SMS disabled, skipping:', message);
    return;
  }

  try {
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: to
    });
    console.log('✅ SMS sent to:', to);
  } catch (error) {
    console.error('❌ SMS error:', error.message);
  }
}

// Send order confirmation SMS to customer
async function sendOrderConfirmationSMS(order) {
  const message = `Thank you for your order! Order ID: ${order.order_id}. Total: ₹${order.total}. We'll notify you once confirmed. - Mahalakshmi Jewellery`;
  await sendSMS(order.customer_phone, message);
}

// Send new order notification to admin
async function sendAdminOrderNotificationSMS(order) {
  const message = `New Order: ${order.order_id} from ${order.customer_name} (${order.customer_phone}). Total: ₹${order.total}. Products: ${order.product_names}`;
  await sendSMS(process.env.ADMIN_PHONE, message);
}

module.exports = {
  sendSMS,
  sendOrderConfirmationSMS,
  sendAdminOrderNotificationSMS
};
