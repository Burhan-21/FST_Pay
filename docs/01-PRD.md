# FST Pay — Product Requirements Document (PRD) v1.0

**Document ID:** FST-PRD-2026-Q2  
**Version:** 1.0  
**Status:** 🟡 DRAFT (Awaiting stakeholder approval)  
**Date:** June 17, 2026  
**Owner:** Product Management  
**Last Updated:** June 17, 2026

---

## 📋 EXECUTIVE SUMMARY

**Product Name:** FST Pay  
**Category:** Fintech / Digital Wallet / Personal Finance Platform  
**Type:** B2C SaaS + Mobility App  
**Target Launch:** Q3 2026 (Beta) → Q4 2026 (General Availability)

### One-Liner
*FST Pay is an AI-powered digital wallet and virtual card platform that empowers teenagers and young adults to develop healthy financial habits through intelligent expense tracking, AI-driven budgeting, and gamified financial education.*

### Vision
Enable the next generation (ages 13-25) to become financially independent by providing them with:
- **Tools** to manage money digitally
- **Intelligence** to understand their spending patterns
- **Guidance** from AI to build healthy habits
- **Rewards** to celebrate financial wins

### Mission
Make financial literacy accessible, engaging, and rewarding for teenagers and young adults through a delightful, secure digital platform.

---

## 🎯 PROBLEM STATEMENT

### The Problem

**Primary User Pain:**
- **Teenagers (13-18):** Receive pocket money but have no way to track/manage spending → impulsive purchases → parental conflict
- **Students (18-22):** Earn part-time income but lack budgeting skills → run out of money mid-month → financial stress
- **Young Professionals (22-25):** Start first job but poor money management → lifestyle inflation → cannot save

**Market Context:**
- 🇮🇳 **India Specific:**
  - 450+ million young people (ages 13-25)
  - <5% have formal banking products
  - 0% have financial literacy education
  - Digital UPI penetration: 80%+ but NO youth-focused fintech
  - Parents want financial control + teaching tool
  - Youth want autonomy + financial independence

**Existing Solutions - Gaps:**
- ❌ Traditional banks: Not youth-friendly, high minimums, no financial education
- ❌ Parent-child apps (Greenlight, RoosterMoney): Expensive ($10-15/mo), not India-compliant
- ❌ General personal finance (YNAB, Mint): Too complex for teenagers
- ❌ Payment apps (GPay, PhonePe): No financial education or analytics
- ❌ Lending apps (Cred, BorrowBox): Focused on credit, not savings

**Our Insight:**
Teenagers will adopt fintech if it's:
1. **Fun & Rewarding** (gamification, cashback)
2. **Autonomous** (their own card, not parent-controlled)
3. **Educating** (AI teaches them, not lectures)
4. **Secure** (parents have optional visibility)
5. **Free** (no monthly fees)

---

## 👥 TARGET USERS

### Primary Segment: Teenagers (13-18)
**Who:** High school students, part-time earners, pocket-money recipients  
**Size:** ~120 million in India  
**Problem:** No digital wallet, cannot track spending, impulsive purchases  
**Motivation:** Want independence, social status (digital card), rewards  
**Key Metric:** Monthly active transactions, savings streak

### Secondary Segment: College Students (18-22)
**Who:** Undergrads, part-time workers, scholarship recipients  
**Size:** ~45 million in India  
**Problem:** Manage part-time income, pay splits with roommates, budget for semester  
**Motivation:** Financial control, avoid debt, build credit history  
**Key Metric:** Average balance, monthly savings, budget adherence

### Tertiary Segment: Young Professionals (22-25)
**Who:** First-job earners, fresh graduates, early-career employees  
**Size:** ~35 million in India  
**Problem:** Poor spending habits, no investment knowledge, high lifestyle inflation  
**Motivation:** Save for goals, invest wisely, build wealth  
**Key Metric:** Savings rate, investment adoption, goal completion

