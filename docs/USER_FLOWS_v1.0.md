# FST Pay — User Flows & Journeys v1.0

**Document ID:** FST-FLOWS-2026-Q2  
**Version:** 1.0  
**Date:** June 17, 2026  
**Owner:** Product Management

---

## OVERVIEW

User flows map the step-by-step journey through FST Pay features. Each flow shows:
- **Happy Path:** Ideal scenario, all steps succeed
- **Alternative Paths:** Edge cases, errors
- **Decision Points:** Where user makes choices
- **Validation Rules:** What must be true at each step

---

## 🚀 FLOW 1: COMPLETE SIGNUP

### Happy Path

```
START: App opened first time
   ↓
[No Account?]
   ↓
"Sign Up" button clicked
   ↓
SCREEN: Signup Form
 - Enter email: smburhan.personal@gmail.com
 - Enter password: Burhan@1234 (8+ chars, 1 upper, 1 lower, 1 num, 1 special)
 - Enter full name: Burhan Test
 - Enter DOB: 01/15/1990 (must be 13+ years old)
 - Check reCAPTCHA: ✓
   ↓
[VALIDATE]
 - Email format valid? ✓
 - Password strength? ✓
 - Age >= 13? ✓
 - CAPTCHA passed? ✓
 - Email not already registered? ✓
   ↓
Backend: Create user (status = PENDING_VERIFICATION)
Backend: Generate OTP, send to email
   ↓
SCREEN: Email Verification
 - Message: "Verification link sent to smburhan.personal@gmail.com"
 - 6-digit OTP input field
 - "Resend OTP" button
 - 10-minute countdown timer
   ↓
User enters OTP: 123456
   ↓
[VALIDATE]
 - OTP matches? ✓
 - OTP not expired? ✓
   ↓
Backend: Update user (status = ACTIVE)
Backend: Create wallet
Backend: Create card
Backend: Send welcome email
   ↓
SCREEN: Signup Success
 - Message: "Welcome to FST Pay! 🎉"
 - "Go to Dashboard" button
   ↓
SCREEN: Dashboard (auto-login)
   ↓
END: User ready to use app
```

### Alternative Path 1: Wrong Password Format

```
Signup Form filled with weak password: "short"
   ↓
[VALIDATE]
 - Password strength? ✗ (too short)
   ↓
Error: "Password must be at least 8 characters"
Highlight password field in red
   ↓
User corrects to: "Burhan@1234"
   ↓
[VALIDATE] ✓
   → Continue with happy path
```

### Alternative Path 2: Invalid Age

```
DOB entered: 01/15/2020 (6 years old)
   ↓
[VALIDATE]
 - Age >= 13? ✗
   ↓
Error: "You must be at least 12 years old to use FST Pay"
Disable "Sign Up" button
   ↓
User corrects to: 01/15/2010 (14 years old)
   ↓
[VALIDATE] ✓
   → Continue with happy path
```

### Alternative Path 3: Email Already Exists

```
Email entered: smburhan.personal@gmail.com (already registered)
   ↓
[VALIDATE]
 - Email not already registered? ✗
   ↓
Error: "This email is already registered. Try Login instead"
Offer "Login" or "Use Different Email"
   ↓
User clicks "Login"
   → Go to LOGIN FLOW
```

### Alternative Path 4: OTP Expired

```
User receives OTP: 123456
User waits 11 minutes
User enters OTP: 123456
   ↓
[VALIDATE]
 - OTP expired? ✗ (>10 minutes)
   ↓
Error: "OTP has expired. Request new OTP"
"Resend OTP" button active
   ↓
User clicks "Resend OTP"
   ↓
Backend: Generate new OTP, send email, reset timer
   ↓
User enters new OTP
   → Continue with happy path
```

---

## 🔐 FLOW 2: COMPLETE LOGIN

### Happy Path

