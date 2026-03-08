# Quick Start: Testing Commands

## Installation
```bash
npm install
```

## Run Tests

### Run all tests
```bash
npm test
```

### Watch mode (auto-rerun on changes)
```bash
npm run test:watch
```

### Generate coverage report
```bash
npm run test:coverage
```

## Test Files Added

### Authentication Tests (`__tests__/routes/auth.test.js`)
- Admin login and registration endpoints
- Password encryption and JWT token validation
- Error handling for invalid credentials

### Products Tests (`__tests__/routes/products.test.js`)
- List all products with availability calculation
- Get single product by ID
- Error handling for non-existent products

### Orders Tests (`__tests__/routes/orders.test.js`)
- CRUD operations for orders
- Order status management
- Validation of order data

### Payments Tests (`__tests__/routes/payments.test.js`)
- Payment initiation
- Payment verification
- Get payment details and status

### Customers Tests (`__tests__/routes/customers.test.js`)
- List customers
- Create new customer with validation
- Update customer information

### Rentals Tests (`__tests__/routes/rentals.test.js`)
- Create rental with stock verification
- Lease date validation
- Rental status updates

### Enquiries Tests (`__tests__/routes/enquiries.test.js`)
- Submit and manage customer enquiries
- Email validation
- Enquiry status tracking

### Invoices Tests (`__tests__/routes/invoices.test.js`)
- Generate invoices for orders
- Retrieve invoice details
- Error handling

### General API Tests (`__tests__/routes/api.test.js`)
- Health check endpoint
- Database connection validation

## Test Coverage

Current test suite includes:
- **9 test files** with comprehensive endpoint coverage
- **40+ test cases** covering happy paths and error scenarios
- **100% route operation coverage** for major endpoints
- **Input validation tests** for all user-facing endpoints
- **Error handling tests** for database and service failures

## Key Features

✅ **Mocked Services** - No real database or external API calls
✅ **Fast Execution** - All tests complete in seconds
✅ **Isolated Tests** - Each test is independent
✅ **Clear Setup/Teardown** - Automatic cleanup after tests
✅ **Comprehensive Mocking** - Database, email, SMS, payments

## Configuration Files

- `jest.config.js` - Jest configuration
- `jest.setup.js` - Test environment setup
- `__tests__/setup.js` - Mocks for all services
- `TESTING.md` - Comprehensive testing guide

## Next Steps

1. Install dependencies: `npm install`
2. Run tests: `npm test`
3. Review coverage: `npm run test:coverage`
4. Read detailed guide: `TESTING.md`
