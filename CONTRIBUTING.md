# Contributing to vn-payment

First off, thank you for considering contributing to `vn-payment`! It's people like you that make open-source a great community.

## Prerequisites

- **Node.js**: v18 or newer (v20+ recommended)
- **Package Manager**: [pnpm](https://pnpm.io/) (v8 or newer)

## Local Development Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/vn-payment.git
   cd vn-payment
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Build all packages:
   ```bash
   pnpm run build
   ```

## Project Structure

This project is a monorepo managed by `pnpm workspace`.

- `packages/core` - Contains shared interfaces (`IPaymentProvider`), Types, and Errors.
- `packages/momo` - MoMo payment adapter.
- `packages/vnpay` - VNPay payment adapter.
- `packages/zalopay` - ZaloPay payment adapter.
- `packages/mock` - Mock adapter for local testing without network requests.
- `docs/` - VitePress documentation site.
- `examples/` - Example scripts demonstrating how to use the adapters.

## Writing Code

When adding a new adapter or modifying an existing one:

1. **Adhere to the Interface**: All adapters MUST implement the `IPaymentProvider` interface located in `@vn-payment/core`.
2. **Write Tests**: Please add tests for your changes. We use [Vitest](https://vitest.dev/).
   - To run tests: `pnpm test`
3. **Type Checking**: Ensure there are no TypeScript errors.
   - Run: `pnpm run typecheck`
4. **Formatting/Linting**: 
   - Run: `pnpm run lint`

## Adding a New Payment Adapter

If you want to add support for a new Vietnamese payment gateway (e.g., VNPT EPAY, ShopeePay):
1. Create a new directory in `packages/` (e.g., `packages/shopeepay`).
2. Copy `package.json` and `tsconfig.json` from an existing adapter and update the names.
3. Update `packages/core/src/types/index.ts` to include the new provider string (e.g., `"shopeepay"`).
4. Implement the logic and write unit tests.
5. Update the `README.md` and documentation in `docs/guide/` to include the new adapter.

## Submitting a Pull Request

1. Create a new branch (`git checkout -b feature/my-awesome-feature`).
2. Make your changes and commit them with descriptive messages.
3. Push to your fork (`git push origin feature/my-awesome-feature`).
4. Open a Pull Request on GitHub.
5. A maintainer will review your code.

Thank you for contributing!
