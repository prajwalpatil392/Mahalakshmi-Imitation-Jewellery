# Testing Guide for Mahalakshmi API

This document provides comprehensive information about the testing setup and how to run tests for the Mahalakshmi Jewellery Rental System API.

## Overview

The project uses **Jest** as the testing framework and **Supertest** for HTTP endpoint testing. All tests are located in the `__tests__` directory and follow Jest's naming conventions.

## Installation

First, install the testing dependencies:

```bash
npm install
```

This will install Jest and Supertest as dev dependencies as specified in `package.json`.

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode (re-run on file changes)
```bash
npm run test:watch
```

### Run tests with coverage report
```bash
npm run test:coverage
```

This generates a coverage report showing:
- Line coverage
- Branch coverage
- Function coverage
- Statement coverage

## Test Structure

### Directory Layout
```
__tests__/
├── routes/
│   ├── auth.test.js           # Authentication tests
│   ├── products.test.js       # Products endpoint tests
│   ├── orders.test.js         # Orders endpoint tests
│   ├── payments.test.js       # Payments endpoint tests
│   ├── customers.test.js      # Customers endpoint tests
│   ├── rentals.test.js        # Rentals endpoint tests
│   ├── enquiries.test.js      # Enquiries endpoint tests
│   ├── invoices.test.js       # Invoices endpoint tests
│   └── api.test.js            # General API health checks
├── setup.js                   # Test setup and mocks
├── services/                  # Service tests (future)
└── utils/                     # Test utilities (future)
```

### Test Files Created

#### 1. **auth.test.js** - Authentication Routes
- `POST /api/auth/register` - Admin registration
  - ✅ Successfully register new admin
  - ✅ Prevent duplicate admin registration
  - ✅ Handle database errors
  - ✅ Validate required fields
- `POST /api/auth/login` - Admin login
  - ✅ Login with correct credentials
  - ✅ Reject invalid username
  - ✅ Reject incorrect password
  - ✅ Handle database errors

#### 2. **products.test.js** - Products Management
- `GET /api/products` - List all products
  - ✅ Return all products with availability
  - ✅ Handle database errors
  - ✅ Return empty array when no products
- `GET /api/products/:id` - Get single product
  - ✅ Return product details by ID
  - ✅ Return 404 for non-existent product
  - ✅ Handle invalid product ID

#### 3. **orders.test.js** - Orders Management
- `GET /api/orders` - List all orders
  - ✅ Return all orders
  - ✅ Handle database errors
- `POST /api/orders` - Create new order
  - ✅ Create order successfully
  - ✅ Validate required fields
  - ✅ Handle database errors
- `GET /api/orders/:id` - Get order details
  - ✅ Return order by ID
  - ✅ Return 404 for non-existent order
- `PUT /api/orders/:id` - Update order status
  - ✅ Update order status
  - ✅ Fail for non-existent order

#### 4. **payments.test.js** - Payment Processing
- `POST /api/payments/initiate` - Initiate payment
  - ✅ Initiate payment successfully
  - ✅ Validate payment method
  - ✅ Fail for non-existent order
- `POST /api/payments/verify` - Verify payment
  - ✅ Verify payment successfully
  - ✅ Fail for invalid payment
- `GET /api/payments/:id` - Get payment details
  - ✅ Get payment details
  - ✅ Return 404 for non-existent payment

#### 5. **customers.test.js** - Customer Management
- `GET /api/customers` - List all customers
  - ✅ Return all customers
- `POST /api/customers` - Create customer
  - ✅ Create new customer
  - ✅ Validate email format
  - ✅ Require mandatory fields
- `GET /api/customers/:id` - Get customer details
  - ✅ Return customer by ID
  - ✅ Return 404 for non-existent customer
- `PUT /api/customers/:id` - Update customer
  - ✅ Update customer information

#### 6. **rentals.test.js** - Rental Management
- `POST /api/rentals` - Create rental
  - ✅ Create new rental
  - ✅ Check product stock
  - ✅ Validate rental dates
- `GET /api/rentals` - List all rentals
  - ✅ Return all rentals
- `GET /api/rentals/:id` - Get rental details
  - ✅ Return rental by ID
- `PUT /api/rentals/:id` - Update rental
  - ✅ Update rental status

#### 7. **enquiries.test.js** - Customer Enquiries
- `POST /api/enquiries` - Create enquiry
  - ✅ Create new enquiry
  - ✅ Validate required fields
  - ✅ Validate email format
- `GET /api/enquiries` - List all enquiries
  - ✅ Return all enquiries
- `GET /api/enquiries/:id` - Get enquiry details
  - ✅ Return enquiry by ID
- `PUT /api/enquiries/:id` - Update enquiry
  - ✅ Update enquiry status