```
START: App opened, not logged in
   ↓
SCREEN: Login Form
 - Email field (empty)
 - Password field (empty)
 - reCAPTCHA checkbox
 - "Login" button (disabled)
   ↓
User enters: email = smburhan.personal@gmail.com
User enters: password = Burhan@1234
   ↓
[CLIENT VALIDATION]
 - Email format valid? ✓
 - Password entered? ✓
   ↓
"Login" button enabled
   ↓
User checks reCAPTCHA ✓
   ↓
[VALIDATE]
 - CAPTCHA passed? ✓
   ↓
"Login" button enabled
   ↓
User clicks "Login"
   ↓
[BACKEND VALIDATION]
 - Email exists? ✓
 - Account locked? ✗ (not locked)
 - Password matches? ✓
 - Account active? ✓
   ↓
Backend: Reset failed login attempts to 0
Backend: Generate OTP, send to email
Backend: Start session (temporary)
   ↓
SCREEN: OTP Verification
 - Message: "OTP sent to smburhan.personal@gmail.com"
 - 6-digit OTP input
 - "Resend OTP" button
 - 10-minute countdown
   ↓
User enters OTP: 654321
   ↓
[VALIDATE]
 - OTP matches? ✓
 - OTP not expired? ✓
   ↓
Backend: Create JWT tokens
 - accessToken (24 hours)
 - refreshToken (7 days)
Backend: Store in localStorage
   ↓
SCREEN: Dashboard (auto-redirect)
 - Wallet balance: ₹2,000
 - Recent transactions
 - Monthly analytics
   ↓
END: User logged in
```

### Alternative Path 1: Account Locked

```
User enters email + password
Backend validates:
 - Account has 5+ failed attempts? ✓
 - locked_until > now? ✓ (locked for 10 more minutes)
   ↓
Error: "Account locked. Try again in 10 minutes"
No OTP sent
User cannot proceed
   ↓
Option: Request unlock via email
```

### Alternative Path 2: Wrong Password

```
Attempt 1: Wrong password
   ↓
Error: "Invalid email or password"
login_attempts incremented to 1
   ↓
Attempt 2, 3, 4: Same as attempt 1
login_attempts = 2, 3, 4
   ↓
Attempt 5: Wrong password
   ↓
Error: "Invalid email or password"
login_attempts incremented to 5
locked_until = now + 15 minutes
   ↓
Screen refreshes:
Error: "Account locked. Try again in 15 minutes"
   ↓
User cannot login for 15 minutes
```

### Alternative Path 3: Invalid OTP

```
User enters wrong OTP: 000000
   ↓
[VALIDATE]
 - OTP matches? ✗
   ↓
Error: "Invalid OTP"
User can retry (no limit on OTP attempts)
   ↓
User tries 3 more times, then:
   ↓
User clicks "Resend OTP"
   → New OTP generated and sent
```

---

## 💰 FLOW 3: TOP-UP WALLET

### Happy Path

```
START: User on Dashboard
   ↓
SCREEN: Dashboard
 - Wallet balance: ₹0
 - "Top-up" button prominent
   ↓
User clicks "Top-up Wallet"
   ↓
SCREEN: Top-up Options
 - UPI (recommended)
 - Bank Transfer
 - QR Code Scan
   ↓
User selects "UPI"
   ↓
SCREEN: Top-up Amount
 - Amount input field
 - Suggestions: ₹500, ₹1000, ₹2000, ₹5000, ₹10000
 - Min: ₹100, Max: ₹100,000
 - "Proceed" button
   ↓
User enters: ₹2,000
   ↓
[VALIDATE]
 - Amount >= ₹100? ✓
 - Amount <= ₹100,000? ✓
 - Integer amount? ✓
   ↓
"Proceed" button enabled
   ↓
User clicks "Proceed"
   ↓
SCREEN: UPI Payment
 - Amount: ₹2,000
 - UPI ID: fstpay@upi (or similar)
 - "Copy UPI" button
 - QR Code to scan
 - Message: "Open your UPI app and pay"
   ↓
User opens Google Pay / PhonePe
User sends ₹2,000 to fstpay@upi
Payment gateway processes
   ↓
[BACKEND]
 - Payment webhook received
 - Status = SUCCESS
 - Transaction created
 - Wallet balance updated: 0 → 2000
   ↓
SCREEN: Success
 - Checkmark icon
 - "Top-up successful!"
 - Message: "₹2,000 added to wallet"
 - Transaction ID: TXN-12345
 - "View Wallet" button
   ↓
User clicks "View Wallet"
   ↓
SCREEN: Wallet Details
 - Balance: ₹2,000
 - Last transaction: Top-up ₹2,000 (2 minutes ago)
   ↓
END: Wallet topped up successfully
```

