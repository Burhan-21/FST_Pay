package com.fstpay.report.service;

import com.fstpay.aicoach.dto.HealthScoreResponse;
import com.fstpay.aicoach.service.AiCoachService;
import com.fstpay.goal.entity.WalletGoal;
import com.fstpay.goal.repository.WalletGoalRepository;
import com.fstpay.notification.service.EmailProvider;
import com.fstpay.transaction.entity.Transaction;
import com.fstpay.transaction.repository.TransactionRepository;
import com.fstpay.user.entity.User;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.repository.WalletRepository;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
public class MonthlyReportService {

    private static final DateTimeFormatter MONTH_FORMATTER = DateTimeFormatter
            .ofPattern("MMMM yyyy")
            .withZone(ZoneId.systemDefault());

    private final TransactionRepository transactionRepository;
    private final WalletRepository walletRepository;
    private final WalletGoalRepository walletGoalRepository;
    private final AiCoachService aiCoachService;
    private final EmailProvider emailProvider;

    public MonthlyReportService(
            TransactionRepository transactionRepository,
            WalletRepository walletRepository,
            WalletGoalRepository walletGoalRepository,
            @Lazy AiCoachService aiCoachService,
            EmailProvider emailProvider
    ) {
        this.transactionRepository = transactionRepository;
        this.walletRepository = walletRepository;
        this.walletGoalRepository = walletGoalRepository;
        this.aiCoachService = aiCoachService;
        this.emailProvider = emailProvider;
    }