### Stakeholder: Parents
**Who:** Parents of teenagers and young adults  
**Problem:** Want to teach kids about money safely, need visibility into spending  
**Motivation:** Peace of mind, financial education  
**Key Metric:** Parental controls enabled, co-management adoption

---

## 🎬 USER PERSONAS

### Persona 1: "Arjun" — Teenage Spender
**Age:** 16  
**Income:** ₹2,000/month pocket money + ₹1,500 tuition allowance  
**Pain:** Spends allowance by 2nd week, nothing left for fun activities  
**Goals:** 
- Save ₹500/month for gaming laptop
- Track monthly spending
- Feel independent
- Impress friends with digital card

**Tech Comfort:** High (TikTok/Instagram power user)  
**Adoption Driver:** Cashback, rewards, cool card design  
**Biggest Fear:** Parents controlling his money

---

### Persona 2: "Priya" — College Student
**Age:** 20  
**Income:** ₹8,000/month (part-time work) + ₹5,000 from home  
**Pain:** Shares apartment with friends, splitting bills is messy; doesn't know where money goes  
**Goals:**
- Split expenses with roommates easily
- Understand monthly spending
- Save ₹3,000/month for summer trip
- Build financial habits

**Tech Comfort:** Very high (daily app user)  
**Adoption Driver:** Expense tracking, easy splitting, insights  
**Biggest Fear:** Overspending, running out of money

---

### Persona 3: "Rohan" — Young Professional
**Age:** 24  
**Income:** ₹25,000/month (salary) + ₹5,000 freelance  
**Pain:** Spends entire salary by month-end, cannot save, no investment knowledge  
**Goals:**
- Save ₹10,000/month consistently
- Learn to invest
- Build wealth
- Budget for marriage/house

**Tech Comfort:** High (expects modern finance tools)  
**Adoption Driver:** AI guidance, investment integration, wealth building  
**Biggest Fear:** Making poor financial decisions

---

### Persona 4: "Mrs. Sharma" — Parent
**Age:** 45  
**Income:** Upper-middle class, concerned parent  
**Pain:** Doesn't know what her son spends money on; wants him to learn financial discipline  
**Goals:**
- Set spending limits for her son
- See transaction history
- Teach him financial responsibility
- Not too controlling (wants autonomy for him)

**Tech Comfort:** Moderate (uses apps but not daily)  
**Adoption Driver:** Parental controls, transparency, peace of mind  
**Biggest Fear:** Her child's financial irresponsibility

---

## 🎯 CORE FEATURES (MVP)

### Feature Set Hierarchy

```
MUST HAVE (MVP Launch):
├─ Wallet Management
├─ Digital Card
├─ Transactions
├─ Basic Analytics
├─ Authentication
└─ Notifications

SHOULD HAVE (Phase 2):
├─ AI Money Coach
├─ Advanced Analytics
├─ Rewards Program
├─ Monthly Reports
└─ Parental Controls (Premium)

NICE TO HAVE (Phase 3+):
├─ Investment Integration
├─ Bill Splitting
├─ Merchant Integrations
└─ Subscription Management
```

### 1. WALLET MANAGEMENT

**Feature 1.1: Create & Manage Wallet**
- User creates digital wallet during signup
- Wallet has balance, account number
- Top-up options:
  - [ ] UPI (Google Pay, PhonePe, etc.)
  - [ ] Bank transfer (NEFT/RTGS)
  - [ ] QR code scanning
  - [ ] Card/debit card charging (Phase 2)
  - [ ] Parent topping up (Phase 2)
- [ ] Withdraw to bank account
- [ ] View wallet history

**Feature 1.2: Balance & Limits**
- Display real-time balance
- Show available limit (daily spend cap)
- Alert when balance falls below ₹500
- Hard limit enforcement (cannot overdraw)

---

### 2. DIGITAL CARD

