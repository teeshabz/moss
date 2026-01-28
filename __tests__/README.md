# Testing

This directory contains tests for the Moss application.

## Test Structure

- `lib/api/` - Tests for business logic (media validation, weekly limits)

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

## Test Coverage

Current test coverage includes:

### Business Logic
- ✅ Media data validation (`validateMediaData`)
  - Title validation (missing, empty, whitespace)
  - Media type validation (BOOK, MOVIE, SONG, ALBUM, PODCAST, ARTICLE)
  - Article URL validation (HTTPS requirement)
  - Error cases
- ✅ Weekly limit calculations (`getCurrentWeekBounds`, `canCreatePost`)
  - Timezone handling (America/New_York)
  - Date range calculations
  - Limit checking

## Writing New Tests

When adding new features:

1. **Business Logic**: Add tests in `__tests__/lib/` matching the source file structure
2. **Mock Dependencies**: Use Jest mocks for Supabase clients and external services
3. **Test Cases**: Cover happy paths, error cases, and edge cases

## Example Test Structure

```typescript
import { functionToTest } from '@/lib/api/module'

describe('functionToTest', () => {
  it('should handle valid input', () => {
    // Test implementation
  })

  it('should throw error for invalid input', () => {
    // Test implementation
  })
})
```

## Note on API Route Tests

API route tests are not currently included due to setup complexity with Web API polyfills. Business logic tests provide the most value and can be run without additional configuration.