### Alternative Path 1: Insufficient UPI Balance

```
User enters: ₹5,000
User initiates UPI payment
UPI app shows: "Insufficient balance in linked account"
User cancels transaction
   ↓
Payment gateway: Status = FAILED
Backend receives webhook
Transaction status = FAILED
No wallet balance update
   ↓
SCREEN: Payment Failed
 - Message: "Payment could not be completed"
 - Reason: "Insufficient balance"
 - Options: "Retry" or "Try Different Amount"
   ↓
User clicks "Retry" or reduces amount
```

### Alternative Path 2: Transaction Timeout

```
User initiates UPI payment
UPI app takes >30 seconds to respond
   ↓
Timeout error in payment gateway
Status = PENDING
   ↓
Backend polls for 5 minutes:
 - If confirmed: Update wallet
 - If failed: Mark as failed
 - If still pending: Wait
   ↓
SCREEN: Waiting for Payment
 - Message: "Confirming payment... (may take 2-3 minutes)"
 - "Cancel" button (if user changes mind)
   ↓
After 5 minutes:
 - If successful: Show success screen
 - If failed: Show failure screen
```

---

## 🛍️ FLOW 4: MAKE PURCHASE WITH CARD

### Happy Path

```
START: User on e-commerce site (e.g., Amazon)
   ↓
USER: Browsing products, finds book for ₹500
   ↓
USER: Clicks "Buy Now"
   ↓
SCREEN: Checkout (Amazon)
 - Item: Book (₹500)
 - Delivery address
 - Payment method
   ↓
USER: Clicks "Add New Card"
   ↓
SCREEN: Card Details (Amazon)
 - Card number: •••• •••• •••• 1234 (FST Pay card)
 - Expiry: 12/26
 - CVV: 123
 - Cardholder name: Burhan Test
   ↓
USER: Opens FST Pay app to get card details
   ↓
SCREEN: FST Pay Dashboard
 - "Card" section
 - "Show Card Details" link (for copying)
   ↓
USER: Clicks "Show Card Details"
   ↓
SCREEN: Card Details (FST Pay)
 - Full card number: 4532 1234 5678 9012
 - CVV: 123
 - Expiry: 12/26
 - Copy buttons for each field
   ↓
USER: Copies card details
USER: Returns to Amazon
USER: Enters card details
USER: Clicks "Pay ₹500"
   ↓
[PAYMENT PROCESSING]
Backend: Validates card (exists, not frozen, sufficient balance)
 - Card exists? ✓
 - Card frozen? ✗
 - Balance >= ₹500? ✓ (balance = ₹2,000)
Processor: Charges card ₹500
   ↓
Backend: Transaction created
 - Type: Card payment
 - Merchant: Amazon
 - Amount: ₹500
 - Status: SUCCESSFUL
 - Wallet updated: ₹2,000 → ₹1,500
   ↓
SCREEN: Payment Success (Amazon)
 - Message: "Payment successful!"
 - Order number: ORD-12345
   ↓
[FST PAY APP]
Notification sent:
 - "💳 Purchase: ₹500 on Amazon"
 - "Balance: ₹1,500"
   ↓
USER: Opens FST Pay app (shortly after)
   ↓
SCREEN: Dashboard (FST Pay)
 - Notification visible
 - Recent transaction:
   - Amazon purchase ₹500 (1 min ago)
   - Status: SUCCESSFUL
 - Wallet balance: ₹1,500
 - "Food & Dining" category spending: ₹0 → ₹500 (if categorized as food)
   ↓
END: Purchase successful, wallet updated, transaction recorded
```