**Feature 2.1: Virtual Prepaid Card**
- Auto-generate virtual card on signup
- Card number, CVV, expiry date
- Card design customization (colors, avatar)
- Freeze/unfreeze card
- Regenerate card (old card invalidates)
- Card expires after 1 year (auto-renew)

**Feature 2.2: Card Spending Control**
- Set daily spending limit (e.g., ₹500/day)
- Set merchant lock (only UPI, no online)
- One-time card generation (for online shopping)
- Transaction notifications

---

### 3. TRANSACTIONS

**Feature 3.1: Transaction Recording**
- Auto-record all wallet transactions
- Manual expense entry (cash spent)
- Peer-to-peer transfers
- Split payments (bill splitting - Phase 2)
- Recurring bills (subscriptions - Phase 2)

**Feature 3.2: Transaction Details**
- Timestamp, amount, merchant, category
- Receipt storage (image capture)
- Tags & notes
- Dispute/refund requests (Phase 2)

---

### 4. EXPENSE ANALYTICS

**Feature 4.1: Categorized Spending**
- Auto-categorize transactions:
  - Food & Dining
  - Entertainment
  - Shopping
  - Travel
  - Education
  - Utilities
  - Other
- Manual category override

**Feature 4.2: Monthly Analytics Dashboard**
- Total spending by category (pie chart)
- Daily spending trend (line chart)
- Comparison to previous month
- Biggest spender category
- Savings this month
- Recurring expenses

**Feature 4.3: Spending Insights**
- Alert if spending exceeds budget
- "You're on track to save ₹X this month"
- "Your shopping spending is 20% higher than last month"
- Trend analysis (increasing/decreasing)

---

### 5. AUTHENTICATION & SECURITY

**Feature 5.1: User Registration**
- Email + password signup
- Age verification (min 13 years)
- Parent consent (for <18 users - Phase 2)
- Email OTP verification
- Parent phone verification (Phase 2)

**Feature 5.2: Multi-Factor Authentication**
- Password + Email OTP on login
- SMS OTP optional
- Biometric (fingerprint/face) - Phase 2

**Feature 5.3: Data Security**
- End-to-end encryption (PII)
- Card details never exposed
- Session timeout (15 min)
- Logout everywhere option

---

### 6. NOTIFICATIONS

**Feature 6.1: In-App Notifications**
- Transaction confirmed
- Balance updated
- Budget exceeded
- Spending insights
- Card activity

**Feature 6.2: Email Notifications**
- Daily summary (if spending > ₹100)
- Weekly digest
- Monthly report
- Important alerts (unusual activity)

---

## 🗺️ USER JOURNEYS

### Journey 1: Teenager Signup & First Purchase

```
Start: Teen wants to buy gaming laptop (₹50,000)
Goal: Save ₹500/month for 10 months

Step 1: Download FST Pay
        ↓
Step 2: Sign up with email
        ↓
Step 3: Create wallet
        ↓
Step 4: Top up ₹2,000 via UPI
        ↓
Step 5: Receive virtual card
        ↓
Step 6: Make first purchase online (₹500)
        ↓
Step 7: View transaction in app
        ↓
Step 8: See monthly analytics (₹500 spent on shopping)
        ↓
Step 9: Receive alert: "On track! Save ₹500 more this month for your goal"
        ↓
Success: Teen feels in control, goal feels achievable
```

---

### Journey 2: Student Splits Rent

```
Start: Priya's roommate asks for rent splitting
Goal: Split ₹8,000 rent equally (₹4,000 each)

Step 1: Open FST Pay
        ↓
Step 2: Click "Split Bill"
        ↓
Step 3: Add roommate's UPI
        ↓
Step 4: Enter ₹8,000 rent amount
        ↓
Step 5: App auto-calculates ₹4,000 each
        ↓
Step 6: Priya pays ₹4,000 to landlord
        ↓
Step 7: Sends roommate settlement link
        ↓
Step 8: Roommate pays ₹4,000 to Priya
        ↓
Step 9: Transaction settled in app
        ↓
Success: No confusion, record kept, money sorted
```

