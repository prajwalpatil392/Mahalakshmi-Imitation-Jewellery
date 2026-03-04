// Test utilities and setup

// Mock database module
const mockConnection = {
  query: jest.fn(),
  execute: jest.fn(),
  beginTransaction: jest.fn().mockResolvedValue(),
  commit: jest.fn().mockResolvedValue(),
  rollback: jest.fn().mockResolvedValue(),
  release: jest.fn()
};

jest.mock('../config/database', () => ({
  query: jest.fn(),
  getConnection: jest.fn().mockResolvedValue(mockConnection),
  execute: jest.fn(),
  release: jest.fn()
}));

// Mock email service
jest.mock('../services/emailService', () => ({
  sendLowStockAlert: jest.fn().mockResolvedValue(true),
  sendOrderConfirmation: jest.fn().mockResolvedValue(true),
  sendPaymentReceipt: jest.fn().mockResolvedValue(true)
}));

// Mock SMS service
jest.mock('../services/smsService', () => ({
  sendSMS: jest.fn().mockResolvedValue(true)
}));

// Mock payment service
jest.mock('../services/paymentService', () => ({
  initiatePayment: jest.fn().mockResolvedValue({ success: true }),
  verifyPayment: jest.fn().mockResolvedValue({ success: true })
}));

// Mock invoice service
jest.mock('../services/invoiceService', () => ({
  generateInvoice: jest.fn().mockResolvedValue({ path: '/invoices/test.pdf' })
}));

module.exports = {};