#### 8. **invoices.test.js** - Invoice Management
- `GET /api/invoices/:orderId` - Get invoice
  - ✅ Retrieve invoice for order
  - ✅ Return 404 if not found
- `POST /api/invoices` - Generate invoice
  - ✅ Generate invoice for order
  - ✅ Fail for non-existent order

#### 9. **api.test.js** - General API Tests
- Health Check Tests
  - ✅ Return health status
  - ✅ Verify response format
- Database Connection Tests
  - ✅ Test database connection
  - ✅ Handle connection errors

## Test Setup & Configuration

### jest.config.js
- Configures Jest for Node.js environment
- Sets coverage thresholds
- Defines test file patterns
- Specifies setup files

### jest.setup.js
- Sets environment variables for testing
- Configures test-specific settings
- Clears mocks after each test

### __tests__/setup.js
- Mocks database module (`config/database`)
- Mocks email service
- Mocks SMS service
- Mocks payment service
- Mocks invoice service

## Mocking Strategy

The test suite uses Jest mocks to:
1. **Database Mocks** - `db.query()` returns controlled test data
2. **Service Mocks** - Email, SMS, and payment services are mocked
3. **No Real Database** - Tests run without connecting to actual database
4. **No External API Calls** - Payment gateways and email services are mocked

### Example: Mocking Database Query
```javascript
db.query.mockResolvedValueOnce([[{ id: 1, name: 'Test' }], []]);
```

## Running Individual Test Suites

```bash
# Run only auth tests
npm test -- auth.test.js

# Run only products tests
npm test -- products.test.js

# Run tests matching a pattern
npm test -- --testNamePattern="should create"
```

## Debugging Tests

### Run tests with verbose output
```bash
npm test -- --verbose
```

### Run single test file
```bash
npm test -- __tests__/routes/auth.test.js
```

### Debug mode (pause on breakpoint)
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Test Coverage

After running tests with coverage, view the report:

```bash
npm run test:coverage
```

This generates an HTML coverage report in the `coverage/` directory that you can open in your browser.

### Coverage Goals
- Lines: 80%+
- Branches: 75%+
- Functions: 80%+
- Statements: 80%+

## Adding New Tests

To add tests for new endpoints:

1. **Create test file**: `__tests__/routes/newfeature.test.js`
2. **Import dependencies**:
   ```javascript
   require('../setup');
   const request = require('supertest');
   const express = require('express');
   const db = require('../../config/database');
   ```
3. **Create test suite**:
   ```javascript
   describe('Feature Routes', () => {
     describe('GET /api/feature', () => {
       it('should return feature data', async () => {
         // Setup mock
         db.query.mockResolvedValueOnce([mockData, []]);
         
         // Make request
         const res = await request(app).get('/api/feature');
         
         // Assert
         expect(res.status).toBe(200);
       });
     });
   });
   ```

## Best Practices

1. **Test One Thing Per Test** - Each test should verify a single behavior
2. **Use Meaningful Names** - Test names should describe what's being tested
3. **Mock External Dependencies** - Don't call real APIs or databases
4. **Setup & Teardown** - Clean up after each test
5. **DRY Code** - Use helper functions to avoid repetition
6. **Test Edge Cases** - Include tests for errors and invalid inputs
7. **Keep Tests Fast** - Mock slow operations
8. **Organize Tests** - Group related tests with `describe()`

## CI/CD Integration

To integrate tests into CI/CD pipeline:

```bash
# In your CI configuration (GitHub Actions, GitLab CI, etc.)
npm ci
npm run test:coverage

# Fail if coverage below threshold
if [ $? -ne 0 ]; then exit 1; fi
```

## Troubleshooting

### Tests hang or timeout
- Check `jest.config.js` for `testTimeout` setting
- Increase timeout if needed: `testTimeout: 30000`
- Ensure mocks are properly configured

### Database connection errors
- Tests use mocked database; real DB not needed
- Check `jest.setup.js` for environment variables
- Verify mocks in `__tests__/setup.js`

### "Cannot find module" errors
- Clear Jest cache: `npm test -- --clearCache`
- Ensure paths are correct in imports
- Check `jest.config.js` for correct root setup

### Flaky tests
- Avoid time-dependent assertions
- Mock dates if needed: `jest.useFakeTimers()`
- Ensure isolation between tests

## Next Steps

1. Run the tests to verify setup:
   ```bash
   npm install
   npm test
   ```

2. Review coverage report:
   ```bash
   npm run test:coverage
   ```

3. Add tests for remaining routes and services

4. Integrate tests into CI/CD pipeline

5. Set coverage thresholds and enforce them

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://jestjs.io/docs/getting-started)

## Support

For issues or questions about testing, refer to:
- Jest docs: https://jestjs.io/
- Supertest docs: https://github.com/visionmedia/supertest
- Node testing guides: https://nodejs.org/en/docs/guides/testing/