---

### Journey 3: Young Professional Gets AI Advice

```
Start: Rohan earns ₹30,000/month, spends ₹28,000
Goal: Save ₹10,000/month and invest

Step 1: Open FST Pay dashboard
        ↓
Step 2: AI Coach sees spending pattern
        ↓
Step 3: Coach suggests: "Your dining spend is ₹8,000/month
         (too high for your income). Try ₹5,000?"
        ↓
Step 4: Coach recommends: "Start SIP (₹3,000/month) in index funds"
        ↓
Step 5: Rohan clicks "Set Budget" → sets dining to ₹5,000
        ↓
Step 6: Coach celebrates: "Great! You'll save ₹13,000 this month!"
        ↓
Step 7: Rohan reduces dining, achieves savings goal
        ↓
Step 8: Coach sends: "🎉 Savings streak: 3 weeks! You're building wealth!"
        ↓
Success: Rohan feels empowered, sees path to financial goals
```

---

## 📊 SUCCESS METRICS

### Phase 0 → 1 (MVP)

| Metric | Target | Why |
|--------|--------|-----|
| **User Signups** | 10,000 by end of Phase 1 | Validate PMF |
| **Wallet Top-ups** | 5,000 users top up by end of Phase 1 | Active engagement |
| **Avg Monthly Balance** | ₹2,000 | Engagement depth |
| **Monthly Active Users** | 60% DAU/MAU ratio | Habit formation |
| **Avg Transactions/User/Month** | 8 transactions | Frequency |
| **Email Opt-in** | 40% of users | Communication |
| **App Rating** | 4.2+ stars | Quality perception |
| **Support Tickets/1000 users** | <10 | Product stability |

### Phase 1 → 2 (Growth)

| Metric | Target | Why |
|--------|--------|-----|
| **Total Users** | 100,000 | Scale |
| **Monthly Transactions** | 800,000 | Volume |
| **Total Wallet Balance** | ₹200 crores | Trust |
| **Parental Control Adoption** | 20% of users | New segment |
| **Repeat Top-up Rate** | 70% | Retention |
| **Referral Rate** | 15% | Viral growth |
| **LTV:CAC Ratio** | 3:1 minimum | Unit economics |

---

## 🔄 MVP SCOPE (Launch v1.0)

### INCLUDE in MVP:
✅ User registration with email + OTP  
✅ Digital wallet with UPI top-up  
✅ Virtual card generation  
✅ Transaction tracking  
✅ Basic category analytics  
✅ Monthly dashboard  
✅ Card freeze/unfreeze  
✅ In-app + email notifications  
✅ Security features (OTP login, encryption)  
✅ Basic parental controls (view-only mode)  

### EXCLUDE from MVP:
❌ AI Money Coach  
❌ Bill splitting  
❌ Monthly PDF reports  
❌ Investment integration  
❌ Subscription management  
❌ Merchant lock controls  
❌ One-time cards  
❌ SMS OTP option  
❌ Biometric login  
❌ Rewards/cashback program  
❌ Debit card reload  
❌ Crypto integration  

---

## 💰 MONETIZATION STRATEGY

### Phase 1 (MVP): FREE
- No fees for teenagers/students
- Build user base + habits
- Freemium model for premium features (future)

### Phase 2+: Multiple Revenue Streams
1. **Parental Premium** (₹99-199/month)
   - Advanced spending controls
   - Budget management
   - Age-appropriate insights

2. **Premium Features** (₹49-99/month)
   - Advanced analytics
   - Investment recommendations
   - Bill splitting unlimited

3. **Merchant Partnerships**
   - Cashback from partner merchants (0.5-2%)
   - Revenue split with FST Pay

