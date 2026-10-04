package com.fstpay.parent.service;

import com.fstpay.card.entity.VirtualCard;
import com.fstpay.card.repository.VirtualCardRepository;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.goal.entity.WalletGoal;
import com.fstpay.goal.repository.WalletGoalRepository;
import com.fstpay.notification.entity.Notification;
import com.fstpay.notification.repository.NotificationRepository;
import com.fstpay.parent.dto.*;
import com.fstpay.parent.entity.ParentChildLink;
import com.fstpay.parent.entity.TransactionApproval;
import com.fstpay.parent.repository.ParentChildLinkRepository;
import com.fstpay.parent.repository.TransactionApprovalRepository;
import com.fstpay.transaction.entity.Transaction;
import com.fstpay.transaction.repository.TransactionRepository;
import com.fstpay.user.dto.ChildSummaryDto;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@Transactional
@RequiredArgsConstructor
public class ParentDashboardService {

    private final ParentLinkService parentLinkService;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final ParentChildLinkRepository parentChildLinkRepository;
    private final TransactionRepository transactionRepository;
    private final TransactionApprovalRepository transactionApprovalRepository;
    private final NotificationRepository notificationRepository;
    private final VirtualCardRepository virtualCardRepository;
    private final WalletGoalRepository walletGoalRepository;
    private final com.fstpay.analytics.service.AnalyticsService analyticsService;

