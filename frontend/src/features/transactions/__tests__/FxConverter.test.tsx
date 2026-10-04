import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TransactionsPage from '../TransactionsPage';
import { transactionApi, fxApi } from '../../../api/endpoints';

// Mock endpoints
vi.mock('../../../api/endpoints', () => ({
  transactionApi: {
    getTransactions: vi.fn(),
    simulateSpend: vi.fn(),
    exportTransactions: vi.fn(),
  },
  fxApi: {
    getCurrencies: vi.fn(),
    getRates: vi.fn(),
    getQuote: vi.fn(),
  },
}));

describe('Multi-Currency & FX Converter in TransactionsPage', () => {
  const mockTransactions = [
    {
      id: 'txn-inr-1',
      walletId: 'w-1',
      type: 'DEBIT' as const,
      category: 'FOOD',
      amount: 450,
      balanceAfter: 9550,
      merchant: 'Swiggy',
      description: 'Lunch order',
      referenceId: 'ref-1',
      status: 'SETTLED',
      createdAt: '2026-09-13T12:00:00Z',
    },
    {
      id: 'txn-usd-2',
      walletId: 'w-1',
      type: 'DEBIT' as const,
      category: 'SHOPPING',
      amount: 1755.95,
      balanceAfter: 7794.05,
      merchant: 'Steam Games',
      description: 'Game DLC purchase',
      referenceId: 'ref-2',
      status: 'SETTLED',
      createdAt: '2026-09-13T12:30:00Z',
      originalAmount: 20.0,
      originalCurrency: 'USD',
      fxRate: 86.5,
      fxFee: 25.95,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(transactionApi.getTransactions).mockResolvedValue({
      data: {
        data: {
          content: mockTransactions,
        },
      },
    } as never);
  });

  it('renders foreign currency badge and exchange rate details for multi-currency transactions', async () => {
    render(
      <MemoryRouter>
        <TransactionsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Steam Games')).toBeDefined();
    });

    // Check foreign currency badge
    const foreignBadge = screen.getByTestId('foreign-currency-badge');
    expect(foreignBadge).toBeDefined();
    expect(foreignBadge.textContent).toContain('20.00 USD');

    // Check FX rate and fee details in description line
    expect(screen.getByText(/1 USD = ₹86.50/)).toBeDefined();
    expect(screen.getByText(/Fee: ₹25.95/)).toBeDefined();
  });

  it('opens simulate modal and fetches live FX quote when foreign currency is selected', async () => {
    vi.mocked(fxApi.getQuote).mockResolvedValue({
      data: {
        success: true,
        data: {
          sourceAmount: 25.0,
          sourceCurrency: 'USD',
          targetCurrency: 'INR',
          exchangeRate: 86.5,
          convertedAmount: 2162.5,
          feePercentage: 1.5,
          feeAmount: 32.44,
          totalAmount: 2194.94,
          expiresInSeconds: 900,
        },
      },
    } as never);

    render(
      <MemoryRouter>
        <TransactionsPage />
      </MemoryRouter>
    );

    // Click "Simulate Spend" button
    const simulateButton = screen.getByRole('button', { name: /Simulate Spend/i });
    fireEvent.click(simulateButton);

    // Modal should be visible
    expect(screen.getByPlaceholderText(/e\.g\. Swiggy, Netflix/i)).toBeDefined();

    // Change currency to USD
    const currencySelect = screen.getByRole('combobox', { name: /Currency/i });
    fireEvent.change(currencySelect, { target: { value: 'USD' } });

    // Enter Amount
    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '25' } });

    // Wait for debounced getQuote API call
    await waitFor(
      () => {
        expect(fxApi.getQuote).toHaveBeenCalledWith(25, 'USD', 'INR');
      },
      { timeout: 1500 }
    );

    // Verify quote breakdown is displayed
    await waitFor(() => {
      expect(screen.getByText('1 USD = ₹86.50')).toBeDefined();
      expect(screen.getByText('₹2162.50')).toBeDefined();
      expect(screen.getByText('₹32.44')).toBeDefined();
      expect(screen.getByText('₹2194.94')).toBeDefined();
    });
  });

  it('submits simulation with selected foreign currency', async () => {
    vi.mocked(transactionApi.simulateSpend).mockResolvedValue({
      status: 200,
      data: {
        success: true,
        data: {
          id: 'txn-new',
          amount: 2194.94,
          originalAmount: 25.0,
          originalCurrency: 'USD',
          status: 'SETTLED',
        },
      },
    } as never);

    render(
      <MemoryRouter>
        <TransactionsPage />
      </MemoryRouter>
    );

    // Open modal
    fireEvent.click(screen.getByRole('button', { name: /Simulate Spend/i }));

    // Fill form
    const merchantInput = screen.getByPlaceholderText(/e\.g\. Swiggy, Netflix/i);
    fireEvent.change(merchantInput, { target: { value: 'Steam' } });

    const currencySelect = screen.getByRole('combobox', { name: /Currency/i });
    fireEvent.change(currencySelect, { target: { value: 'USD' } });

    const amountInput = screen.getByPlaceholderText('0.00');
    fireEvent.change(amountInput, { target: { value: '25' } });

    // Submit form (button with text "Simulate" inside the form)
    const submitButton = screen.getByRole('button', { name: /^Simulate$/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(transactionApi.simulateSpend).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: 25,
          currency: 'USD',
          merchant: 'Steam',
        })
      );
    });
  });
});