### Alternative Path 1: Card Frozen

```
During payment processing:
 - Card frozen? ✓
   ↓
Processor: Declines transaction
Backend: Status = DECLINED
   ↓
Amazon: Payment failed
Message: "Card declined by bank"
USER: Sees "Your card was declined"
   ↓
USER: Opens FST Pay app
SCREEN: Card details
 - Status: Frozen ❄️
   ↓
USER: Clicks "Unfreeze"
Confirmation: "Are you sure? This will allow new transactions"
USER: Confirms
   ↓
Backend: Card status = ACTIVE
   ↓
USER: Returns to Amazon
USER: Clicks "Pay" again
   → Payment succeeds (same as happy path)
```

### Alternative Path 2: Insufficient Balance

```
Wallet balance: ₹300
Trying to buy: ₹500 book
   ↓
During payment processing:
 - Balance >= ₹500? ✗ (balance = ₹300)
   ↓
Processor: Declines transaction
Backend: Status = DECLINED (insufficient funds)
   ↓
Amazon: Payment failed
Message: "Insufficient funds. Please try again later or use different card"
USER: Sees error
   ↓
USER: Options:
 a) Top-up wallet first (add ₹200+)
 b) Use different card
 c) Reduce quantity
   ↓
USER: Chooses option (a) - tops up ₹500 more
USER: Returns to Amazon
USER: Clicks "Pay" again
   → Payment succeeds
```

---

## 📊 FLOW 5: VIEW MONTHLY ANALYTICS

### Happy Path

```
START: User on Dashboard
   ↓
SCREEN: Dashboard
 - Wallet section
 - Recent transactions (5 most recent)
 - "View Full Analytics" button
   ↓
USER: Scrolls down to Analytics section
   ↓
SCREEN: Analytics Widget
 - Current month: June 2026
 - Total spending: ₹8,500
 - Breakdown pie chart (auto-calculated)
 - Month selector (dropdown)
   ↓
CATEGORIES SHOWN:
 - 📚 Education: 30% (₹2,550)
 - 🍕 Food & Dining: 25% (₹2,125)
 - 🛍️ Shopping: 25% (₹2,125)
 - 🎮 Entertainment: 15% (₹1,275)
 - ✈️ Travel: 5% (₹425)
 - 🏠 Utilities: 0% (₹0)
 - ❓ Other: 0% (₹0)
   ↓
USER: Clicks on "Education" slice
   ↓
SCREEN: Education Detailed View
 - Total: ₹2,550
 - Transactions:
   1. Online course purchase: ₹1,500
   2. Books for school: ₹750
   3. Tuition: ₹300
 - Average per transaction: ₹850
 - Top merchant: Udemy
   ↓
USER: Goes back
USER: Clicks "Daily Trend" tab
   ↓
SCREEN: Daily Spending Trend
 - Line chart showing daily spending
 - X-axis: Days (1-30)
 - Y-axis: Amount (₹0 - ₹1,000)
 - Peaks on:
   - Day 5: ₹800 (shopping day)
   - Day 15: ₹1,200 (education payment)
   - Day 25: ₹600 (normal spending)
 - Average per day: ₹283
   ↓
USER: Sees comparison:
 - June 2026: ₹8,500
 - May 2026: ₹7,200
 - Difference: +18% (↑)
   ↓
INSIGHT SHOWN:
 "You're spending 18% more than last month.
  Top reason: Education spending +₹500
  Suggestion: Check if this is expected"
   ↓
USER: Scrolls to see more insights
   ↓
MORE INSIGHTS:
 - "Food spending is consistent (±2% month-over-month)"
 - "Shopping increased 25% - due to festive season?"
 - "On track! You have ₹1,500 left to stay within ₹10K budget"
   ↓
USER: Clicks "Download Report"
   ↓
SCREEN: Report Generation
 - PDF generating...
 - Download or Email option
   ↓
USER: Clicks "Email Report"
   ↓
Success: "Report sent to smburhan.personal@gmail.com"
   ↓
END: Analytics viewed and report sent
```

