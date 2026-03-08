# Mahalakshmi Imitation Jewellery - E-Commerce Platform

A full-stack e-commerce platform for jewellery rental and sales, built with Node.js, Express, and PostgreSQL.

## 🌟 Features

### Customer Features
- **Browse Products**: View extensive jewellery collection with detailed information
- **Dual Purchase Options**: Buy or rent jewellery for special occasions
- **Smart Cart System**: Add multiple items with different purchase modes
- **Rental Management**: Select rental dates and calculate costs automatically
- **Order Tracking**: View order history and status updates
- **Enquiry System**: Submit custom requests and special requirements
- **Responsive Design**: Mobile-first design for seamless experience on all devices

### Admin Features
- **Dashboard**: Real-time overview of orders, rentals, and revenue
- **Order Management**: View, confirm, cancel, and track all orders
- **Inventory Control**: Manage stock levels with automatic availability tracking
- **Product Management**: Add, edit, and delete products with image upload
- **Customer Directory**: View customer information and order history
- **Enquiry Management**: Handle customer enquiries and special requests
- **Status Updates**: Update order and rental statuses in real-time

### Technical Features
- **RESTful API**: Clean, well-documented API endpoints
- **PostgreSQL Database**: Robust data storage with proper relationships
- **Image Management**: Cloudinary integration for image storage
- **Email Notifications**: Automated order confirmations and updates
- **SMS Notifications**: Twilio integration for instant alerts
- **Rate Limiting**: API protection against abuse
- **Security**: Helmet.js, CORS, input validation, and sanitization
- **Error Handling**: Comprehensive error logging and user-friendly messages
- **Responsive UI**: Mobile-optimized interface with smooth animations

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- Cloudinary account (for image storage)
- Twilio account (optional, for SMS)
- SMTP server (optional, for emails)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd mahalakshmi-jewellery
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Database
   DATABASE_URL=postgresql://user:password@host:port/database
   
   # Cloudinary
   CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name
   
   # Twilio (optional)
   TWILIO_ACCOUNT_SID=your_account_sid
   TWILIO_AUTH_TOKEN=your_auth_token
   TWILIO_PHONE_NUMBER=your_twilio_number
   
   # Email (optional)
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_USER=your_email@gmail.com
   SMTP_PASS=your_app_password
   
   # Server
   PORT=5000
   NODE_ENV=production
   ```

4. **Initialize database**
   ```bash
   npm run migrate
   ```

5. **Seed sample data** (optional)
   ```bash
   node scripts/seedProducts.js
   ```

6. **Start the server**
   ```bash
   npm start
   ```

7. **Access the application**
   - Customer Portal: http://localhost:5000
   - Admin Panel: http://localhost:5000/admin
   - API Health: http://localhost:5000/health

## 📁 Project Structure

```
mahalakshmi-jewellery/
├── config/              # Configuration files
│   ├── cloudinary.js    # Cloudinary setup
│   └── database.js      # PostgreSQL connection
├── middleware/          # Express middleware
│   ├── errorHandler.js  # Error handling
│   ├── rateLimiter.js   # Rate limiting
│   └── validation.js    # Input validation
├── routes/              # API routes
│   ├── products.js      # Product endpoints
│   ├── orders.js        # Order endpoints
│   ├── enquiries.js     # Enquiry endpoints
│   ├── inventory.js     # Inventory endpoints
│   ├── customers.js     # Customer endpoints
│   ├── auth.js          # Authentication
│   ├── upload.js        # File upload
│   ├── rentals.js       # Rental management
│   ├── invoices.js      # Invoice generation
│   └── payments.js      # Payment processing
├── services/            # Business logic
│   ├── emailService.js  # Email notifications
│   ├── smsService.js    # SMS notifications
│   ├── imageService.js  # Image processing
│   ├── inventoryService.js # Stock management
│   ├── invoiceService.js   # PDF generation
│   └── paymentService.js   # Payment handling
├── scripts/             # Database & utility scripts
│   ├── migrate-postgres.js # Database migration
│   ├── seedProducts.js     # Sample data
│   └── dev/                # Development scripts
├── public/              # Frontend files
│   ├── pages/           # HTML pages
│   │   ├── index.html   # Customer portal
│   │   ├── admin.html   # Admin panel
│   │   ├── buy.html     # Buy page
│   │   └── rental.html  # Rental page
│   ├── assets/          # Static assets
│   │   ├── css/         # Stylesheets
│   │   ├── js/          # JavaScript files
│   │   └── images/      # Image assets
│   ├── config.js        # API configuration
│   └── cart-manager.js  # Cart functionality
├── utils/               # Utility functions
│   └── logger.js        # Logging utility
├── docs/                # Documentation
│   ├── deployment/      # Deployment guides
│   └── development/     # Development notes
├── __tests__/           # Test files
├── uploads/             # Uploaded files
├── server.js            # Main server file
├── package.json         # Dependencies
├── .env.example         # Environment template
└── README.md            # This file
```

## 🔌 API Endpoints

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product

### Orders
- `GET /api/orders` - Get all orders
- `GET /api/orders/:id` - Get order by ID
- `POST /api/orders` - Create new order
- `PATCH /api/orders/:id/status` - Update order status
- `DELETE /api/orders/:id` - Delete order

### Enquiries
- `GET /api/enquiries` - Get all enquiries
- `POST /api/enquiries` - Create new enquiry
- `PATCH /api/enquiries/:id/status` - Update enquiry status

### Inventory
- `PATCH /api/inventory/:id/stock` - Update stock level
- `PATCH /api/inventory/:id/availability` - Toggle availability

### Customers
- `GET /api/customers` - Get all customers
- `GET /api/customers/phone/:phone` - Get customer by phone
- `POST /api/customers/login` - Customer login

### Upload
- `POST /api/upload/product` - Upload product image

## 🛠️ Development

### Available Scripts

```bash
# Start server
npm start

