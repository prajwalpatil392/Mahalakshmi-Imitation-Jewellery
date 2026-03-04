// Jest setup file
// This runs before all tests

// Set environment variables for testing
process.env.JWT_SECRET = 'test-secret-key-12345';
process.env.NODE_ENV = 'test';
process.env.DB_HOST = 'localhost';
process.env.DB_USER = 'test_user';
process.env.DB_PASSWORD = 'test_password';
process.env.DB_NAME = 'mahalakshmi_test';
process.env.PORT = '5001';

// Suppress console logs during tests unless needed
const originalLog = console.log;
const originalError = console.error;

beforeAll(() => {
  // Uncomment below if you want to see logs during tests
  // console.log = originalLog;
  // console.error = originalError;
});

afterEach(() => {
  jest.clearAllMocks();
});
