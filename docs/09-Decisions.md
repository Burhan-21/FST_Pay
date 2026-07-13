# FST Pay — Architecture Decision Records (ADRs)

## ADR-001: Email Provider — Resend

**Date**: 2026-07-02
**Status**: Accepted

### Context
FST Pay needs transactional email for OTP, verification, reports, and notifications.

### Decision
- **Production**: Resend (HTTP API, no SMTP dependency)
- **Development**: Mailtrap (via SMTP)
- **Abstraction**: `EmailProvider` interface with `ResendEmailProvider` and `SmtpEmailProvider`

### Rationale
- Resend has a generous free tier (100 emails/day)
- HTTP API is simpler than SMTP configuration
- Easy migration to Amazon SES later (just add a new `EmailProvider` impl)

---

## ADR-002: Parent-Teen Linking — Email Invitation

**Date**: 2026-07-02
**Status**: Accepted

### Context
Parents need to link to teen accounts for spending visibility and controls.

### Decision
Email invitation + verification flow.

### Flow
1. Teen creates account
2. Teen enters parent's email
3. Invitation email sent to parent
4. Parent clicks link → creates/signs in to account
5. Relationship established in `parent_child_links` table

### Rationale
- More secure than invite codes
- Familiar user experience
- Easy to revoke or relink
- Scales well for family accounts

---

## ADR-003: Brand Color — Dark Navy

**Date**: 2026-07-02
**Status**: Accepted

### Decision
Dark brand color: `#0E1726` (navy), not `#087726` (green).

### Rationale
- Navy conveys trust, security, and professionalism
- Consistent with blue/navy palette across logo and UI
- `#087726` is a dark green — doesn't match fintech branding

---

## ADR-004: Role System — USER / PARENT / ADMIN

**Date**: 2026-07-02
**Status**: Accepted

### Decision
Three roles stored as string in `users.role` column:
- `USER` — default, all standard features
- `PARENT` — parental controls, spending visibility, allowance management
- `ADMIN` — full admin panel access

### Notes
- A teen is a `USER` with a parent link (not a separate role)
- Role is included in JWT claims
- Spring Security enforces role-based access via `hasRole()` / `hasAnyRole()`