# Start with auto-reload (development)
npm run dev

# Run database migration
npm run migrate

# Run tests
npm test

# Seed sample data
node scripts/seedProducts.js
```

### Admin Credentials
- Username: `admin`
- Password: `mlr2025`

## 🚢 Deployment

### Render.com Deployment

1. **Connect Repository**
   - Link your GitHub repository to Render

2. **Configure Environment**
   - Add all environment variables from `.env.example`
   - Ensure `DATABASE_URL` points to your PostgreSQL instance

3. **Deploy**
   - Render will automatically run `npm install` and start the server
   - Database migration runs automatically on first deploy

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `CLOUDINARY_URL` - Cloudinary configuration
- `PORT` - Server port (default: 5000)
- `NODE_ENV` - Environment (production/development)

## 📊 Database Schema

### Products Table
- Product information (name, material, category, icon)
- Pricing (rent per day, buy price)
- Type (rent, buy, both)
- Stock management (base stock, available quantity)
- Image URL

### Orders Table
- Customer information
- Order items with quantities
- Total amount
- Order status (New, Confirmed, Cancelled, Returned)
- Timestamps

### Customers Table
- Contact information (name, phone, email)
- Address
- Order history

### Enquiries Table
- Customer details
- Request type and message
- Occasion/event information
- Status tracking

## 🔒 Security Features

- **Helmet.js**: Security headers
- **CORS**: Cross-origin resource sharing
- **Rate Limiting**: API request throttling
- **Input Validation**: Express-validator
- **SQL Injection Protection**: Parameterized queries
- **XSS Protection**: Input sanitization
- **Error Handling**: No sensitive data exposure

## 📱 Mobile Responsiveness

- Mobile-first design approach
- Responsive breakpoints: 480px, 768px, 1024px
- Touch-optimized interface
- Hamburger menu for mobile navigation
- Optimized images and assets

## 🎨 UI/UX Features

- Smooth animations and transitions
- Loading states and feedback
- Toast notifications
- Modal dialogs
- Real-time cart updates
- Intuitive navigation
- Professional color scheme (Gold & Maroon)

## 📞 Support & Contact

For technical support or inquiries:
- Email: support@mahalakshmijewellery.com
- Phone: +91 XXXXXXXXXX

## 📄 License

Proprietary - All rights reserved

## 🙏 Acknowledgments

- Built with Express.js and PostgreSQL
- UI inspired by traditional Indian jewellery aesthetics
- Icons and fonts from Google Fonts

---

**Version**: 1.0.0  
**Last Updated**: 2024  
**Status**: Production Ready ✅
