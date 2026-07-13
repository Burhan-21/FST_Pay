import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:5173';

test.describe('E2E Parent Supervision Flow', () => {

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
                window.grecaptchaCallback = options.callback;
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
  });

  async function triggerRecaptcha(page) {
    // Dynamically wait for grecaptchaCallback to be defined on window
    await page.waitForFunction(() => typeof (window as any).grecaptchaCallback === 'function', { timeout: 10000 });
    await page.evaluate(() => {
      (window as any).grecaptchaCallback('mock-recaptcha-token');
    });
    await page.waitForTimeout(200);
  }

  async function loginUser(page, email, password) {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
    await page.fill('#login-email', email);
    await page.fill('#login-password', password);
    await triggerRecaptcha(page);
    await page.click('button[type="submit"]');

    await page.waitForSelector('#otp-input');
    await page.fill('#otp-input', '123456');
    await page.click('button[type="submit"]');
  }

  test('Parent-Child Unlinking, Inviting, Accepting, and Approval Request Cycle', async ({ page }) => {
    // 1. Log in as Teen to check and clean up any existing links or pending invites
    await loginUser(page, 'burhan.test1@gmail.com', 'Burhan@1234');
    await page.waitForURL('**/dashboard');

    await page.click('aside >> text="Settings"');
    await page.click('button[aria-label="Settings tab Parental Controls"]');

    // Wait for data to load
    await page.waitForTimeout(1000);

    const cancelBtn = page.locator('button:has-text("Cancel Invitation")');
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await page.waitForSelector('text=Cancel Invitation');
      await page.click('button:has-text("Confirm")');
      await page.waitForSelector('text=Invitation cancelled.');
    }

    const isLinked = await page.locator('text=Active Parent Link').isVisible();
    if (isLinked) {
      // Logout Teen and log in as Parent to unlink
      await page.click('text=Logout');
      await page.waitForURL('**/login');

      await loginUser(page, 'burhan.parent1@gmail.com', 'Burhan@1234');
      await page.waitForURL('**/parent/dashboard');

      await page.click('text=View Full Profile & Cards');
      await expect(page).toHaveURL(/.*parent\/child.*/);

      await page.click('button:has-text("Unlink Account")');
      await page.waitForSelector('text=Unlink Account');
      await page.click('button:has-text("Confirm")');

      // Logout Parent
      await page.waitForURL('**/parent/dashboard');
      await page.click('text=Logout');
      await page.waitForURL('**/login');

      // Log back in as Teen
      await loginUser(page, 'burhan.test1@gmail.com', 'Burhan@1234');
      await page.waitForURL('**/dashboard');
      await page.click('aside >> text="Settings"');
      await page.click('button[aria-label="Settings tab Parental Controls"]');
      await page.waitForTimeout(1000);
    }

    // 2. Teen sends new invitation
    await expect(page.locator('text=Invite Parent')).toBeVisible();

    // Fill invitation form
    await page.fill('#parentEmail', 'burhan.parent1@gmail.com');
    await page.selectOption('#parentRelationship', 'FATHER');

    // Prepare to intercept the token from invite-parent endpoint
    const invitePromise = page.waitForResponse(
      response => response.url().includes('/parental/teen/invite-parent') && response.status() === 200
    );

    // Send invitation
    await page.click('button:has-text("Send Invitation Email")');

    // Wait for the endpoint response and extract token
    const inviteResponse = await invitePromise;
    const inviteJson = await inviteResponse.json();
    const token = inviteJson.data.token;
    expect(token).toBeDefined();

    // Logout Teen
    await page.click('text=Logout');
    await page.waitForURL('**/login');

    // 3. Accept parental invitation (acts as parent setup)
    await page.goto(`${BASE_URL}/accept-invitation?token=${token}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('text=Accept Parent Invitation');

    // Fill Acceptance Form
    await page.fill('#fullName', 'Burhan Parent');
    await page.fill('#phone', '+919999988888');
    await page.fill('#dateOfBirth', '1985-01-01');
    await page.fill('#password', 'Burhan@1234');
    await page.fill('#confirmPassword', 'Burhan@1234');

    // Submit accept invitation
    await page.click('button:has-text("Link accounts & Sign in")');

    // Verifies redirecting automatically to Parent Dashboard
    await page.waitForURL('**/parent/dashboard');
    await expect(page.locator('text=burhan.test1@gmail.com')).toBeVisible();

    // Logout Parent
    await page.click('text=Logout');
    await page.waitForURL('**/login');

    // 4. Teen requests approval for a transaction
    await loginUser(page, 'burhan.test1@gmail.com', 'Burhan@1234');
    await page.waitForURL('**/dashboard');

    // Go to Settings -> Parental tab
    await page.click('aside >> text="Settings"');
    await page.click('button[aria-label="Settings tab Parental Controls"]');

    // Request Approval Form
    await page.selectOption('#reqType', 'SPEND');
    await page.fill('#reqAmount', '500');
    await page.fill('#reqMerchant', 'Steam Games');
    await page.selectOption('#reqCategory', 'GAMING');
    const uniqueDescription = `E2E school project subscription ${Math.floor(Math.random() * 1000000)}`;
    await page.fill('#reqDescription', uniqueDescription);

    // Submit approval request
    await page.click('button:has-text("Submit Approval Request")');
    await page.waitForSelector('text=Approval request submitted to parent.');

    // Logout Teen
    await page.click('text=Logout');
    await page.waitForURL('**/login');

    // 5. Parent approves the request in Approvals Queue
    await loginUser(page, 'burhan.parent1@gmail.com', 'Burhan@1234');
    await page.waitForURL('**/parent/dashboard');

    // Go to Approvals Queue
    await page.click('text=Approvals Queue');
    await page.waitForURL('**/parent/approvals');

    // Find the request and approve
    const pendingRequest = page.locator('.glass-card').filter({ hasText: uniqueDescription }).filter({ hasText: 'Approve' });
    await expect(pendingRequest).toBeVisible();

    // Click Approve & Execute
    await pendingRequest.locator('button:has-text("Approve")').click();

    // Verify it disappears from pending list
    await expect(pendingRequest).toBeHidden({ timeout: 5000 });

    // Logout Parent
    await page.click('text=Logout');
    await page.waitForURL('**/login');
  });
});