---

## 🤖 FLOW 6: AI MONEY COACH INTERACTION

### Happy Path

```
START: User on Dashboard
   ↓
SCREEN: Dashboard
 - Wallet balance: ₹1,500
 - Recent transactions visible
 - "AI Coach" card appears (after 2+ weeks of usage)
   ↓
COACH CARD:
 - Avatar: AI coach illustration
 - Message: "Hey! I analyzed your spending. Want some tips?"
 - "Chat" button
   ↓
USER: Clicks "Chat"
   ↓
SCREEN: Coach Chat
 - Coach avatar top
 - Message history (empty first time)
 - Input field: "Ask me anything about your money..."
   ↓
COACH: "Hi! I'm your financial coach 👋
 I noticed you've been spending ₹8,500/month for the last 3 months.
 
 Here are my observations:
 1. Your food spending is ₹2,100/month (consistent)
 2. Your shopping jumped to ₹2,125 (first time this high)
 3. You have NO savings this month
 
 Want to know how to save more? Just ask!"
   ↓
USER: Types: "How can I save more?"
   ↓
COACH: "Great question! 🎯
 
 Looking at your data:
 - Your food budget is ₹2,100/month
 - If you reduce to ₹1,800 (₹10/day savings)
   You'd save ₹300/month!
 
 - Your entertainment is ₹1,275/month
 - Cutting it by 20% = ₹255 extra saved
 
 Together: ₹555 saved/month!
 
 That's ₹6,660/year → can get that laptop you mentioned! 💻"
   ↓
USER: "That seems hard. Any easier way?"
   ↓
COACH: "Totally! 😊 Start small:
 
 Week 1: Pick ONE category to reduce (food or shopping)
 Week 2: Track your progress
 Week 3: Review savings
 Week 4: Celebrate! 🎉
 
 Then next month, work on another category.
 Small steps lead to big wins!
 
 Want me to set a reminder for next week?"
   ↓
USER: "Yes"
   ↓
COACH: "Perfect! I'll remind you every Monday. 
 
 Meanwhile, here's your current status:
 - Monthly budget: ₹10,000
 - Current spending: ₹8,500
 - Remaining: ₹1,500
 
 You have until end of month to build a savings streak! 💪"
   ↓
USER: Closes chat
   ↓
SCREEN: Dashboard (updated)
 - New badge: "Speaking with Coach" ✅
 - Saved insights summary shown
   ↓
END: User got personalized advice from AI
```

---

## 📋 FLOW 7: PARENTAL LINK (Optional)

### Happy Path

