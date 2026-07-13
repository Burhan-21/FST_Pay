import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('E2E Authentication Flow', () => {

  test.beforeEach(async ({ page }) => {
    // Intercept Google reCAPTCHA script requests and mock the widget interface,
    // and abort external font/style requests that can hang offline.
    await page.route('**/*', route => {
      const url = route.request().url();
      if (url.includes('recaptcha/api.js')) {
        route.fulfill({
          status: 200,
          contentType: 'application/javascript',
          body: `
            window.grecaptcha = {
              render: (container, options) => {
                window.grecaptchaCallback = () => {
                  const cb = options.callback;
                  if (typeof cb === 'function') {
                    cb('mock-recaptcha-token');
                  } else if (typeof cb === 'string' && typeof window[cb] === 'function') {
                    window[cb]('mock-recaptcha-token');
                  }
                };
                return 123;
              },
              reset: () => {},
              getResponse: () => 'mock-recaptcha-token'
            };
          `
        });
      } else if (url.includes('fonts.googleapis.com') || url.includes('db.onlinewebfonts.com') || url.includes('fonts.gstatic.com')) {
        route.abort();
      } else {
        route.continue();
      }
    });

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  });

  async function triggerRecaptcha(page) {
    // Dynamically wait for grecaptchaCallback to be defined on window
    await page.waitForFunction(() => typeof (window as any).grecaptchaCallback === 'function', { timeout: 10000 });
    await page.evaluate(() => {
      (window as any).grecaptchaCallback('mock-recaptcha-token');
    });
    await page.waitForTimeout(200);
  }

  test('Happy path login and logout as Teen', async ({ page }) => {
    // 1. Enter email and password
    await page.fill('#login-email', 'burhan.test1@gmail.com');
    await page.fill('#login-password', 'Burhan@1234');

    // 2. Mock captcha verification
    await triggerRecaptcha(page);

    // 3. Submit credentials
    await page.click('button[type="submit"]');

    // 4. Enter OTP
    await page.waitForSelector('#otp-input');
    await page.fill('#otp-input', '123456');
    await page.click('button[type="submit"]');

    // 5. Verify redirect to Dashboard
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/.*dashboard/);

    // 6. Logout
    await page.click('text=Logout');
    await page.waitForURL('**/login');
    await expect(page).toHaveURL(/.*login/);
  });

  test('Login with invalid password shows error', async ({ page }) => {
    await page.fill('#login-email', 'burhan.test1@gmail.com');
    await page.fill('#login-password', 'WrongPassword123');

    await triggerRecaptcha(page);
    await page.click('button[type="submit"]');

    // Verify error banner is displayed
    const errorBanner = page.locator('text=Invalid email or password');
    await expect(errorBanner).toBeVisible();
  });

  test('Login with invalid OTP shows error', async ({ page }) => {
    await page.fill('#login-email', 'burhan.test1@gmail.com');
    await page.fill('#login-password', 'Burhan@1234');

    await triggerRecaptcha(page);
    await page.click('button[type="submit"]');

    await page.waitForSelector('#otp-input');
    await page.fill('#otp-input', '000000'); // Wrong OTP
    await page.click('button[type="submit"]');

    const errorBanner = page.locator('text=Invalid or expired OTP');
    await expect(errorBanner).toBeVisible();
  });

  test('Route guards redirect unauthenticated users to login', async ({ page }) => {
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/login');
    await expect(page).toHaveURL(/.*login/);

    await page.goto(`${BASE_URL}/parent/dashboard`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/login');
    await expect(page).toHaveURL(/.*login/);
  });

  test('Session state is persisted on refresh but cleared on logout', async ({ page }) => {
    // Login
    await page.fill('#login-email', 'burhan.test1@gmail.com');
    await page.fill('#login-password', 'Burhan@1234');
    await triggerRecaptcha(page);
    await page.click('button[type="submit"]');
    await page.waitForSelector('#otp-input');
    await page.fill('#otp-input', '123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // Refresh the page
    await page.reload();
    await page.waitForURL('**/dashboard');
    await expect(page).toHaveURL(/.*dashboard/);

    // Logout and verify refresh does not log back in
    await page.click('text=Logout');
    await page.waitForURL('**/login');
    await page.reload();
    await expect(page).toHaveURL(/.*login/);
  });
});
