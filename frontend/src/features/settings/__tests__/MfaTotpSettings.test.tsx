import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SettingsPage from '../SettingsPage';
import { totpApi } from '../../../api/endpoints';

vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 'user-1',
      email: 'alex@fstpay.com',
      fullName: 'Alex Teen',
      role: 'USER',
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
    },
    refreshProfile: vi.fn(),
  }),
}));

vi.mock('../../../api/endpoints', () => ({
  userApi: {
    getProfile: vi.fn().mockResolvedValue({ data: { data: {} } }),
    updateProfile: vi.fn().mockResolvedValue({ data: { data: {} } }),
    changePassword: vi.fn().mockResolvedValue({ data: { data: {} } }),
  },
  parentalApi: {
    getInvitationStatus: vi.fn().mockResolvedValue({ data: { data: null } }),
    getTeenApprovalHistory: vi.fn().mockResolvedValue({ data: { data: [] } }),
    inviteParent: vi.fn().mockResolvedValue({ data: { data: {} } }),
    cancelInvitation: vi.fn().mockResolvedValue({ data: { data: {} } }),
    requestApproval: vi.fn().mockResolvedValue({ data: { data: {} } }),
  },
  totpApi: {
    getStatus: vi.fn(),
    setup: vi.fn(),
    enable: vi.fn(),
    disable: vi.fn(),
    regenerateBackupCodes: vi.fn(),
  },
}));

describe('SettingsPage - MFA TOTP Two-Factor Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Security tab and shows TOTP as Not Enabled initially', async () => {
    vi.mocked(totpApi.getStatus).mockResolvedValueOnce({
      data: { data: { totpEnabled: false, backupCodesRemaining: 0 } },
    } as any);

    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    // Switch to Security tab
    const securityTab = screen.getByRole('button', { name: /Security/i });
    fireEvent.click(securityTab);

    expect(await screen.findByText('Authenticator App (TOTP)')).toBeInTheDocument();
    expect(screen.getByText('Not Enabled')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Enable 2FA/i })).toBeInTheDocument();
  });

  it('opens 2FA setup modal with QR code, secret, and backup codes', async () => {
    vi.mocked(totpApi.getStatus).mockResolvedValueOnce({
      data: { data: { totpEnabled: false, backupCodesRemaining: 0 } },
    } as any);

    vi.mocked(totpApi.setup).mockResolvedValueOnce({
      data: {
        data: {
          secret: 'JBSWY3DPEHPK3PXP',
          otpauthUrl: 'otpauth://totp/FST%20Pay:alex@fstpay.com?secret=JBSWY3DPEHPK3PXP',
          qrCodeDataUri: 'data:image/png;base64,mockqr',
          backupCodes: ['8F4A-9K2C', '7B2N-4X9L', '3D1M-8P5Q', '6C9W-2R4T'],
        },
      },
    } as any);

    vi.mocked(totpApi.enable).mockResolvedValueOnce({
      data: {
        data: {
          totpEnabled: true,
          backupCodesRemaining: 4,
        },
      },
    } as any);

    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Security/i }));

    const enableBtn = await screen.findByRole('button', { name: /Enable 2FA/i });
    fireEvent.click(enableBtn);

    expect(await screen.findByText('Set Up Authenticator App 2FA')).toBeInTheDocument();
    expect(screen.getByText('JBSWY3DPEHPK3PXP')).toBeInTheDocument();
    expect(screen.getByText('8F4A-9K2C')).toBeInTheDocument();

    // Type 6-digit confirmation code
    const input = screen.getByLabelText(/Enter 6-Digit Authenticator Code/i);
    fireEvent.change(input, { target: { value: '123456' } });

    const activateBtn = screen.getByRole('button', { name: /Activate 2FA/i });
    fireEvent.click(activateBtn);

    await waitFor(() => {
      expect(totpApi.enable).toHaveBeenCalledWith({
        secret: 'JBSWY3DPEHPK3PXP',
        code: '123456',
        backupCodes: ['8F4A-9K2C', '7B2N-4X9L', '3D1M-8P5Q', '6C9W-2R4T'],
      });
    });
  });

  it('renders Active TOTP state with remaining backup codes and actions', async () => {
    vi.mocked(totpApi.getStatus).mockResolvedValueOnce({
      data: { data: { totpEnabled: true, backupCodesRemaining: 8 } },
    } as any);

    render(
      <MemoryRouter>
        <SettingsPage />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByRole('button', { name: /Security/i }));

    expect(await screen.findByText('Authenticator App (TOTP)')).toBeInTheDocument();
    expect(screen.getByText('Enabled')).toBeInTheDocument();
    expect(screen.getByText(/8 of 8/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Backup Codes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Disable/i })).toBeInTheDocument();
  });
});