    public ParentDashboardDto getParentDashboard(String parentEmail) {
        User parent = userRepository.findByEmail(parentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Parent not found"));

        List<ParentChildLink> links = parentChildLinkRepository.findByParentIdAndStatus(parent.getId(), "ACTIVE");
        List<User> children = links.stream().map(ParentChildLink::getChild).collect(Collectors.toList());

        // Convert children to DTOs with real balances and limits
        List<ChildSummaryDto> childDtos = new ArrayList<>();
        BigDecimal totalChildrenBalance = BigDecimal.ZERO;

        for (User child : children) {
            Wallet w = walletRepository.findByUser(child).orElse(null);
            BigDecimal childBal = (w != null && w.getBalance() != null) ? w.getBalance() : BigDecimal.ZERO;
            totalChildrenBalance = totalChildrenBalance.add(childBal);

            childDtos.add(ChildSummaryDto.builder()
                    .id(child.getId())
                    .fullName(child.getFullName())
                    .email(child.getEmail())
                    .isActive(child.getIsActive())
                    .parentalControlEnabled(child.getParentalControlEnabled())
                    .parentalMaxTxnAmount(child.getParentalMaxTxnAmount())
                    .parentalDailyLimit(child.getParentalDailyLimit())
                    .parentalWeeklyLimit(child.getParentalWeeklyLimit())
                    .parentalMonthlyLimit(child.getParentalMonthlyLimit())
                    .parentalRestrictedCategories(child.getParentalRestrictedCategories())
                    .parentalBlockedMerchants(child.getParentalBlockedMerchants())
                    .walletBalance(childBal)
                    .createdAt(child.getCreatedAt())
                    .build());
        }

        // 2. Pocket money sent this calendar month
        Wallet parentWallet = walletRepository.findByUser(parent).orElse(null);
        BigDecimal totalPocketMoneySentThisMonth = BigDecimal.ZERO;
        if (parentWallet != null) {
            Instant startOfMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay(ZoneId.systemDefault()).toInstant();
            List<Transaction> parentTxns = transactionRepository.findByWalletIdOrderByCreatedAtDesc(parentWallet.getId());
            totalPocketMoneySentThisMonth = parentTxns.stream()
                    .filter(t -> t.getCreatedAt().isAfter(startOfMonth))
                    .filter(t -> "DEBIT".equals(t.getType()))
                    .filter(t -> "TRANSFER".equals(t.getCategory()))
                    .map(Transaction::getAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
        }

        // 3. Pending approvals count
        long pendingApprovalsCount = transactionApprovalRepository.findByParentIdAndStatusOrderByCreatedAtDesc(parent.getId(), "PENDING").size();

        // 4. Recent notifications (Recipient is Parent)
        List<Notification> notifications = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(parent.getId());
        List<ParentNotificationDto> notificationDtos = notifications.stream().limit(10).map(n -> ParentNotificationDto.builder()
                .id(n.getId())
                .type(n.getType() != null ? n.getType().name() : null)
                .title(n.getTitle())
                .message(n.getMessage())
                .isRead(n.getIsRead())
                .createdAt(n.getCreatedAt())
                .childId(n.getSender() != null ? n.getSender().getId() : null)
                .childName(n.getSender() != null ? n.getSender().getFullName() : null)
                .build()
        ).collect(Collectors.toList());

        // 5. Activity Timeline
        List<ActivityTimelineDto> timeline = new ArrayList<>();

        // Add child transactions to timeline
        for (User child : children) {
            Wallet cw = walletRepository.findByUser(child).orElse(null);
            if (cw != null) {
                List<Transaction> ctxns = transactionRepository.findByWalletIdOrderByCreatedAtDesc(cw.getId());
                for (Transaction t : ctxns.stream().limit(5).collect(Collectors.toList())) {
                    timeline.add(ActivityTimelineDto.builder()
                            .timestamp(t.getCreatedAt())
                            .type(t.getType().equals("DEBIT") ? "SPEND" : "TRANSFER")
                            .title(t.getType().equals("DEBIT") ? "Spend recorded" : "Received funds")
                            .description(String.format("%s at %s (%s)", t.getDescription(), t.getMerchant() != null ? t.getMerchant() : "Unknown", t.getCategory()))
                            .childId(child.getId())
                            .childName(child.getFullName())
                            .amount(t.getAmount())
                            .build());
                }
            }

            // Add child approvals
            List<TransactionApproval> approvals = transactionApprovalRepository.findByChildIdOrderByCreatedAtDesc(child.getId());
            for (TransactionApproval app : approvals.stream().limit(5).collect(Collectors.toList())) {
                timeline.add(ActivityTimelineDto.builder()
                        .timestamp(app.getCreatedAt())
                        .type(app.getStatus().equals("PENDING") ? "APPROVAL_REQUEST" : "APPROVAL_DECISION")
                        .title(app.getStatus().equals("PENDING") ? "Approval requested" : "Approval resolved")
                        .description(String.format("%s: %s (Status: %s)", app.getRequestType(), app.getDescription(), app.getStatus()))
                        .childId(child.getId())
                        .childName(child.getFullName())
                        .amount(app.getAmount())
                        .build());
            }
        }

        // Sort by timestamp descending and limit to 15
        timeline = timeline.stream()
                .sorted(Comparator.comparing(ActivityTimelineDto::getTimestamp).reversed())
                .limit(15)
                .collect(Collectors.toList());

        return ParentDashboardDto.builder()
                .children(childDtos)
                .totalChildrenBalance(totalChildrenBalance)
                .totalPocketMoneySentThisMonth(totalPocketMoneySentThisMonth)
                .parentWalletBalance(parentWallet != null && parentWallet.getBalance() != null ? parentWallet.getBalance() : BigDecimal.ZERO)
                .pendingApprovalsCount(pendingApprovalsCount)
                .recentNotifications(notificationDtos)
                .activityTimeline(timeline)
                .build();
    }

    public ChildDetailDto getChildDetails(String parentEmail, UUID childId) {
        User child = parentLinkService.getAuthorizedChild(parentEmail, childId);

        // Fetch wallet
        Wallet wallet = walletRepository.findByUser(child)
                .orElseThrow(() -> new ResourceNotFoundException("Child wallet not found"));

        // Fetch cards
        List<VirtualCard> cards = virtualCardRepository.findByUser(child).stream()
                .filter(c -> !"CANCELLED".equals(c.getStatus()))
                .collect(Collectors.toList());

        // Fetch goals
        List<WalletGoal> goals = walletGoalRepository.findByUser(child);

        // Fetch recent transactions (last 10)
        List<Transaction> txns = transactionRepository.findByWalletIdOrderByCreatedAtDesc(wallet.getId()).stream()
                .limit(10)
                .collect(Collectors.toList());

        ParentChildLink link = parentChildLinkRepository.findByParentIdAndChildId(
                userRepository.findByEmail(parentEmail).get().getId(), childId).get();

        com.fstpay.analytics.dto.AnalyticsResponse analytics = null;
        try {
            analytics = analyticsService.getAnalytics(child.getEmail(), 30);
        } catch (Exception e) {
            log.warn("Could not calculate spending analytics for child {}: {}", child.getEmail(), e.getMessage());
        }

        return ChildDetailDto.builder()
                .id(child.getId())
                .fullName(child.getFullName())
                .email(child.getEmail())
                .relationship(link.getRelationship())
                .parentalControlEnabled(child.getParentalControlEnabled())
                .parentalMaxTxnAmount(child.getParentalMaxTxnAmount())
                .parentalDailyLimit(child.getParentalDailyLimit())
                .parentalWeeklyLimit(child.getParentalWeeklyLimit())
                .parentalMonthlyLimit(child.getParentalMonthlyLimit())
                .parentalRestrictedCategories(child.getParentalRestrictedCategories())
                .parentalBlockedMerchants(child.getParentalBlockedMerchants())
                .walletBalance(wallet.getBalance())
                .walletCurrency(wallet.getCurrency())
                .virtualCards(cards)
                .activeGoals(goals)
                .recentTransactions(txns)
                .analytics(analytics)
                .build();
    }
}
