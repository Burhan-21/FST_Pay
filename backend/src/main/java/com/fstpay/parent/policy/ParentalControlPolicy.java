package com.fstpay.parent.policy;

import com.fstpay.common.event.ApprovalRequestedEvent;
import com.fstpay.common.event.EventPublisher;
import com.fstpay.parent.entity.ParentChildLink;
import com.fstpay.parent.entity.TransactionApproval;
import com.fstpay.parent.repository.ParentChildLinkRepository;
import com.fstpay.parent.repository.TransactionApprovalRepository;
import com.fstpay.user.entity.User;
import com.fstpay.wallet.api.WalletDailySummaryOperations;
import com.fstpay.wallet.entity.Wallet;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Slf4j
@Component
@RequiredArgsConstructor
public class ParentalControlPolicy {

    private final TransactionApprovalRepository approvalRepository;
    private final ParentChildLinkRepository parentChildLinkRepository;
    private final WalletDailySummaryOperations summaryService;
    private final EventPublisher eventPublisher;

    /**
     * Evaluates a proposed transaction against the user's parental control policies.
     *
     * @param user        The authenticated user (teen)
     * @param wallet      The user's active wallet
     * @param amount      The proposed spend amount
     * @param category    The transaction category (e.g., FOOD, GAMING)
     * @param merchant    The merchant name
     * @param description An optional description of the purchase
     * @return ParentalPolicyResult with ALLOWED, REQUIRES_APPROVAL (with generated TransactionApproval), or REJECTED
     */
    public ParentalPolicyResult evaluate(
            User user,
            Wallet wallet,
            BigDecimal amount,
            String category,
            String merchant,
            String description) {

        if (user.getParentalControlEnabled() == null || !user.getParentalControlEnabled()) {
            return ParentalPolicyResult.allowed("Parental controls disabled");
        }

        log.info("Evaluating ParentalControlPolicy for user: {}, amount: ₹{}, category: {}", user.getEmail(), amount, category);

        // 1. Check for pre-existing parent approval bypass
        List<TransactionApproval> approvals = approvalRepository
                .findByChildIdAndStatusOrderByCreatedAtDesc(user.getId(), "APPROVED");

        Optional<TransactionApproval> matchOpt = approvals.stream()
                .filter(a -> a.getAmount() != null && amount.compareTo(a.getAmount()) <= 0)
                .filter(a -> a.getCategory() == null || a.getCategory().equalsIgnoreCase(category))
                .findFirst();

        if (matchOpt.isPresent()) {
            TransactionApproval approval = matchOpt.get();
            approval.setStatus("COMPLETED");
            approval.setDecidedAt(Instant.now());
            approvalRepository.save(approval);

            log.info("Parental control bypassed: Matched active approval ID: {}", approval.getId());
            return ParentalPolicyResult.allowed("Bypassed parental control: Approved by parent (ID: " + approval.getId() + ")");
        }

        // 2. Check Category Restrictions
        if (user.getParentalRestrictedCategories() != null && !user.getParentalRestrictedCategories().trim().isEmpty()) {
            String reqCategory = category != null ? category.toUpperCase().trim() : "";
            String[] restrictedList = user.getParentalRestrictedCategories().split(",");
            for (String restricted : restrictedList) {
                if (restricted.trim().equalsIgnoreCase(reqCategory)) {
                    String reason = "Access restricted to category " + reqCategory;
                    log.warn("Category restriction triggered for user {}: {}", user.getEmail(), reason);
                    return queueForApprovalOrReject(user, amount, category, merchant, description, reason);
                }
            }
        }

        // 3. Single Transaction Limit
        if (user.getParentalMaxTxnAmount() != null && user.getParentalMaxTxnAmount().compareTo(BigDecimal.ZERO) > 0) {
            if (amount.compareTo(user.getParentalMaxTxnAmount()) > 0) {
                String reason = "Exceeds max transaction limit of ₹" + user.getParentalMaxTxnAmount();
                log.warn("Max transaction limit exceeded for user {}: {}", user.getEmail(), reason);
                return queueForApprovalOrReject(user, amount, category, merchant, description, reason);
            }
        }

        LocalDate today = LocalDate.now();

        // 4. Daily Spending Limit Check
        if (user.getParentalDailyLimit() != null && user.getParentalDailyLimit().compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal dailySpent = summaryService.getSpentAmountBetween(wallet.getId(), today, today);
            if (dailySpent.add(amount).compareTo(user.getParentalDailyLimit()) > 0) {
                String reason = "Exceeds daily limit of ₹" + user.getParentalDailyLimit() + " (spent today: ₹" + dailySpent + ")";
                log.warn("Daily limit exceeded for user {}: {}", user.getEmail(), reason);
                return queueForApprovalOrReject(user, amount, category, merchant, description, reason);
            }
        }

        // 5. Weekly Spending Limit Check (Last 7 days)
        if (user.getParentalWeeklyLimit() != null && user.getParentalWeeklyLimit().compareTo(BigDecimal.ZERO) > 0) {
            LocalDate startOfWeek = today.minusDays(6);
            BigDecimal weeklySpent = summaryService.getSpentAmountBetween(wallet.getId(), startOfWeek, today);
            if (weeklySpent.add(amount).compareTo(user.getParentalWeeklyLimit()) > 0) {
                String reason = "Exceeds weekly limit of ₹" + user.getParentalWeeklyLimit() + " (spent last 7 days: ₹" + weeklySpent + ")";
                log.warn("Weekly limit exceeded for user {}: {}", user.getEmail(), reason);
                return queueForApprovalOrReject(user, amount, category, merchant, description, reason);
            }
        }

        // 6. Monthly Spending Limit Check (Last 30 days)
        if (user.getParentalMonthlyLimit() != null && user.getParentalMonthlyLimit().compareTo(BigDecimal.ZERO) > 0) {
            LocalDate startOfMonth = today.minusDays(29);
            BigDecimal monthlySpent = summaryService.getSpentAmountBetween(wallet.getId(), startOfMonth, today);
            if (monthlySpent.add(amount).compareTo(user.getParentalMonthlyLimit()) > 0) {
                String reason = "Exceeds monthly limit of ₹" + user.getParentalMonthlyLimit() + " (spent last 30 days: ₹" + monthlySpent + ")";
                log.warn("Monthly limit exceeded for user {}: {}", user.getEmail(), reason);
                return queueForApprovalOrReject(user, amount, category, merchant, description, reason);
            }
        }

        log.info("ParentalControlPolicy passed all checks for user: {}", user.getEmail());
        return ParentalPolicyResult.allowed("All parental control checks passed");
    }