4. **Institutional Partnerships**
   - Schools integrate FST Pay for pocket money
   - Banks use as youth onboarding
   - Employers use for internship stipends

5. **B2B2C Model** (Phase 3+)
   - White-label for banks
   - White-label for schools
   - API for other fintechs

---

## 🚀 GO-TO-MARKET STRATEGY

### Phase 0-1: Product-Led Growth (First 10K users)
1. **Influencer Program**
   - Partner with 20-30 nano-influencers (50K-200K followers)
   - Tech/finance/lifestyle content creators
   - Provide free premium, commission on signups

2. **School Partnerships**
   - Approach top 50 schools in metros
   - Demo to teachers + parents
   - Offer 10% bonus on first top-up through school links

3. **Reddit + Discord**
   - Personal finance subreddits
   - Indian finance communities
   - Genuine engagement, no spam

4. **Organic Social**
   - TikTok: Spending fails, savings wins (relatable)
   - Instagram: Infographics on financial literacy
   - Twitter: Finance tips + product updates

### Phase 1-2: Viral + Referral (10K → 100K)
1. **Referral Program**
   - ₹100 bonus for referrer + referee
   - 20-30% virality coefficient target

2. **Partnerships**
   - UPI apps (GPay, PhonePe) recommendations
   - Paytm integration
   - School alumni platforms

3. **Media Coverage**
   - Press releases: "First AI-powered wallet for teens"
   - Startup coverage (YC, TechCrunch India)
   - Financial literacy angle

---

## 📋 ASSUMPTIONS & CONSTRAINTS

### Assumptions:
- ✅ Users have smartphone + internet
- ✅ Users have UPI setup (GPay/PhonePe/bank app)
- ✅ Users are comfortable with digital banking
- ✅ Parents will consent to child's account
- ✅ RBI will allow digital wallet for <18s
- ✅ Payment gateway can handle teen accounts

### Constraints:
- 🚫 RBI regulations on <18 accounts (to be verified)
- 🚫 KYC requirements for wallet
- 🚫 Parental consent documentation
- 🚫 Payment gateway integration costs
- 🚫 Compliance with child protection laws

### Out of Scope (Phase 1):
- ❌ Cryptocurrency
- ❌ Stock trading
- ❌ Loans/credit
- ❌ International transactions
- ❌ Multi-currency support

---

## 📞 APPENDIX: REGULATORY CONSIDERATIONS

### India-Specific Regulatory Requirements

**1. RBI Compliance**
- Non-bank entity cannot offer deposits (need banking partner)
- Must partner with bank for wallet (prepaid)
- Compliance with prepaid FasTag rules

**2. NPCI (National Payments Corporation)**
- UPI mandate: PPI (Prepaid Instrument) license or partner
- Customer due diligence (CDD)
- KYC requirements

**3. Child Protection**
- Parental consent for <18 accounts (legal requirement)
- Age verification mechanism
- Data protection (no data selling)

**4. Data Privacy**
- GDPR-like compliance (India's DPDP Bill)
- User consent for notifications
- Right to be forgotten

### Action Items:
- [ ] Consult legal team on RBI compliance
- [ ] Identify banking partner for wallet backend
- [ ] Design parental consent flow
- [ ] Audit data privacy practices

---

## 📝 SIGN-OFF & APPROVAL

| Role | Approval | Date | Comments |
|------|----------|------|----------|
| Product Manager | ⏳ Pending | — | Await feedback |
| Backend Architect | ⏳ Pending | — | See Technical Architecture Doc |
| Security Engineer | ⏳ Pending | — | See Security & Access Doc |
| Startup Advisor | ⏳ Pending | — | GTM review |
| Legal Counsel | ⏳ Pending | — | Regulatory review |

---

**Document Version:** 1.0  
**Last Updated:** June 17, 2026  
**Next Review:** After stakeholder feedback  
**Owner:** Product Management  
**Confidence Level:** 85% (regulatory items add 15% risk)

