import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ApprovalQueue from '../ApprovalQueue';
import { parentalApi } from '../../../api/endpoints';

// Mock parentalApi
vi.mock('../../../api/endpoints', () => ({
  parentalApi: {
    getPendingApprovals: vi.fn(),
    getParentApprovalHistory: vi.fn(),
    decideApproval: vi.fn(),
  },
}));

describe('ApprovalQueue Component', () => {
  const mockPending = [
    {
      id: 'app-1',
      childName: 'Alex Doe',
      requestType: 'SPEND',
      amount: 1500,
      category: 'ELECTRONICS',
      merchant: 'Amazon',
      description: 'Wireless Headphones',
      status: 'PENDING',
      createdAt: '2026-09-13T10:00:00Z',
    },
    {
      id: 'app-2',
      childName: 'Sam Doe',
      requestType: 'CARD_FREEZE',
      category: 'GENERAL',
      merchant: '',
      description: 'Freeze misplaced card',
      status: 'PENDING',
      createdAt: '2026-09-13T11:00:00Z',
    },
  ];

  const mockHistory = [
    {
      id: 'app-3',
      childName: 'Alex Doe',
      requestType: 'SPEND',
      amount: 450,
      category: 'FOOD',
      merchant: 'Subway',
      description: 'Lunch with friends',
      status: 'APPROVED',
      parentNote: 'Approved. Enjoy!',
      createdAt: '2026-09-12T12:00:00Z',
      decidedAt: '2026-09-12T12:15:00Z',
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
  });

  it('renders pending requests correctly with teen name and amounts', async () => {
    render(<ApprovalQueue />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Parent Approval Center')).toBeInTheDocument();
    });

    expect(screen.getByText('Pending Requests (2)')).toBeInTheDocument();
    expect(screen.getByText('Alex Doe')).toBeInTheDocument();
    expect(screen.getByText('Wireless Headphones')).toBeInTheDocument();
    expect(screen.getByText('₹1,500')).toBeInTheDocument();
    expect(screen.getByText('Sam Doe')).toBeInTheDocument();
    expect(screen.getByText('Freeze misplaced card')).toBeInTheDocument();
  });

  it('filters pending requests based on search input', async () => {
    render(<ApprovalQueue />);

    await waitFor(() => {
      expect(screen.getByText('Alex Doe')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search by teen, merchant...');
    fireEvent.change(searchInput, { target: { value: 'Sam' } });

    expect(screen.queryByText('Alex Doe')).not.toBeInTheDocument();
    expect(screen.getByText('Sam Doe')).toBeInTheDocument();
  });

  it('switches to Resolution History tab', async () => {
    render(<ApprovalQueue />);

    await waitFor(() => {
      expect(screen.getByText('Resolution History (1)')).toBeInTheDocument();
    });

    const historyTab = screen.getByText('Resolution History (1)');
    fireEvent.click(historyTab);

    expect(screen.getByText('Lunch with friends')).toBeInTheDocument();
    expect(screen.getByText('Note: "Approved. Enjoy!"')).toBeInTheDocument();
  });

  it('approves a request when clicking Approve & Execute', async () => {
    render(<ApprovalQueue />);

    await waitFor(() => {
      expect(screen.getByText('Alex Doe')).toBeInTheDocument();
    });

    const approveButtons = screen.getAllByText('Approve & Execute');
    fireEvent.click(approveButtons[0]);

    await waitFor(() => {
      expect(parentalApi.decideApproval).toHaveBeenCalledWith(
        'app-1',
        expect.objectContaining({ decision: 'APPROVED' })
      );
    });
  });

  it('rejects a request when clicking Reject', async () => {
    render(<ApprovalQueue />);

    await waitFor(() => {
      expect(screen.getByText('Alex Doe')).toBeInTheDocument();
    });

    const rejectButtons = screen.getAllByText('Reject');
    fireEvent.click(rejectButtons[0]);

    await waitFor(() => {
      expect(parentalApi.decideApproval).toHaveBeenCalledWith(
        'app-1',
        expect.objectContaining({ decision: 'REJECTED' })
      );
    });
  });

  it('refreshes queue when fst:approval_request event fires', async () => {
    render(<ApprovalQueue />);

    await waitFor(() => {
      expect(parentalApi.getPendingApprovals).toHaveBeenCalledTimes(1);
    });

    // Dispatch SSE event
    window.dispatchEvent(new CustomEvent('fst:approval_request', { detail: {} }));

    await waitFor(() => {
      expect(parentalApi.getPendingApprovals).toHaveBeenCalledTimes(2);
    });
  });
});
