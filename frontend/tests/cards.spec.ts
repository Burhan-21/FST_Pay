import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('E2E Virtual Cards Flow', () => {

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

  async function triggerRecaptcha(page) {
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      if (typeof (window as any).grecaptchaCallback === 'function') {
        (window as any).grecaptchaCallback('mock-recaptcha-token');
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

  test('Teen Virtual Card Lifecycle Management', async ({ page }) => {
    // 1. Log in as Teen
    await loginUser(page, 'burhan.test1@gmail.com', 'Burhan@1234');
    await page.waitForURL('**/dashboard');

    // 2. Navigate to Cards Page
    await page.click('aside >> text="Cards"');
    await expect(page).toHaveURL(/.*cards/);

    // Get current cards count if any
    const initialCardElements = await page.locator('.card-3d').count();

    // 3. Generate a New Virtual Card
    await page.click('button:has-text("New Card")');
    await page.waitForSelector('text=Generate New Card');

    // Fill Limits
    await page.fill('input[type="number"] >> nth=0', '6000');
    await page.fill('input[type="number"] >> nth=1', '3000');

    // Select Cyberpunk design (gradient 2) and Panda mascot
    await page.locator('button[title="Cyberpunk"]').click();
    await page.locator('button:has-text("Panda")').click();

    // Generate
    await page.click('button:has-text("Generate Card")');
    await page.waitForSelector('text=Generate New Card', { state: 'hidden', timeout: 5000 });

    // Verify a new card is added
    await expect(page.locator('.card-3d')).toHaveCount(initialCardElements + 1);

    // Get the newly created card container (which is the last one in order)
    const newCard = page.locator('.card-3d').last();

    // Verify details on the new card
    await expect(newCard.locator('text=Limit: ₹6,000')).toBeVisible();
    await expect(newCard.locator('text=Daily: ₹3,000')).toBeVisible();
    await expect(newCard.locator('text=🐼')).toBeVisible();

    // 4. Test Freeze and Unfreeze
    // Toggle Freeze
    await newCard.locator('button[title="Freeze"]').click();
    await expect(newCard.locator('text=FROZEN')).toBeVisible();

    // Toggle Unfreeze
    await newCard.locator('button[title="Unfreeze"]').click();
    await expect(newCard.locator('text=ACTIVE')).toBeVisible();

    // 5. Test Limit Modification
    await newCard.locator('button[title="Limits"]').click();
    await page.waitForSelector('text=Adjust Card Limits');

    // Update limits
    await page.fill('input[type="number"] >> nth=0', '7000');
    await page.fill('input[type="number"] >> nth=1', '4000');
    await page.click('button:has-text("Save Limits")');
    await page.waitForSelector('text=Adjust Card Limits', { state: 'hidden', timeout: 5000 });

    // Verify limit updates displayed
    await expect(newCard.locator('text=Limit: ₹7,000')).toBeVisible();
    await expect(newCard.locator('text=Daily: ₹4,000')).toBeVisible();

    // 6. Test Card Deletion
    await newCard.locator('button[title="Delete"]').click();
    await page.waitForSelector('text=Cancel Virtual Card');
    await page.click('button:has-text("Confirm")');

    // Verify card is removed
    await expect(page.locator('.card-3d')).toHaveCount(initialCardElements);

    // Logout
    await page.click('text=Logout');
    await page.waitForURL('**/login');
  });
});
