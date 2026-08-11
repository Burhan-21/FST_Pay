import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('E2E Wallet and Transfer Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Intercept Google reCAPTCHA script requests and mock the widget interface
    await page.route('**/recaptcha/api.js*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/javascript',
        body: `
          window.grecaptcha = {
            render: (container, options) => {
              window.grecaptchaCallback = options.callback;
              return 123;
            },
            reset: () => {},
            getResponse: () => 'mock-recaptcha-token'
          };
        `
      });
    });
  });

  async function triggerRecaptcha(page: import('@playwright/test').Page) {
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const win = window as unknown as { grecaptchaCallback?: (token: string) => void };
      if (typeof win.grecaptchaCallback === 'function') {
        win.grecaptchaCallback('mock-recaptcha-token');
      } else {
        console.error('grecaptchaCallback not found on window');
      }
    });
    await page.waitForTimeout(200);
  }

  async function loginUser(page, email, password) {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('#login-email', email);
    await page.fill('#login-password', password);
    await triggerRecaptcha(page);
    await page.click('button[type="submit"]');

    await page.waitForSelector('#otp-input');
    await page.fill('#otp-input', '123456');
    await page.click('button[type="submit"]');
  }

  test('Teen Wallet Top-up Flow', async ({ page }) => {
    // 1. Log in as Teen
    await loginUser(page, 'burhan.test1@gmail.com', 'Burhan@1234');
    await page.waitForURL('**/dashboard');

    // 2. Navigate to Wallet Page
    await page.click('aside >> text="Wallet"');
    await expect(page).toHaveURL(/.*wallet/);

    // 3. Click "Add Money" button
    await page.click('text=Add Money');

    // 4. Fill in amount and proceed
    await page.waitForSelector('input[type="number"]');
    await page.fill('input[type="number"]', '500');
    await page.click('text=Proceed to Pay');

    // 5. Click "Simulate Payment"
    await page.click('text=Simulate Payment');

    // 6. Verify top-up success indicator
    await page.waitForSelector('text=Money Added Successfully!');
    
    // Wait for the modal to auto-close and the page to update
    await page.waitForSelector('text=Money Added Successfully!', { state: 'hidden', timeout: 5000 });

    // 7. Verify the credit transaction appears in history
    await expect(page.locator('text=Wallet top-up via UPI').first()).toBeVisible();

    // 8. Logout
    await page.click('text=Logout');
    await page.waitForURL('**/login');
  });

  test('Parent Pocket Money Allowance Flow', async ({ page }) => {
    // 1. Log in as Parent
    await loginUser(page, 'burhan.parent1@gmail.com', 'Burhan@1234');
    await page.waitForURL('**/parent/dashboard');

    // 2. Navigate to Parent's Wallet and Top Up to ensure sufficient balance
    await page.goto(`${BASE_URL}/wallet`);
    await expect(page).toHaveURL(/.*wallet/);
    await page.click('text=Add Money');
    await page.waitForSelector('input[type="number"]');
    await page.fill('input[type="number"]', '1000');
    await page.click('text=Proceed to Pay');
    await page.click('text=Simulate Payment');
    await page.waitForSelector('text=Money Added Successfully!');
    await page.waitForSelector('text=Money Added Successfully!', { state: 'hidden', timeout: 5000 });

    // 3. Navigate back to Parent Dashboard
    await page.click('aside >> text="Parent Panel"');
    await page.waitForURL('**/parent/dashboard');

    // 4. Verify dashboard loaded and has children list
    await expect(page.locator('text=Linked Teen Accounts')).toBeVisible();

    // 5. Find the child and trigger Send Pocket Money modal
    await page.locator('div').filter({ hasText: 'burhan.test1@gmail.com' }).locator('button:has-text("Send Pocket Money")').first().click();

    // 6. Fill amount and description
    await page.waitForSelector('#pocketMoneyAmt');
    await page.fill('#pocketMoneyAmt', '100');
    await page.fill('#pocketMoneyDesc', 'E2E Weekly Pocket Money');

    // 7. Click Confirm Send
    await page.click('button:has-text("Confirm Pocket Money Send")');

    // 6. Verify modal closes
    await page.waitForSelector('#pocketMoneyAmt', { state: 'hidden', timeout: 5000 });

    // 7. Logout
    await page.click('text=Logout');
    await page.waitForURL('**/login');

    // 8. Log in as Child to verify transfer receipt
    await loginUser(page, 'burhan.test1@gmail.com', 'Burhan@1234');
    await page.waitForURL('**/dashboard');

    // Navigate to Wallet
    await page.click('aside >> text="Wallet"');
    await expect(page).toHaveURL(/.*wallet/);

    // Verify received transaction exists
    await expect(page.locator('text=E2E Weekly Pocket Money').first()).toBeVisible();

    // Logout
    await page.click('text=Logout');
    await page.waitForURL('**/login');
  });
});
