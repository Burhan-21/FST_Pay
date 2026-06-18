export function formatCurrency(amount: number, currency: string = 'INR'): string {
  if (!Number.isFinite(amount)) {
    return '₹0.00';
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function isValidDate(d: Date): boolean {
  return d instanceof Date && !isNaN(d.getTime());
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (!isValidDate(date)) return 'Invalid date';
  try {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Invalid date';
  }
}

export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (!isValidDate(date)) return 'Invalid date';
  try {
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Invalid date';
  }
}

export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  if (!isValidDate(date)) return 'Recently';
  try {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHr = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHr / 24);

    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHr < 24) return `${diffHr}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return formatDate(dateStr);
  } catch {
    return 'Recently';
  }
}

export function maskCardNumber(num: string | null | undefined): string {
  if (!num) return '•••• •••• •••• ••••';
  const clean = num.replace(/\s/g, '');
  if (clean.length < 4) return clean;
  return `•••• •••• •••• ${clean.slice(-4)}`;
}

/**
 * Parse and validate currency input
 * @param value - String value to parse
 * @param min - Minimum allowed value (default: 0)
 * @param max - Maximum allowed value (default: 999999999)
 * @returns Parsed number or null if invalid
 */
export function parseMoneyInput(value: string, min: number = 0, max: number = 999999999): number | null {
  if (!value || value.trim() === '') {
    return null;
  }
  
  const parsed = parseFloat(value);
  
  if (!Number.isFinite(parsed)) {
    return null;
  }
  
  if (parsed < min || parsed > max) {
    return null;
  }
  
  // Round to 2 decimal places for money
  return Math.round(parsed * 100) / 100;
}

/**
 * Validate if amount is a valid currency value
 * @param amount - Amount to validate
 * @returns Validation error message or empty string if valid
 */
export function validateCurrencyAmount(amount: number | null | undefined, fieldName: string = 'Amount'): string {
  if (amount === null || amount === undefined) {
    return `${fieldName} is required`;
  }
  
  if (!Number.isFinite(amount)) {
    return `${fieldName} must be a valid number`;
  }
  
  if (amount <= 0) {
    return `${fieldName} must be greater than zero`;
  }
  
  return '';
}

/**
 * Safely divide two numbers to prevent division by zero
 * @param numerator - Numerator
 * @param denominator - Denominator
 * @param defaultValue - Value to return if denominator is 0
 * @returns Result of division or default value
 */
export function safeDivide(numerator: number, denominator: number, defaultValue: number = 0): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return defaultValue;
  }
  return numerator / denominator;
}

/**
 * Calculate percentage safely
 * @param amount - Amount
 * @param total - Total
 * @param defaultValue - Value to return if total is 0
 * @returns Percentage (0-100) or default value
 */
export function calculatePercentage(amount: number, total: number, defaultValue: number = 0): number {
  const result = safeDivide(amount, total, defaultValue);
  return Math.round(result * 100);
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    FOOD: '#f59e0b',
    TRANSPORT: '#3b82f6',
    SHOPPING: '#ec4899',
    ENTERTAINMENT: '#8b5cf6',
    EDUCATION: '#10b981',
    HEALTH: '#ef4444',
    BILLS: '#f97316',
    SAVINGS: '#06b6d4',
    OTHER: '#6b7280',
  };
  return colors[category.toUpperCase()] || colors.OTHER;
}

export function getCategoryEmoji(category: string): string {
  const emojis: Record<string, string> = {
    FOOD: '🍔',
    TRANSPORT: '🚗',
    SHOPPING: '🛍️',
    ENTERTAINMENT: '🎮',
    EDUCATION: '📚',
    HEALTH: '💊',
    BILLS: '📄',
    SAVINGS: '💰',
    TOPUP: '💳',
    OTHER: '📌',
  };
  return emojis[category.toUpperCase()] || emojis.OTHER;
}

/**
 * Debounce function for rate-limiting function calls
 * @param func - Function to debounce
 * @param wait - Wait time in milliseconds
 * @returns Debounced function
 */
export function debounce<T extends (...args: any[]) => any>(func: T, wait: number): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Retry logic for failed promises
 * @param fn - Function that returns a promise
 * @param retries - Number of retries
 * @param delay - Delay between retries in ms
 * @returns Promise
 */
export async function retryPromise<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryPromise(fn, retries - 1, delay * 2);
  }
}