```
START: Parent (Mom) wants to link to child's account
   ↓
MOM: Opens FST Pay app (installed separately)
   ↓
SCREEN: Login
MOM: Logs into her own account
   ↓
SCREEN: Mom's Dashboard
 - Her wallet: ₹10,000
 - Her transactions
 - "Link Family Member" button (new)
   ↓
MOM: Clicks "Link Family Member"
   ↓
SCREEN: Link Family
 - "Enter Child's Email": smburhan.personal@gmail.com
 - "Relationship": Child
 - "Permission Level": View-only (recommended)
   ↓
MOM: Enters child's email
MOM: Clicks "Send Link"
   ↓
Backend: Email sent to child
Subject: "Your mom wants to link to your account"
   ↓
CHILD: Receives email
CHILD: Opens FST Pay app
CHILD: Clicks notification: "Your mom wants parental visibility"
   ↓
SCREEN: Approval
 - Message: "Your mom (mom@email.com) wants to see your spending"
 - Permission scope: "View wallet, transactions, and insights"
 - Buttons: "Accept" or "Decline"
   ↓
CHILD: Clicks "Accept"
   ↓
Backend: Parent-child relationship created
   ↓
MOM: Receives notification
Message: "Burhan approved the link!"
   ↓
MOM: Opens FST Pay Dashboard
   ↓
SCREEN: Mom's Dashboard
 - Her wallet
 - New section: "Family Members"
   ↓
MOM: Clicks "Burhan"
   ↓
SCREEN: Burhan's View (Read-only)
 - Wallet balance: ₹1,500
 - This month spending: ₹8,500
 - Category breakdown (pie chart)
 - Recent transactions:
   1. Amazon purchase: ₹500
   2. Dominos: ₹300
   3. Top-up: ₹2,000
 - "Message" button (optional)
   ↓
MOM: Sees "He spent ₹8,500 this month"
MOM: Reviews categories
MOM: Notices: Shopping increased
   ↓
MOM: Clicks "Message"
   ↓
SCREEN: Chat (Parent-Child)
MOM: Types: "Hey, I see your shopping was high this month. Everything ok?"
   ↓
CHILD: Receives notification
CHILD: Clicks notification
   ↓
SCREEN: Message from Mom
CHILD: Reads and responds
   ↓
Both can communicate about finances openly
   ↓
END: Parental visibility established, no control, just insight
```

---

## 🔄 COMMON EDGE CASES & ERROR FLOWS

### Edge Case 1: Network Timeout

```
During any transaction:
 - User clicks "Pay" / "Top-up" / etc.
 - Network connection drops
   ↓
SCREEN: Error
 - Icon: ⚠️
 - Message: "Connection lost"
 - Options: "Retry" or "Check Connection"
   ↓
USER: Fixes WiFi/mobile data
USER: Clicks "Retry"
   ↓
Request retried, continues normally OR still fails
```

### Edge Case 2: Session Expired

```
User has app open for 24+ hours
JWT token expired
User performs action (transaction, view analytics)
   ↓
Backend: Returns 401 Unauthorized
Frontend: Automatically calls refresh endpoint
 - Uses refreshToken (valid for 7 days)
 - Gets new accessToken
 - Retries original request
   ↓
User sees NO interruption (transparent)
Transaction succeeds as if nothing happened
   ↓
If refreshToken also expired:
 - Force logout
 - Redirect to login
 - Error: "Session expired, please login again"
```

### Edge Case 3: Account Activity During OTP Wait

```
User on OTP screen, waiting for 10-minute window
User realizes they made a mistake
Options available:
 - "Resend OTP" (new OTP sent, timer resets)
 - "Use Different Email" (goes back to signup)
 - "Change Password" (after login - not on signup screen)
   ↓
Standard behavior for all options
No data loss
```

---

## 📱 RESPONSIVE DESIGN FLOWS

### Mobile (375px - 812px)

All flows work on mobile with:
- [ ] Touch-friendly buttons (48px+ tap targets)
- [ ] Vertical stacking (no side-by-side)
- [ ] Keyboard accessibility
- [ ] Loading indicators
- [ ] Error states clearly visible

### Tablet (768px - 1024px)

- [ ] 2-column layouts for analytics
- [ ] Larger charts
- [ ] Horizontal navigation where appropriate

### Desktop (1024px+)

- [ ] 3-column layouts
- [ ] Larger data visualizations
- [ ] Side navigation
- [ ] Full feature access

---

**Document Version:** 1.0  
**Last Updated:** June 17, 2026  
**Total Flows Documented:** 7 major + 10+ edge cases

