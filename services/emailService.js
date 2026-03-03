const nodemailer = require('nodemailer');

// Create email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Send order confirmation email to customer
async function sendOrderConfirmation(order) {
  try {
    if (!order.customer_email || !process.env.EMAIL_USER) return;

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: order.customer_email,
      subject: `Order Confirmation - ${order.order_id}`,
      html: `
        <h2>Thank you for your order!</h2>
        <p>Dear ${order.customer_name},</p>
        <p>Your order has been received and is being processed.</p>
        <h3>Order Details:</h3>
        <ul>
          <li><strong>Order ID:</strong> ${order.order_id}</li>
          <li><strong>Total:</strong> ₹${order.total}</li>
          <li><strong>Status:</strong> ${order.status}</li>
          <li><strong>Products:</strong> ${order.product_names}</li>
        </ul>
        <p>We will notify you once your order is confirmed.</p>
        <p>Best regards,<br>Mahalakshmi Jewellery</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Order confirmation email sent to:', order.customer_email);
  } catch (error) {
    // Silently fail - email is optional
    if (process.env.NODE_ENV === 'development') {
      console.log('ℹ️  Email not configured (optional feature)');
    }
  }
}

// Send new order notification to admin
async function sendAdminOrderNotification(order) {
  try {
    if (!process.env.ADMIN_EMAIL || !process.env.EMAIL_USER) return;
    
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: process.env.ADMIN_EMAIL,
      subject: `New Order Received - ${order.order_id}`,
      html: `
        <h2>New Order Alert</h2>
        <h3>Order Details:</h3>
        <ul>
          <li><strong>Order ID:</strong> ${order.order_id}</li>
          <li><strong>Customer:</strong> ${order.customer_name}</li>
          <li><strong>Phone:</strong> ${order.customer_phone}</li>
          <li><strong>Total:</strong> ₹${order.total}</li>
          <li><strong>Products:</strong> ${order.product_names}</li>
        </ul>
        <p>Please review and confirm this order.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Admin notification email sent');
  } catch (error) {
    // Silently fail - email is optional
  }
}

// Send low stock alert
async function sendLowStockAlert(product) {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: process.env.ADMIN_EMAIL,
      subject: `Low Stock Alert - ${product.name}`,
      html: `
        <h2>Low Stock Alert</h2>
        <p>The following product is running low on stock:</p>
        <ul>
          <li><strong>Product:</strong> ${product.name}</li>
          <li><strong>Current Stock:</strong> ${product.stock}</li>
          <li><strong>Threshold:</strong> ${process.env.LOW_STOCK_THRESHOLD || 5}</li>
        </ul>
        <p>Please restock soon.</p>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Low stock alert sent for:', product.name);
  } catch (error) {
    console.error('❌ Low stock email error:', error.message);
  }
}

module.exports = {
  sendOrderConfirmation,
  sendAdminOrderNotification,
  sendLowStockAlert
};