    private ParentalPolicyResult queueForApprovalOrReject(
            User user,
            BigDecimal amount,
            String category,
            String merchant,
            String description,
            String reason) {

        Optional<ParentChildLink> linkOpt = parentChildLinkRepository.findByChildIdAndStatus(user.getId(), "ACTIVE");
        if (linkOpt.isEmpty()) {
            return ParentalPolicyResult.rejected(reason + ", but no active parent account is linked to approve it");
        }

        User parent = linkOpt.get().getParent();
        String desc = description != null && !description.isBlank() 
                ? description 
                : "Spend of ₹" + amount + " at " + merchant;

        TransactionApproval approval = TransactionApproval.builder()
                .child(user)
                .parent(parent)
                .requestType("SPEND")
                .amount(amount)
                .category(category != null ? category.toUpperCase().trim() : null)
                .merchant(merchant)
                .description(desc)
                .status("PENDING")
                .build();

        TransactionApproval saved = approvalRepository.save(approval);

        // Broadcast real-time approval event
        eventPublisher.publish(ApprovalRequestedEvent.create(
                parent, user, saved.getRequestType(), saved.getAmount(), saved.getMerchant(), saved.getDescription()
        ));

        log.info("Created pending approval ID {} for child {} to parent {}", saved.getId(), user.getEmail(), parent.getEmail());
        return ParentalPolicyResult.requiresApproval(saved, reason + ". Queued for parent approval.");
    }
}
