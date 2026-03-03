const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Generate invoice PDF
async function generateInvoice(order) {
  return new Promise((resolve, reject) => {
    try {
      // Create invoices directory if it doesn't exist
      const invoicesDir = path.join(__dirname, '../invoices');
      if (!fs.existsSync(invoicesDir)) {
        fs.mkdirSync(invoicesDir, { recursive: true });
      }

      const filename = `invoice-${order.order_id}.pdf`;
      const filepath = path.join(invoicesDir, filename);

      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(filepath);

      doc.pipe(stream);

      // Header
      doc.fontSize(20).text('MAHALAKSHMI JEWELLERY', { align: 'center' });
      doc.fontSize(10).text('Invoice', { align: 'center' });
      doc.moveDown();

      // Invoice details
      doc.fontSize(12).text(`Invoice No: ${order.order_id}`, 50, 150);
      doc.text(`Date: ${new Date(order.placed_at).toLocaleDateString('en-IN')}`, 50, 165);
      doc.text(`Status: ${order.status}`, 50, 180);

      // Customer details
      doc.text(`Bill To:`, 50, 210);
      doc.fontSize(10);
      doc.text(order.customer_name, 50, 225);
      doc.text(order.customer_phone, 50, 240);
      if (order.customer_email) doc.text(order.customer_email, 50, 255);
      if (order.customer_address) doc.text(order.customer_address, 50, 270);

      // Items table
      const tableTop = 320;
      doc.fontSize(12).text('Items:', 50, tableTop);
      
      let y = tableTop + 20;
      doc.fontSize(10);
      doc.text('Product', 50, y);
      doc.text('Mode', 250, y);
      doc.text('Qty', 350, y);
      doc.text('Price', 450, y, { width: 100, align: 'right' });
      
      y += 20;
      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 10;

      // Add items
      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          doc.text(item.product_name, 50, y, { width: 180 });
          doc.text(item.mode, 250, y);
          doc.text(item.quantity.toString(), 350, y);
          const itemTotal = item.mode === 'rent' ? item.rental_total : (item.price * item.quantity);
          doc.text(`₹${itemTotal}`, 450, y, { width: 100, align: 'right' });
          y += 25;
        });
      }

      // Total
      y += 10;
      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 15;
      doc.fontSize(12).text('Total:', 400, y);
      doc.text(`₹${order.total}`, 450, y, { width: 100, align: 'right' });

      // Footer
      doc.fontSize(8).text('Thank you for your business!', 50, 700, { align: 'center' });

      doc.end();

      stream.on('finish', () => {
        console.log('✅ Invoice generated:', filename);
        resolve(filepath);
      });

      stream.on('error', reject);
    } catch (error) {
      reject(error);
    }
  });
}

module.exports = { generateInvoice };
