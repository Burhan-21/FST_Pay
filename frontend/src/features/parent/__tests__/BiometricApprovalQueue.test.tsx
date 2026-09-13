import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ApprovalQueue from '../ApprovalQueue';
import { parentalApi, webauthnApi } from '../../../api/endpoints';
import * as webauthnUtil from '../../../utils/webauthn';
import type { TransactionApproval, WebAuthnCredential } from '../../../types';

// Mock APIs
vi.mock('../../../api/endpoints', () => ({
  parentalApi: {
    getPendingApprovals: vi.fn(),
    getParentApprovalHistory: vi.fn(),
    decideApproval: vi.fn(),
  },
  webauthnApi: {
    getRegisterOptions: vi.fn(),
    verifyRegistration: vi.fn(),
    getCredentials: vi.fn(),
    deleteCredential: vi.fn(),
    getApprovalChallenge: vi.fn(),
  },
}));

describe('ApprovalQueue Biometric & WebAuthn Co-Signing', () => {
  const mockPending: TransactionApproval[] = [
    {
      id: 'app-high-value',
      childName: 'Alex Doe',
      requestType: 'SPEND',
      amount: 4500,
      category: 'GAMING',
      merchant: 'PlayStation Store',
      description: 'Annual Gaming Subscription',
      status: 'PENDING',
      createdAt: '2026-09-13T10:00:00Z',
    },
  ];

  const mockHistory: TransactionApproval[] = [
    {
      id: 'app-signed-1',
      childName: 'Alex Doe',
      requestType: 'SPEND',
      amount: 3200,
      category: 'ELECTRONICS',
      merchant: 'Apple Store',
      description: 'Charger & Cable',
      status: 'APPROVED',
      parentNote: 'Co-signed via Touch ID',
      biometricVerified: true,
      biometricAuthMethod: 'WEBAUTHN_PASSKEY',
      biometricCredentialId: 'cred-touchid-001',
      biometricVerifiedAt: '2026-09-13T09:00:00Z',
      createdAt: '2026-09-13T08:50:00Z',
      decidedAt: '2026-09-13T09:00:00Z',
    },
  ];

  const mockCredentials: WebAuthnCredential[] = [
    {
      id: 'cred-db-1',
      credentialId: 'cred-touchid-001',
      algorithm: 'ES256',
      deviceName: 'MacBook Touch ID',
      signCount: 12,
      createdAt: '2026-09-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(parentalApi.getPendingApprovals).mockResolvedValue({
      data: { success: true, data: mockPending },
    } as never);
    vi.mocked(parentalApi.getParentApprovalHistory).mockResolvedValue({
      data: { success: true, data: mockHistory },
    } as never);
    vi.mocked(parentalApi.decideApproval).mockResolvedValue({
      data: { success: true, data: {} },
    } as never);
    vi.mocked(webauthnApi.getCredentials).mockResolvedValue({
      data: { success: true, data: mockCredentials },
    } as never);
  });

  it('renders Guardian Biometric Protection banner with enrolled passkey details', async () => {
    render(<ApprovalQueue />);

    await waitFor(() => {
      expect(screen.getByTestId('guardian-passkey-banner')).toBeInTheDocument();
      expect(screen.getByText('Guardian Biometric Protection')).toBeInTheDocument();
      expect(screen.getByText(/Passkey Enrolled \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/MacBook Touch ID/i)).toBeInTheDocument();
    });
  });

  it('renders Biometric Co-Sign button when passkey is enrolled and initiates assertion', async () => {
    vi.spyOn(webauthnUtil, 'isWebAuthnSupported').mockReturnValue(true);
    vi.spyOn(webauthnUtil, 'getPasskeyAssertion').mockResolvedValue({
      credentialId: 'cred-touchid-001',
      clientDataJSON: 'mock-client-data',
      authenticatorData: 'mock-auth-data',
      signature: 'mock-passkey-sig-xyz',
    });
    vi.mocked(webauthnApi.getApprovalChallenge).mockResolvedValue({
      data: {
        success: true,
        data: {
          challenge: 'random-challenge-123',
          rpId: 'localhost',
          allowCredentials: [{ id: 'cred-touchid-001', type: 'public-key' }],
        },
      },
    } as never);

    render(<ApprovalQueue />);

    await waitFor(() => {
      expect(screen.getByTestId('biometric-cosign-btn')).toBeInTheDocument();
      expect(screen.getByText('Biometric Co-Sign')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('biometric-cosign-btn'));

    await waitFor(() => {
      expect(webauthnApi.getApprovalChallenge).toHaveBeenCalledWith('app-high-value');
      expect(parentalApi.decideApproval).toHaveBeenCalledWith(
        'app-high-value',
        expect.objectContaining({
          decision: 'APPROVED',
          biometricCredentialId: 'cred-touchid-001',
          signature: 'mock-passkey-sig-xyz',
        })
      );
    });
  });

  it('displays Co-Signed via Passkey badge in history tab for biometrically verified items', async () => {
    render(<ApprovalQueue />);

    await waitFor(() => {
      expect(screen.getByText(/Resolution History/i)).toBeInTheDocument();
    });

    const historyTabBtn = screen.getByRole('button', { name: /resolution history/i });
    fireEvent.click(historyTabBtn);

    await waitFor(() => {
      expect(screen.getByText(/Co-Signed via Passkey/i)).toBeInTheDocument();
      expect(screen.getByText('Apple Store')).toBeInTheDocument();
    });
  });

  it('opens passkey enrollment modal and completes device enrollment', async () => {
    vi.mocked(webauthnApi.getCredentials).mockResolvedValue({
      data: { success: true, data: [] },
    } as never);
    vi.mocked(webauthnApi.getRegisterOptions).mockResolvedValue({
      data: {
        success: true,
        data: {
          challenge: 'reg-chal-456',
          rp: { name: 'FST Pay', id: 'localhost' },
          user: { id: 'user-id-bytes', name: 'parent@example.com', displayName: 'John' },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
        },
      },
    } as never);
    vi.spyOn(webauthnUtil, 'createPasskeyCredential').mockResolvedValue({
      credentialId: 'new-passkey-999',
      publicKey: 'pubkey-abc',
      rawId: 'raw-id-abc',
      clientDataJSON: 'client-data-abc',
      attestationObject: 'attestation-abc',
      deviceName: 'Windows Hello',
      algorithm: 'ES256',
    });
    vi.mocked(webauthnApi.verifyRegistration).mockResolvedValue({
      data: { success: true, data: {} },
    } as never);

    render(<ApprovalQueue />);

    await waitFor(() => {
      expect(screen.getByText('Enroll Biometric Passkey')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Enroll Biometric Passkey'));

    await waitFor(() => {
      expect(screen.getByTestId('enroll-passkey-modal')).toBeInTheDocument();
    });

    const nameInput = screen.getByLabelText(/authenticator nickname/i);
    fireEvent.change(nameInput, { target: { value: 'Windows Hello' } });

    const enrollBtn = screen.getByRole('button', { name: /enroll this device/i });
    fireEvent.click(enrollBtn);

    await waitFor(() => {
      expect(webauthnApi.getRegisterOptions).toHaveBeenCalledTimes(1);
      expect(webauthnApi.verifyRegistration).toHaveBeenCalledWith(
        expect.objectContaining({
          credentialId: 'new-passkey-999',
        })
      );
    });
  });
});
