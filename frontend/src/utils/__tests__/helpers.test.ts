import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatRelativeTime,
  maskCardNumber,
  parseMoneyInput,
  validateCurrencyAmount,
  safeDivide,
  calculatePercentage,
  debounce,
} from '../helpers';

describe('formatCurrency', () => {
  it('formats valid amount in INR', () => {
    expect(formatCurrency(1000)).toContain('1,000');
  });

  it('returns fallback for non-finite values', () => {
    expect(formatCurrency(NaN)).toBe('₹0.00');
    expect(formatCurrency(Infinity)).toBe('₹0.00');
  });

  it('uses default INR currency', () => {
    const result = formatCurrency(500);
    expect(result).toContain('500');
  });
});

describe('formatDate', () => {
  it('formats a valid date string', () => {
    const result = formatDate('2026-06-18T12:00:00Z');
    expect(result).not.toBe('Invalid date');
  });

  it('returns fallback for invalid date', () => {
    expect(formatDate('not-a-date')).toBe('Invalid date');
  });
});

describe('formatDateTime', () => {
  it('formats valid datetime', () => {
    const result = formatDateTime('2026-06-18T12:00:00Z');
    expect(result).not.toBe('Invalid date');
  });

  it('returns fallback for invalid input', () => {
    expect(formatDateTime('bad')).toBe('Invalid date');
  });
});

describe('formatRelativeTime', () => {
  it('returns "Just now" for recent dates', () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe('Just now');
  });

  it('returns fallback for invalid input', () => {
    expect(formatRelativeTime('')).toBe('Recently');
  });
});

describe('maskCardNumber', () => {
  it('masks card number showing last 4 digits', () => {
    expect(maskCardNumber('1234567890123456')).toBe('•••• •••• •••• 3456');
  });

  it('handles null input', () => {
    expect(maskCardNumber(null)).toBe('•••• •••• •••• ••••');
  });

  it('handles undefined input', () => {
    expect(maskCardNumber(undefined)).toBe('•••• •••• •••• ••••');
  });

  it('handles short numbers', () => {
    expect(maskCardNumber('123')).toBe('123');
  });

  it('handles card numbers with spaces', () => {
    expect(maskCardNumber('1234 5678 9012 3456')).toBe('•••• •••• •••• 3456');
  });
});

describe('parseMoneyInput', () => {
  it('parses valid input', () => {
    expect(parseMoneyInput('100.50')).toBe(100.5);
  });

  it('returns null for empty input', () => {
    expect(parseMoneyInput('')).toBeNull();
  });

  it('returns null for non-numeric input', () => {
    expect(parseMoneyInput('abc')).toBeNull();
  });

  it('returns null for values below min', () => {
    expect(parseMoneyInput('-10', 0)).toBeNull();
  });

  it('returns null for values above max', () => {
    expect(parseMoneyInput('1000000000', 0, 999999999)).toBeNull();
  });

  it('rounds to 2 decimal places', () => {
    expect(parseMoneyInput('100.456')).toBe(100.46);
  });
});

describe('validateCurrencyAmount', () => {
  it('returns empty string for valid amount', () => {
    expect(validateCurrencyAmount(100, 'Amount')).toBe('');
  });

  it('returns error for null', () => {
    expect(validateCurrencyAmount(null, 'Amount')).toContain('required');
  });

  it('returns error for NaN', () => {
    expect(validateCurrencyAmount(NaN, 'Amount')).toContain('valid number');
  });

  it('returns error for zero', () => {
    expect(validateCurrencyAmount(0, 'Amount')).toContain('greater than zero');
  });

  it('returns error for negative', () => {
    expect(validateCurrencyAmount(-1, 'Amount')).toContain('greater than zero');
  });
});

describe('safeDivide', () => {
  it('divides normally', () => {
    expect(safeDivide(10, 2)).toBe(5);
  });

  it('returns default when dividing by zero', () => {
    expect(safeDivide(10, 0)).toBe(0);
  });

  it('returns default when numerator is not finite', () => {
    expect(safeDivide(NaN, 5)).toBe(0);
  });

  it('returns custom default value', () => {
    expect(safeDivide(10, 0, -1)).toBe(-1);
  });
});

describe('calculatePercentage', () => {
  it('calculates percentage', () => {
    expect(calculatePercentage(25, 100)).toBe(25);
  });

  it('returns default for zero total', () => {
    expect(calculatePercentage(10, 0)).toBe(0);
  });

  it('rounds to integer', () => {
    expect(calculatePercentage(1, 3)).toBe(33);
  });
});

describe('debounce', () => {
  it('creates a debounced function', () => {
    const fn = debounce(() => {}, 100);
    expect(typeof fn).toBe('function');
  });
});
