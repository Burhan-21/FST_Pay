import { test, expect } from '@playwright/test';

const BACKEND_URL = 'http://localhost:8080';

test.describe('API Smoke Suite', () => {
  // Test Actuator Health
  test('GET /actuator/health should return UP status', async ({ request }) => {
    const response = await request.get(`${BACKEND_URL}/actuator/health`);
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe('UP');
  });

  // Test Bad Login
  test('POST /api/v1/auth/login with invalid credentials should return 400', async ({ request }) => {
    const response = await request.post(`${BACKEND_URL}/api/v1/auth/login`, {
      data: {
        email: 'nonexistent@example.com',
        password: 'WrongPassword123',
        recaptchaToken: 'dummy-token',
      },
    });
    expect(response.status()).toBe(400);
  });

  // Test Happy Path Auth & Accessing Protected APIs
  test('Complete login flow & fetch wallet / cards / rewards / analytics APIs', async ({ request }) => {
    // 1. Initiate Login
    const loginResponse = await request.post(`${BACKEND_URL}/api/v1/auth/login`, {
      data: {
        email: 'burhan.test1@gmail.com',
        password: 'Burhan@1234',
        recaptchaToken: 'dummy-token',
      },
    });
    expect(loginResponse.status()).toBe(200);
    const loginBody = await loginResponse.json();
    expect(loginBody.success).toBe(true);
    expect(loginBody.data.requiresOtp).toBe(true);

    // 2. Verify OTP
    const verifyResponse = await request.post(`${BACKEND_URL}/api/v1/auth/verify-otp`, {
      data: {
        email: 'burhan.test1@gmail.com',
        otp: '123456',
      },
    });
    expect(verifyResponse.status()).toBe(200);
    const verifyBody = await verifyResponse.json();
    expect(verifyBody.success).toBe(true);
    expect(verifyBody.data.accessToken).toBeDefined();

    const token = verifyBody.data.accessToken;
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    // 3. Test GET /api/v1/wallet
    const walletResponse = await request.get(`${BACKEND_URL}/api/v1/wallet`, { headers });
    expect(walletResponse.status()).toBe(200);
    const walletBody = await walletResponse.json();
    expect(walletBody.success).toBe(true);
    expect(walletBody.data.balance).toBeDefined();

    // 4. Test GET /api/v1/cards
    const cardsResponse = await request.get(`${BACKEND_URL}/api/v1/cards`, { headers });
    expect(cardsResponse.status()).toBe(200);
    const cardsBody = await cardsResponse.json();
    expect(cardsBody.success).toBe(true);
    expect(Array.isArray(cardsBody.data)).toBe(true);

    // 5. Test GET /api/v1/rewards/status
    const rewardsResponse = await request.get(`${BACKEND_URL}/api/v1/rewards/status`, { headers });
    expect(rewardsResponse.status()).toBe(200);
    const rewardsBody = await rewardsResponse.json();
    expect(rewardsBody.xp).toBeDefined();

    // 6. Test GET /api/v1/analytics
    const analyticsResponse = await request.get(`${BACKEND_URL}/api/v1/analytics`, { headers });
    expect(analyticsResponse.status()).toBe(200);
    const analyticsBody = await analyticsResponse.json();
    expect(analyticsBody.success).toBe(true);
  });

  // Test Parent Approval APIs
  test('Parent login and fetch dashboard / approvals / notifications', async ({ request }) => {
    // 1. Parent Login
    const loginResponse = await request.post(`${BACKEND_URL}/api/v1/auth/login`, {
      data: {
        email: 'burhan.parent1@gmail.com',
        password: 'Burhan@1234',
        recaptchaToken: 'dummy-token',
      },
    });
    expect(loginResponse.status()).toBe(200);

    // 2. Parent Verify OTP
    const verifyResponse = await request.post(`${BACKEND_URL}/api/v1/auth/verify-otp`, {
      data: {
        email: 'burhan.parent1@gmail.com',
        otp: '123456',
      },
    });
    expect(verifyResponse.status()).toBe(200);
    const verifyBody = await verifyResponse.json();
    const token = verifyBody.data.accessToken;
    const headers = {
      Authorization: `Bearer ${token}`,
    };

    // 3. GET /api/v1/parental/dashboard
    const dashboardResponse = await request.get(`${BACKEND_URL}/api/v1/parental/dashboard`, { headers });
    if (dashboardResponse.status() !== 200) {
      console.error("Dashboard error body:", await dashboardResponse.text());
    }
    expect(dashboardResponse.status()).toBe(200);
    const dashboardBody = await dashboardResponse.json();
    expect(dashboardBody.success).toBe(true);

    // 4. GET /api/v1/parental/approvals
    const approvalsResponse = await request.get(`${BACKEND_URL}/api/v1/parental/approvals`, { headers });
    expect(approvalsResponse.status()).toBe(200);
    const approvalsBody = await approvalsResponse.json();
    expect(approvalsBody.success).toBe(true);

    // 5. GET /api/v1/parental/notifications
    const notifResponse = await request.get(`${BACKEND_URL}/api/v1/parental/notifications`, { headers });
    expect(notifResponse.status()).toBe(200);
    const notifBody = await notifResponse.json();
    expect(notifBody.success).toBe(true);
  });
});
