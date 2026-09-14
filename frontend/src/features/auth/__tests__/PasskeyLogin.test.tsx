import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../Login';
import { authApi } from '../../../api/endpoints';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ state: null }),
  };
});

let mockUser: any = null;
const mockLogin = vi.fn();
const mockLoginWithPasskey = vi.fn();
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
    loginWithPasskey: mockLoginWithPasskey,
    user: mockUser,
    isAuthenticated: !!mockUser,
    loading: false,
  }),
}));

vi.mock('../../../hooks/useTheme', () => ({
  useTheme: () => ({
    theme: 'dark',
    toggleTheme: vi.fn(),
  }),
}));

vi.mock('../../../api/endpoints', () => ({
  authApi: {
    getStats: vi.fn().mockResolvedValue({ data: { data: { activeUsers: 100, transactionsToday: 500 } } }),
    getWebAuthnLoginOptions: vi.fn(),
    verifyWebAuthnLogin: vi.fn(),
  },
}));

describe('Login - Biometric Passkey WebAuthn Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
  });

  it('renders "Sign in with Passkey" button prominently', () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(screen.getByRole('button', { name: /Sign in with Passkey/i })).toBeInTheDocument();
  });

  it('displays error if WebAuthn is not supported by browser', async () => {
    const originalPKC = (window as any).PublicKeyCredential;
    delete (window as any).PublicKeyCredential;

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const passkeyBtn = screen.getByRole('button', { name: /Sign in with Passkey/i });
    fireEvent.click(passkeyBtn);

    await waitFor(() => {
      expect(screen.getByText(/WebAuthn Passkeys are not supported/i)).toBeInTheDocument();
    });

    (window as any).PublicKeyCredential = originalPKC;
  });

  it('performs biometric assertion ceremony on passkey button click', async () => {
    (window as any).PublicKeyCredential = class {};

    const challengeBase64 = 'dGVzdC1jaGFsbGVuZ2U';
    vi.mocked(authApi.getWebAuthnLoginOptions).mockResolvedValueOnce({
      data: {
        data: {
          challenge: challengeBase64,
          timeout: 60000,
          rpId: 'localhost',
          userVerification: 'preferred',
        },
      },
    } as any);

    const mockCred = {
      id: 'cred-mock-id',
      rawId: new Uint8Array([1, 2, 3]).buffer,
      response: {
        clientDataJSON: new TextEncoder().encode(JSON.stringify({ challenge: challengeBase64, type: 'webauthn.get' })).buffer,
        authenticatorData: new Uint8Array([4, 5, 6]).buffer,
        signature: new Uint8Array([7, 8, 9]).buffer,
      },
    };

    Object.defineProperty(navigator, 'credentials', {
      value: {
        get: vi.fn().mockResolvedValue(mockCred),
      },
      configurable: true,
    });

    mockLoginWithPasskey.mockResolvedValueOnce(undefined);

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const passkeyBtn = screen.getByRole('button', { name: /Sign in with Passkey/i });
    fireEvent.click(passkeyBtn);

    await waitFor(() => {
      expect(authApi.getWebAuthnLoginOptions).toHaveBeenCalled();
      expect(navigator.credentials.get).toHaveBeenCalled();
      expect(mockLoginWithPasskey).toHaveBeenCalledWith(
        expect.objectContaining({
          credentialId: 'cred-mock-id',
        })
      );
    });
  });

  it('redirects to dashboard when user is logged in', () => {
    mockUser = { id: 'u1', email: 'test@fstpay.com', role: 'USER' };

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
  });

  it('displays error banner if biometric verification is cancelled or fails', async () => {
    (window as any).PublicKeyCredential = class {};

    vi.mocked(authApi.getWebAuthnLoginOptions).mockResolvedValueOnce({
      data: {
        data: {
          challenge: 'test-challenge',
          timeout: 60000,
        },
      },
    } as any);

    Object.defineProperty(navigator, 'credentials', {
      value: {
        get: vi.fn().mockRejectedValue(new Error('User cancelled biometric verification.')),
      },
      configurable: true,
    });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    const passkeyBtn = screen.getByRole('button', { name: /Sign in with Passkey/i });
    fireEvent.click(passkeyBtn);

    await waitFor(() => {
      expect(screen.getByText(/User cancelled biometric verification/i)).toBeInTheDocument();
    });
  });
});