    public byte[] generateMonthlyReportPdf(User user, Instant startPeriod, Instant endPeriod) {
        Wallet wallet = walletRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Wallet not found"));

        List<Transaction> transactions = transactionRepository.findByWalletIdAndCreatedAtBetween(
                wallet.getId(), startPeriod, endPeriod
        );

        List<WalletGoal> goals = walletGoalRepository.findByUser(user);
        HealthScoreResponse healthScore = null;
        List<String> coachTips = new ArrayList<>();
        try {
            healthScore = aiCoachService.getHealthScore(user.getEmail());
            coachTips = aiCoachService.getPersonalizedTips(user.getEmail());
        } catch (Exception e) {
            log.error("Could not fetch health score/tips for report: {}", e.getMessage());
        }

        Document document = new Document(PageSize.A4, 36, 36, 54, 36);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Colors
            Color primaryColor = new Color(32, 112, 255);    // #2070FF
            Color secondaryColor = new Color(124, 58, 237); // AI Accent: #7C3AED
            Color darkColor = new Color(14, 23, 38);       // Dark: #0E1726
            Color successColor = new Color(34, 197, 94);   // Success: #22C55E
            Color errorColor = new Color(239, 68, 68);     // Error: #EF4444

            // Fonts
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 24, primaryColor);
            Font subtitleFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.GRAY);
            Font sectionTitleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, darkColor);
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, darkColor);
            Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK);
            Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.GRAY);

            // 1. Header Banner
            Paragraph brandTitle = new Paragraph("FST Pay", titleFont);
            brandTitle.setAlignment(Element.ALIGN_LEFT);
            document.add(brandTitle);

            String periodStr = MONTH_FORMATTER.format(startPeriod);
            Paragraph reportTitle = new Paragraph("Monthly Financial Statement — " + periodStr, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, darkColor));
            reportTitle.setSpacingAfter(15);
            document.add(reportTitle);

            // 2. Summary Table
            PdfPTable summaryTable = new PdfPTable(2);
            summaryTable.setWidthPercentage(100);
            summaryTable.setSpacingAfter(20);

            PdfPCell summaryHeader = new PdfPCell(new Paragraph("MEMBER SUMMARY", sectionTitleFont));
            summaryHeader.setBorder(Rectangle.NO_BORDER);
            summaryHeader.setColspan(2);
            summaryHeader.setPaddingBottom(8);
            summaryTable.addCell(summaryHeader);

            summaryTable.addCell(createLabelValueCell("Teen Name:", user.getFullName(), boldFont, regularFont));
            summaryTable.addCell(createLabelValueCell("Wallet Reference:", wallet.getId().toString(), boldFont, regularFont));
            summaryTable.addCell(createLabelValueCell("Registered Email:", user.getEmail(), boldFont, regularFont));
            summaryTable.addCell(createLabelValueCell("Current Wallet Balance:", "INR " + wallet.getBalance(), boldFont, regularFont));

            document.add(summaryTable);

            // 3. Calculation & Stats cards
            BigDecimal totalCredits = BigDecimal.ZERO;
            BigDecimal totalDebits = BigDecimal.ZERO;
            for (Transaction txn : transactions) {
                if ("CREDIT".equalsIgnoreCase(txn.getType())) {
                    totalCredits = totalCredits.add(txn.getAmount());
                } else if ("DEBIT".equalsIgnoreCase(txn.getType())) {
                    totalDebits = totalDebits.add(txn.getAmount());
                }
            }

            PdfPTable statsTable = new PdfPTable(3);
            statsTable.setWidthPercentage(100);
            statsTable.setSpacingAfter(20);

            PdfPCell statsHeader = new PdfPCell(new Paragraph("MONTHLY ACTIVITY SUMMARY", sectionTitleFont));
            statsHeader.setBorder(Rectangle.NO_BORDER);
            statsHeader.setColspan(3);
            statsHeader.setPaddingBottom(8);
            statsTable.addCell(statsHeader);

            statsTable.addCell(createSummaryCard("Total Income", "INR " + totalCredits, successColor));
            statsTable.addCell(createSummaryCard("Total Expenses", "INR " + totalDebits, errorColor));
            statsTable.addCell(createSummaryCard("Net Savings", "INR " + totalCredits.subtract(totalDebits), primaryColor));

            document.add(statsTable);

            // 4. Financial Health Score section (If available)
            if (healthScore != null) {
                PdfPTable healthTable = new PdfPTable(1);
                healthTable.setWidthPercentage(100);
                healthTable.setSpacingAfter(20);

                PdfPCell healthHeader = new PdfPCell(new Paragraph("AI FINANCIAL COACH DIAGNOSTICS", sectionTitleFont));
                healthHeader.setBorder(Rectangle.NO_BORDER);
                healthHeader.setPaddingBottom(8);
                healthTable.addCell(healthHeader);

                String ratingString = healthScore.getRating() + " (" + healthScore.getScore() + "/100)";
                PdfPCell scoreCard = new PdfPCell();
                scoreCard.setBackgroundColor(new Color(243, 244, 246));
                scoreCard.setBorderColor(new Color(209, 213, 219));
                scoreCard.setPadding(10);

                Paragraph ratingPara = new Paragraph("Overall Financial Health Rating: ", boldFont);
                ratingPara.add(new Chunk(ratingString, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, secondaryColor)));
                scoreCard.addElement(ratingPara);

                if (!coachTips.isEmpty()) {
                    Paragraph tipsTitle = new Paragraph("\nCoach Recommendations:", boldFont);
                    scoreCard.addElement(tipsTitle);
                    for (String tip : coachTips) {
                        Paragraph tipItem = new Paragraph("• " + tip, regularFont);
                        scoreCard.addElement(tipItem);
                    }
                }
                healthTable.addCell(scoreCard);
                document.add(healthTable);
            }

            // 5. Savings Goals Progress
            if (!goals.isEmpty()) {
                PdfPTable goalsTable = new PdfPTable(4);
                goalsTable.setWidthPercentage(100);
                goalsTable.setSpacingAfter(20);
                goalsTable.setWidths(new float[]{4.0f, 2.5f, 2.5f, 2.0f});

                PdfPCell goalsHeader = new PdfPCell(new Paragraph("SAVINGS GOALS PROGRESS", sectionTitleFont));
                goalsHeader.setBorder(Rectangle.NO_BORDER);
                goalsHeader.setColspan(4);
                goalsHeader.setPaddingBottom(8);
                goalsTable.addCell(goalsHeader);

                String[] gHeaders = {"Goal Name", "Target Amount", "Current Savings", "Status"};
                for (String h : gHeaders) {
                    PdfPCell cell = new PdfPCell(new Paragraph(h, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9, Color.WHITE)));
                    cell.setBackgroundColor(darkColor);
                    cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                    cell.setPadding(5);
                    goalsTable.addCell(cell);
                }

                for (WalletGoal goal : goals) {
                    goalsTable.addCell(new PdfPCell(new Paragraph(goal.getName(), regularFont)));
                    goalsTable.addCell(new PdfPCell(new Paragraph("₹" + goal.getTargetAmount(), regularFont)));
                    goalsTable.addCell(new PdfPCell(new Paragraph("₹" + goal.getCurrentAmount(), boldFont)));
                    goalsTable.addCell(new PdfPCell(new Paragraph(goal.getStatus(), regularFont)));
                }
                document.add(goalsTable);
            }

            // Footer / Disclaimer
            Paragraph disclaimer = new Paragraph("FST Pay Monthly Statements are generated automatically. If you notice any discrepancy, please contact support@fstpay.com immediately.", smallFont);
            disclaimer.setAlignment(Element.ALIGN_CENTER);
            disclaimer.setSpacingBefore(30);
            document.add(disclaimer);

            document.close();
        } catch (Exception e) {
            log.error("Failed to generate monthly report PDF", e);
        }

        return out.toByteArray();
    }

    public void sendMonthlyReportEmail(User user) {
        Instant now = Instant.now();
        Instant oneMonthAgo = now.minus(30, ChronoUnit.DAYS);

        byte[] pdfBytes = generateMonthlyReportPdf(user, oneMonthAgo, now);
        String periodStr = MONTH_FORMATTER.format(oneMonthAgo);

        String htmlBody = """
                <html>
                <body style="font-family: Arial, sans-serif; color: #0E1726; line-height: 1.6;">
                  <div style="max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #E5E7EB; border-radius: 8px;">
                    <h2 style="color: #2070FF; margin-bottom: 5px;">FST Pay Statement</h2>
                    <p style="color: #6B7280; font-size: 14px; margin-top: 0;">%s Statement Report</p>
                    
                    <p>Hi <strong>%s</strong>,</p>
                    <p>Your monthly financial statement from FST Pay is ready! We have compiled your balance summary, active savings goals progress, and AI Financial Coach diagnostics for the past 30 days.</p>
                    
                    <div style="background-color: #F9FAFB; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #2070FF;">
                      <p style="margin: 5px 0;"><strong>Period:</strong> %s</p>
                      <p style="margin: 5px 0;"><strong>Attached File:</strong> fstpay_monthly_report_%s.pdf</p>
                    </div>
                    
                    <p>Please find the detailed PDF document attached to this email. Sticking to a budget and logging saving goals are core habits for building healthy finance skills.</p>
                    <p>Keep up the great work!</p>
                    
                    <hr style="border: 0; border-top: 1px solid #E5E7EB; margin: 20px 0;" />
                    <p style="font-size: 11px; color: #9CA3AF; text-align: center;">FST Pay • Spend Smart. Save Smart. Grow Smart.</p>
                  </div>
                </body>
                </html>
                """.formatted(
                periodStr,
                user.getFullName(),
                periodStr,
                periodStr.replace(" ", "_")
        );

        String subject = "Your FST Pay Monthly Statement - " + periodStr;
        String filename = "FSTPay_Statement_" + periodStr.replace(" ", "_") + ".pdf";

        emailProvider.sendHtmlWithAttachment(user.getEmail(), subject, htmlBody, pdfBytes, filename);
    }

    private PdfPCell createLabelValueCell(String label, String value, Font labelFont, Font valueFont) {
        Paragraph p = new Paragraph();
        p.add(new Chunk(label + " ", labelFont));
        p.add(new Chunk(value != null ? value : "", valueFont));
        PdfPCell cell = new PdfPCell(p);
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(4);
        return cell;
    }

    private PdfPCell createSummaryCard(String label, String value, Color color) {
        PdfPCell cell = new PdfPCell();
        cell.setBackgroundColor(new Color(249, 250, 251));
        cell.setBorderWidth(1);
        cell.setBorderColor(new Color(229, 231, 235));
        cell.setPadding(8);

        Paragraph labelPara = new Paragraph(label, FontFactory.getFont(FontFactory.HELVETICA, 8, Color.GRAY));
        cell.addElement(labelPara);

        Paragraph valuePara = new Paragraph(value, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, color));
        valuePara.setSpacingBefore(4);
        cell.addElement(valuePara);

        return cell;
    }
}
