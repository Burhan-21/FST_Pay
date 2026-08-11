import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('E2E Rewards and Gamification Flow', () => {

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

  test('Teen Daily Streak, Badge Rack, and Statement Request', async ({ page }) => {
    // 1. Log in as Teen
    await loginUser(page, 'burhan.test1@gmail.com', 'Burhan@1234');
    await page.waitForURL('**/dashboard');

    // 2. Navigate to Rewards Page
    await page.click('aside >> text="Rewards"');
    await expect(page).toHaveURL(/.*rewards/);

    // 3. Test daily streak claim if not already claimed
    const streakBtn = page.locator('button:has-text("Claim +25 XP"), button:has-text("Claimed Today")');
    await expect(streakBtn).toBeVisible();
    
    const btnText = await streakBtn.innerText();
    if (btnText.includes('Claim +25 XP')) {
      await streakBtn.click();
      await page.waitForSelector('text=Daily Streak Claimed');
      await page.click('button:has-text("Dismiss")');
    }

    // 4. Test Email Statement Dispatch
    await page.click('button:has-text("Email Me Monthly Statement")');
    await page.waitForSelector('text=Report Dispatched');
    await page.click('button:has-text("Dismiss")');

    // 5. Verify Badge Rack and Rewards Shop catalog are present
    await expect(page.locator('text=Badge Rack')).toBeVisible();
    await expect(page.locator('text=Rewards Shop')).toBeVisible();

    // Logout
    await page.click('text=Logout');
    await page.waitForURL('**/login');
  });
});
