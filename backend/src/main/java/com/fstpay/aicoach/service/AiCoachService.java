package com.fstpay.aicoach.service;

import com.fstpay.aicoach.dto.ChatRequest;
import com.fstpay.aicoach.dto.ChatResponse;
import com.fstpay.aicoach.dto.HealthScoreResponse;
import com.fstpay.aicoach.dto.ForecastResponse;
import com.fstpay.aicoach.dto.BudgetPlanningResponse;
import com.fstpay.aicoach.dto.AiBudgetAnomalyDto;
import com.fstpay.common.event.AiBudgetAnomalyEvent;
import com.fstpay.aicoach.entity.AiSession;
import com.fstpay.aicoach.repository.AiSessionRepository;
import com.fstpay.aicoach.provider.AiProvider;
import com.fstpay.aicoach.provider.GeminiProvider;
import com.fstpay.aicoach.provider.OpenAiProvider;
import com.fstpay.aicoach.provider.FallbackProvider;
import com.fstpay.aicoach.strategy.TipStrategy;
import com.fstpay.notification.enums.NotificationType;
import com.fstpay.notification.service.NotificationService;
import org.springframework.context.ApplicationEventPublisher;
import java.time.Instant;
import com.fstpay.analytics.dto.AnalyticsResponse;
import com.fstpay.analytics.service.AnalyticsService;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.goal.entity.WalletGoal;
import com.fstpay.goal.repository.WalletGoalRepository;
import com.fstpay.reward.entity.RewardPoints;
import com.fstpay.reward.repository.RewardPointsRepository;
import com.fstpay.transaction.entity.Transaction;
import com.fstpay.transaction.repository.TransactionRepository;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AiCoachService {

    private final AiSessionRepository aiSessionRepository;
    private final UserRepository userRepository;
    private final AnalyticsService analyticsService;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final WalletGoalRepository walletGoalRepository;
    private final RewardPointsRepository rewardPointsRepository;

    private final GeminiProvider geminiProvider;
    private final OpenAiProvider openAiProvider;
    private final FallbackProvider fallbackProvider;
    private final List<TipStrategy> tipStrategies;
    private final io.micrometer.core.instrument.MeterRegistry meterRegistry;
    private final NotificationService notificationService;
    private final ApplicationEventPublisher eventPublisher;

    @Value("${ai.provider:gemini}")
    private String aiProvider;

    @Transactional
    public ChatResponse chat(String email, ChatRequest request) {
        User user = getUserByEmail(email);

        String userMsg = request.getMessage().trim();
        String context = buildFinancialContext(email);
        String conversationHistory = buildConversationHistory(email);
        
        // Select provider
        AiProvider activeProvider = selectProvider();
        
        // Increment AI requests metric with provider tag
        meterRegistry.counter("fstpay.ai.requests.total", "provider", activeProvider.getClass().getSimpleName().replace("Provider", "")).increment();

        String reply = activeProvider.generateReply(userMsg, user.getFullName(), context, conversationHistory);

        if (reply == null || reply.isEmpty()) {
            reply = fallbackProvider.generateReply(userMsg, user.getFullName(), context, conversationHistory);
        }

        AiSession session = AiSession.builder()
                .user(user)
                .prompt(userMsg)
                .response(reply)
                .tokensUsed(estimateTokens(userMsg) + estimateTokens(reply))
                .build();
        aiSessionRepository.save(session);

        return ChatResponse.builder()
                .reply(reply)
                .build();
    }

    public HealthScoreResponse getHealthScore(String email) {
        User user = getUserByEmail(email);
        Wallet wallet = walletRepository.findByUser(user).orElse(null);
        BigDecimal balance = wallet != null ? wallet.getBalance() : BigDecimal.ZERO;

        AnalyticsResponse analytics = analyticsService.getAnalytics(email, 30);
        List<WalletGoal> goals = walletGoalRepository.findByUser(user);
        RewardPoints points = rewardPointsRepository.findByUser(user).orElse(null);

        // 1. Savings Rate (30 pts)
        int savingsPoints = 0;
        BigDecimal income = analytics.getTotalCredit();
        if (income.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal rate = analytics.getNetSavings().divide(income, 4, RoundingMode.HALF_UP);
            if (rate.compareTo(new BigDecimal("0.20")) >= 0) {
                savingsPoints = 30;
            } else if (rate.compareTo(BigDecimal.ZERO) > 0) {
                savingsPoints = rate.multiply(new BigDecimal("150")).intValue(); // scale rate/0.20 * 30
            }
        }

        // 2. Expense Ratio (25 pts)
        int expensePoints = 0;
        if (income.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal spendRatio = analytics.getTotalDebit().divide(income, 4, RoundingMode.HALF_UP);
            if (spendRatio.compareTo(new BigDecimal("0.50")) <= 0) {
                expensePoints = 25;
            } else if (spendRatio.compareTo(BigDecimal.ONE) < 0) {
                // scale linearly from 50% to 100%
                expensePoints = BigDecimal.ONE.subtract(spendRatio)
                        .divide(new BigDecimal("0.50"), 4, RoundingMode.HALF_UP)
                        .multiply(new BigDecimal("25")).intValue();
            }
        }

        // 3. Budget Adherence (20 pts)
        int budgetPoints = 10; // base points
        BigDecimal totalSpend = analytics.getTotalDebit();
        if (totalSpend.compareTo(BigDecimal.ZERO) > 0 && analytics.getSpendByCategory() != null) {
            BigDecimal needsSpend = BigDecimal.ZERO;
            BigDecimal wantsSpend = BigDecimal.ZERO;

            for (Map.Entry<String, BigDecimal> entry : analytics.getSpendByCategory().entrySet()) {
                String cat = entry.getKey().toUpperCase();
                if (isNeedCategory(cat)) {
                    needsSpend = needsSpend.add(entry.getValue());
                } else {
                    wantsSpend = wantsSpend.add(entry.getValue());
                }
            }

            BigDecimal needsRatio = needsSpend.divide(totalSpend, 4, RoundingMode.HALF_UP);
            BigDecimal wantsRatio = wantsSpend.divide(totalSpend, 4, RoundingMode.HALF_UP);

            // Give full points if within guidelines: Needs <= 55%, Wants <= 35%
            if (needsRatio.compareTo(new BigDecimal("0.55")) <= 0) budgetPoints += 5;
            if (wantsRatio.compareTo(new BigDecimal("0.35")) <= 0) budgetPoints += 5;
        }

        // 4. Savings Streak (10 pts)
        int streakPoints = 0;
        if (points != null) {
            streakPoints = Math.min(points.getStreakDays() * 2, 10); // 2 pts per day, max 10
        }

        // 5. Goals Progress (10 pts)
        int goalsPoints = 0;
        if (!goals.isEmpty()) {
            BigDecimal totalProgress = BigDecimal.ZERO;
            int activeGoalsCount = 0;
            for (WalletGoal goal : goals) {
                if ("ACTIVE".equals(goal.getStatus())) {
                    activeGoalsCount++;
                    BigDecimal progress = goal.getCurrentAmount().divide(goal.getTargetAmount(), 4, RoundingMode.HALF_UP);
                    totalProgress = totalProgress.add(progress);
                }
            }
            if (activeGoalsCount > 0) {
                goalsPoints = totalProgress.divide(new BigDecimal(activeGoalsCount), 4, RoundingMode.HALF_UP)
                        .multiply(new BigDecimal("10")).intValue();
            } else {
                goalsPoints = 10; // completed or no active goals is a plus
            }
        } else {
            goalsPoints = 5; // default starting score
        }

        // 6. Payment Consistency (5 pts)
        int consistencyPoints = 0;
        List<Transaction> txns = transactionRepository.findTop5ByWalletOrderByCreatedAtDesc(wallet);
        if (txns != null) {
            consistencyPoints = Math.min(txns.size() * 1, 5); // 1 pt per recent transaction, max 5
        }

        int score = savingsPoints + expensePoints + budgetPoints + streakPoints + goalsPoints + consistencyPoints;
        score = Math.min(Math.max(score, 0), 100);

        String rating = "FAIR";
        String description = "Keep building healthy money habits! Focus on saving at least 15% of your income.";
        if (score >= 80) {
            rating = "EXCELLENT";
            description = "Superb financial management! Your savings rate, goal progress, and budget adherence are optimal.";
        } else if (score >= 60) {
            rating = "GOOD";
            description = "Good progress! Try automated savings rules to save 5-10% of every pocket money top-up.";
        } else if (score < 40) {
            rating = "POOR";
            description = "Your expenses are high compared to savings. Try the 24-hour rule before buying non-essentials.";
        }

        Map<String, Integer> breakdown = Map.of(
                "savingsRate", savingsPoints,
                "expenseRatio", expensePoints,
                "budgetAdherence", budgetPoints,
                "streak", streakPoints,
                "goalsProgress", goalsPoints,
                "consistency", consistencyPoints
        );

        return HealthScoreResponse.builder()
                .score(score)
                .rating(rating)
                .description(description)
                .breakdown(breakdown)
                .build();
    }

    public List<String> getPersonalizedTips(String email) {
        User user = getUserByEmail(email);
        Wallet wallet = walletRepository.findByUser(user).orElse(null);
        AnalyticsResponse analytics = analyticsService.getAnalytics(email, 30);
        List<WalletGoal> goals = walletGoalRepository.findByUser(user);

        List<String> tips = new ArrayList<>();
        for (TipStrategy strategy : tipStrategies) {
            if (strategy.applies(wallet, analytics, goals)) {
                tips.add(strategy.generateTip(wallet, analytics, goals));
            }
        }

        // Always add at least one general tip if none matched
        if (tips.isEmpty()) {
            tips.add("💡 Try the 50/30/20 rule: Allocate 50% for Needs, 30% for Wants, and 20% directly to your Savings Goals!");
        }

        return tips.stream().limit(3).collect(Collectors.toList());
    }

    public ForecastResponse getForecast(String email) {
        User user = getUserByEmail(email);
        Wallet wallet = walletRepository.findByUser(user).orElse(null);

        // Compute average daily spend over last 30 days
        AnalyticsResponse analytics = analyticsService.getAnalytics(email, 30);
        BigDecimal totalSpend = analytics.getTotalDebit();
        BigDecimal dailyAvg = analytics.getDailyAverageSpend();

        if (dailyAvg.compareTo(BigDecimal.ZERO) <= 0) {
            dailyAvg = new BigDecimal("100.00"); // default projection
        }

        List<ForecastResponse.ForecastPoint> points = new ArrayList<>();
        BigDecimal cumulative = BigDecimal.ZERO;
        LocalDate now = LocalDate.now();

        for (int i = 1; i <= 30; i++) {
            cumulative = cumulative.add(dailyAvg).setScale(2, RoundingMode.HALF_UP);
            points.add(ForecastResponse.ForecastPoint.builder()
                    .label(now.plusDays(i).getMonth().toString().substring(0,3) + " " + now.plusDays(i).getDayOfMonth())
                    .predictedCumulativeSpend(cumulative)
                    .build());
        }

        return ForecastResponse.builder()
                .points(points)
                .modelUsed("Linear Trend Spend Projection")
                .build();
    }

    public BudgetPlanningResponse getBudgetPlan(String email) {
        AnalyticsResponse analytics = analyticsService.getAnalytics(email, 30);

        BigDecimal income = analytics.getTotalCredit();
        BigDecimal spending = analytics.getTotalDebit();

        // Recommended 50/30/20 based on income (or a baseline of 10000)
        BigDecimal baseIncome = income.compareTo(BigDecimal.ZERO) > 0 ? income : new BigDecimal("10000.00");
        Map<String, BigDecimal> recommended = Map.of(
                "Needs", baseIncome.multiply(new BigDecimal("0.50")).setScale(2, RoundingMode.HALF_UP),
                "Wants", baseIncome.multiply(new BigDecimal("0.30")).setScale(2, RoundingMode.HALF_UP),
                "Savings", baseIncome.multiply(new BigDecimal("0.20")).setScale(2, RoundingMode.HALF_UP)
        );

        // Actual allocations
        BigDecimal needsSpend = BigDecimal.ZERO;
        BigDecimal wantsSpend = BigDecimal.ZERO;

        if (analytics.getSpendByCategory() != null) {
            for (Map.Entry<String, BigDecimal> entry : analytics.getSpendByCategory().entrySet()) {
                String cat = entry.getKey().toUpperCase();
                if (isNeedCategory(cat)) {
                    needsSpend = needsSpend.add(entry.getValue());
                } else {
                    wantsSpend = wantsSpend.add(entry.getValue());
                }
            }
        }

        Map<String, BigDecimal> actual = Map.of(
                "Needs", needsSpend.setScale(2, RoundingMode.HALF_UP),
                "Wants", wantsSpend.setScale(2, RoundingMode.HALF_UP),
                "Savings", analytics.getNetSavings().compareTo(BigDecimal.ZERO) > 0 
                        ? analytics.getNetSavings().setScale(2, RoundingMode.HALF_UP) 
                        : BigDecimal.ZERO
        );

        return BudgetPlanningResponse.builder()
                .totalIncome(income)
                .totalSpending(spending)
                .recommendedAllocation(recommended)
                .actualAllocation(actual)
                .build();
    }

    public List<AiBudgetAnomalyDto> detectAnomalies(String email) {
        User user = getUserByEmail(email);
        Wallet wallet = walletRepository.findByUser(user).orElse(null);
        BigDecimal balance = wallet != null ? wallet.getBalance() : BigDecimal.ZERO;

        AnalyticsResponse analytics30 = analyticsService.getAnalytics(email, 30);
        AnalyticsResponse analytics7 = analyticsService.getAnalytics(email, 7);
        List<WalletGoal> goals = walletGoalRepository.findByUser(user);

        List<AiBudgetAnomalyDto> anomalies = new ArrayList<>();
        Instant now = Instant.now();

        // 1. Category Spike Anomaly
        if (analytics7.getSpendByCategory() != null && analytics30.getSpendByCategory() != null) {
            for (Map.Entry<String, BigDecimal> entry : analytics7.getSpendByCategory().entrySet()) {
                String cat = entry.getKey();
                BigDecimal weekSpend = entry.getValue();
                BigDecimal monthSpend = analytics30.getSpendByCategory().getOrDefault(cat, BigDecimal.ZERO);
                BigDecimal weeklyBaseline = monthSpend.divide(new BigDecimal("4.0"), 2, RoundingMode.HALF_UP);

                if (weekSpend.compareTo(new BigDecimal("500.00")) >= 0) {
                    BigDecimal threshold = weeklyBaseline.multiply(new BigDecimal("1.50"));
                    if (weeklyBaseline.compareTo(BigDecimal.ZERO) == 0 || weekSpend.compareTo(threshold) > 0) {
                        String severity = weekSpend.compareTo(weeklyBaseline.multiply(new BigDecimal("2.00"))) > 0 ? "ALERT" : "WARNING";
                        BigDecimal pctAbove = weeklyBaseline.compareTo(BigDecimal.ZERO) > 0
                                ? weekSpend.subtract(weeklyBaseline).divide(weeklyBaseline, 2, RoundingMode.HALF_UP).multiply(new BigDecimal("100"))
                                : new BigDecimal("100");

                        anomalies.add(AiBudgetAnomalyDto.builder()
                                .anomalyType("CATEGORY_SPIKE")
                                .severity(severity)
                                .category(cat)
                                .currentAmount(weekSpend)
                                .baselineAmount(weeklyBaseline)
                                .title(String.format("%s Spending Spike Detected", cat))
                                .message(String.format("You spent ₹%.2f on %s in the last 7 days, which is %.0f%% above your weekly baseline of ₹%.2f.",
                                        weekSpend, cat, pctAbove, weeklyBaseline))
                                .actionableAdvice(String.format("Consider pausing discretionary %s purchases or setting a ₹%.2f weekly cap.", cat, weeklyBaseline))
                                .detectedAt(now)
                                .build());
                    }
                }
            }
        }

        // 2. Wants vs Needs Imbalance
        BigDecimal totalWeekSpend = analytics7.getTotalDebit();
        if (totalWeekSpend != null && totalWeekSpend.compareTo(new BigDecimal("500.00")) > 0 && analytics7.getSpendByCategory() != null) {
            BigDecimal wantsSpend = BigDecimal.ZERO;
            for (Map.Entry<String, BigDecimal> entry : analytics7.getSpendByCategory().entrySet()) {
                if (!isNeedCategory(entry.getKey())) {
                    wantsSpend = wantsSpend.add(entry.getValue());
                }
            }
            BigDecimal wantsRatio = wantsSpend.divide(totalWeekSpend, 2, RoundingMode.HALF_UP);
            if (wantsRatio.compareTo(new BigDecimal("0.50")) > 0) {
                anomalies.add(AiBudgetAnomalyDto.builder()
                        .anomalyType("WANTS_IMBALANCE")
                        .severity("WARNING")
                        .category("WANTS")
                        .currentAmount(wantsSpend)
                        .baselineAmount(totalWeekSpend.multiply(new BigDecimal("0.30")).setScale(2, RoundingMode.HALF_UP))
                        .title("High Non-Essential Spending")
                        .message(String.format("Non-essential purchases (Wants) accounted for %.0f%% of your spending this week (₹%.2f of ₹%.2f). Recommended ceiling is 30%%.",
                                wantsRatio.multiply(new BigDecimal("100")), wantsSpend, totalWeekSpend))
                        .actionableAdvice("Apply the 24-hour rule before buying non-essential items to divert at least 20% into savings.")
                        .detectedAt(now)
                        .build());
            }
        }

        // 3. Goal At Risk
        if (goals != null) {
            for (WalletGoal goal : goals) {
                if ("ACTIVE".equalsIgnoreCase(goal.getStatus()) && goal.getTargetDate() != null && goal.getTargetAmount() != null) {
                    long daysRemaining = ChronoUnit.DAYS.between(LocalDate.now(), goal.getTargetDate());
                    BigDecimal progress = goal.getCurrentAmount().divide(goal.getTargetAmount(), 2, RoundingMode.HALF_UP);

                    if (daysRemaining <= 14 && progress.compareTo(new BigDecimal("0.70")) < 0) {
                        anomalies.add(AiBudgetAnomalyDto.builder()
                                .anomalyType("GOAL_AT_RISK")
                                .severity("WARNING")
                                .category("SAVINGS")
                                .currentAmount(goal.getCurrentAmount())
                                .baselineAmount(goal.getTargetAmount())
                                .title(String.format("Goal '%s' at Risk", goal.getName()))
                                .message(String.format("Goal '%s' has only %d days left until %s, but you've saved %.0f%% (₹%.2f of ₹%.2f).",
                                        goal.getName(), daysRemaining, goal.getTargetDate(), progress.multiply(new BigDecimal("100")),
                                        goal.getCurrentAmount(), goal.getTargetAmount()))
                                .actionableAdvice(String.format("Allocate ₹%.2f from your next wallet top-up to stay on track for your target date.",
                                        goal.getTargetAmount().subtract(goal.getCurrentAmount())))
                                .detectedAt(now)
                                .build());
                    }
                }
            }
        }

        // 4. Burn-Rate Risk
        BigDecimal dailyAvg = analytics7.getDailyAverageSpend();
        if (dailyAvg != null && dailyAvg.compareTo(new BigDecimal("50.00")) > 0 && balance.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal daysUntilExhaustion = balance.divide(dailyAvg, 1, RoundingMode.HALF_UP);
            if (daysUntilExhaustion.compareTo(new BigDecimal("7.0")) < 0) {
                anomalies.add(AiBudgetAnomalyDto.builder()
                        .anomalyType("BURN_RATE_RISK")
                        .severity("ALERT")
                        .category("WALLET")
                        .currentAmount(balance)
                        .baselineAmount(dailyAvg.multiply(new BigDecimal("7.0")).setScale(2, RoundingMode.HALF_UP))
                        .title("Wallet Depletion Risk")
                        .message(String.format("At your current burn rate of ₹%.2f/day, your remaining wallet balance of ₹%.2f may only last %s days.",
                                dailyAvg, balance, daysUntilExhaustion))
                        .actionableAdvice("Reduce daily discretionary spending or request pocket money top-up before balance hits zero.")
                        .detectedAt(now)
                        .build());
            }
        }

        return anomalies;
    }

    @Transactional
    public List<AiBudgetAnomalyDto> runProactiveScan(String email) {
        User user = getUserByEmail(email);
        List<AiBudgetAnomalyDto> anomalies = detectAnomalies(email);

        for (AiBudgetAnomalyDto anomaly : anomalies) {
            notificationService.sendNotification(
                    user,
                    null,
                    NotificationType.AI_INSIGHT,
                    anomaly.getTitle(),
                    anomaly.getMessage() + " Tip: " + anomaly.getActionableAdvice()
            );

            eventPublisher.publishEvent(AiBudgetAnomalyEvent.create(
                    user.getId(),
                    user.getEmail(),
                    anomaly.getAnomalyType(),
                    anomaly.getCategory(),
                    anomaly.getSeverity(),
                    anomaly.getCurrentAmount(),
                    anomaly.getBaselineAmount(),
                    anomaly.getTitle(),
                    anomaly.getMessage(),
                    anomaly.getActionableAdvice(),
                    anomaly.getDetectedAt()
            ));
        }

        return anomalies;
    }

    private AiProvider selectProvider() {
        if ("gemini".equalsIgnoreCase(aiProvider) && geminiProvider.isAvailable()) {
            return geminiProvider;
        }
        if ("openai".equalsIgnoreCase(aiProvider) && openAiProvider.isAvailable()) {
            return openAiProvider;
        }
        return fallbackProvider;
    }

    private String buildFinancialContext(String email) {
        User user = getUserByEmail(email);
        Wallet wallet = walletRepository.findByUser(user).orElse(null);
        BigDecimal balance = wallet != null ? wallet.getBalance() : BigDecimal.ZERO;

        AnalyticsResponse analytics = analyticsService.getAnalytics(email, 30);
        List<Transaction> recentTxns = transactionRepository.findTop5ByWalletOrderByCreatedAtDesc(wallet);

        StringBuilder ctx = new StringBuilder();
        ctx.append("User Financial Profile:\n");
        ctx.append("- Name: ").append(user.getFullName()).append("\n");
        ctx.append("- Wallet Balance: ₹").append(balance.setScale(2, RoundingMode.HALF_UP)).append("\n");
        ctx.append("- 30-Day Income: ₹").append(analytics.getTotalCredit().setScale(2, RoundingMode.HALF_UP)).append("\n");
        ctx.append("- 30-Day Spending: ₹").append(analytics.getTotalDebit().setScale(2, RoundingMode.HALF_UP)).append("\n");
        ctx.append("- 30-Day Net Savings: ₹").append(analytics.getNetSavings().setScale(2, RoundingMode.HALF_UP)).append("\n");
        ctx.append("- Daily Average Spend: ₹").append(analytics.getDailyAverageSpend().setScale(2, RoundingMode.HALF_UP)).append("\n");

        if (analytics.getSpendByCategory() != null && !analytics.getSpendByCategory().isEmpty()) {
            ctx.append("- Spending by Category:\n");
            analytics.getSpendByCategory().entrySet().stream()
                    .sorted(Map.Entry.<String, BigDecimal>comparingByValue().reversed())
                    .forEach(entry ->
                        ctx.append("  * ").append(entry.getKey()).append(": ₹")
                            .append(entry.getValue().setScale(2, RoundingMode.HALF_UP)).append("\n")
                    );
        }

        if (recentTxns != null && !recentTxns.isEmpty()) {
            ctx.append("- Recent Transactions:\n");
            recentTxns.forEach(txn ->
                ctx.append("  * ").append(txn.getCreatedAt()).append(" | ")
                    .append(txn.getType()).append(" | ₹")
                    .append(txn.getAmount().setScale(2, RoundingMode.HALF_UP))
                    .append(" | ").append(txn.getCategory())
                    .append(txn.getMerchant() != null ? " | " + txn.getMerchant() : "")
                    .append("\n")
            );
        }

        return ctx.toString();
    }

    private String buildConversationHistory(String email) {
        User user = getUserByEmail(email);
        List<AiSession> recentSessions = aiSessionRepository
                .findByUser(user, PageRequest.of(0, 5))
                .getContent();

        if (recentSessions.isEmpty()) {
            return "";
        }

        StringBuilder history = new StringBuilder("Recent Conversation History:\n");
        for (int i = recentSessions.size() - 1; i >= 0; i--) {
            AiSession session = recentSessions.get(i);
            history.append("User: ").append(session.getPrompt()).append("\n");
            history.append("Coach: ").append(session.getResponse()).append("\n");
        }
        return history.toString();
    }

    private boolean isNeedCategory(String category) {
        String cat = category.toUpperCase();
        return "BILL".equals(cat) || "UTILITIES".equals(cat) || "TRANSPORT".equals(cat) || 
               "EDUCATION".equals(cat) || "GROCERY".equals(cat);
    }

    private User getUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private int estimateTokens(String text) {
        if (text == null || text.isEmpty()) return 0;
        return text.length() / 4;
    }
}
