import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SettlementBadge } from '../SettlementBadge';

describe('SettlementBadge Component', () => {
  it('renders Settled status with emerald styling', () => {
    render(<SettlementBadge status="SETTLED" />);
    const badge = screen.getByRole('status');
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain('Settled');
  });

  it('renders Pending status with warning indicator', () => {
    render(<SettlementBadge status="PENDING" />);
    const badge = screen.getByRole('status');
    expect(badge).toBeDefined();
    expect(badge.textContent).toContain('Pending');
  });

  it('renders Failed status correctly', () => {
    render(<SettlementBadge status="FAILED" />);
    const badge = screen.getByRole('status');
    expect(badge.textContent).toContain('Failed');
  });

  it('renders Disputed status correctly', () => {
    render(<SettlementBadge status="DISPUTED" />);
    const badge = screen.getByRole('status');
    expect(badge.textContent).toContain('Disputed');
  });
});
