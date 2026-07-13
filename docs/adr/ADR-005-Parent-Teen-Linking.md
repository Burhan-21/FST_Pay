# ADR-005: Parent-Teen Linking & KYC Deferral

## Status
Accepted

## Date
2026-07-07

## Context
FST Pay's primary differentiator is the parent-teen relationship, allowing parents to link their children, configure spending limits, view activities, and approve/reject transaction requests. Real financial platforms require stringent Aadhaar/PAN KYC before accounts are linked.

## Problem
How should the link between parent and child be established, and how do we handle KYC requirements during the MVP phase?

## Decision
We implemented an **Email Invitation Token Flow** and **deferred official KYC verification**:
- Teenagers invite their parents by email. The system generates a secure, time-limited token linked to the relationship record.
- The parent receives the invitation, clicks the link, accepts, and sets up a wallet.
- Official KYC inputs (Aadhaar, PAN) are deferred for the MVP. Accounts are linked immediately upon accepting the invitation.
- Pre-allocated limits and rules are activated immediately after the parent completes registration.

## Alternatives Considered
- **Mandatory KYC on Signup:** Rejected because it introduces major integration friction with third-party verification APIs, increases development overhead, and is not required for testing MVP product value.

## Consequences
- Frictionless registration for college demo and investor testing.
- Faster development cycle focused on core business value.
- Clear separation between user linking and identity verification domains.

## Trade-offs
- A deferred KYC model cannot be deployed in production under Indian Fintech laws without integrating actual Aadhaar/PAN validation.

## Future Considerations
- Integrate a sandboxed third-party KYC service (like Digilocker or HyperVerge) in Phase 5 before mainnet launch.
