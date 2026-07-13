package com.fstpay.transaction.service;

import com.fstpay.transaction.entity.Transaction;
import com.fstpay.user.entity.User;
import com.fstpay.wallet.entity.Wallet;
import com.lowagie.text.*;
import com.lowagie.text.Font;
import com.lowagie.text.pdf.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
public class TransactionExportService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter
            .ofPattern("yyyy-MM-dd HH:mm:ss")
            .withZone(ZoneId.systemDefault());

    /**
     * Generates a CSV string representing the transaction log.
     */
    public String exportToCsv(List<Transaction> transactions, User user, Wallet wallet) {
        StringBuilder csv = new StringBuilder();
        // CSV Header
        csv.append("Transaction ID,Date/Time,Type,Category,Amount (INR),Balance After (INR),Merchant,Description,Reference ID,Status\n");

        for (Transaction txn : transactions) {
            csv.append(escapeCsvField(txn.getId().toString())).append(",")
               .append(escapeCsvField(DATE_FORMATTER.format(txn.getCreatedAt()))).append(",")
               .append(escapeCsvField(txn.getType())).append(",")
               .append(escapeCsvField(txn.getCategory())).append(",")
               .append(txn.getAmount()).append(",")
               .append(txn.getBalanceAfter()).append(",")
               .append(escapeCsvField(txn.getMerchant())).append(",")
               .append(escapeCsvField(txn.getDescription())).append(",")
               .append(escapeCsvField(txn.getReferenceId())).append(",")
               .append(escapeCsvField(txn.getStatus())).append("\n");
        }
        return csv.toString();
    }

    /**
     * Generates a PDF byte stream representing the transaction log.
     */
    public ByteArrayInputStream exportToPdf(List<Transaction> transactions, User user, Wallet wallet) {
        Document document = new Document(PageSize.A4, 36, 36, 54, 36);
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        try {
            PdfWriter.getInstance(document, out);
            document.open();

            // Font configurations
            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, new Color(32, 112, 255)); // Primary: #2070FF
            Font sectionHeaderFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, new Color(14, 23, 38)); // Dark: #0E1726
            Font boldFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, new Color(14, 23, 38));
            Font regularFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK);
            Font smallFont = FontFactory.getFont(FontFactory.HELVETICA, 8, Color.GRAY);

            // 1. Header Banner
            Paragraph brandTitle = new Paragraph("FST Pay", titleFont);
            brandTitle.setAlignment(Element.ALIGN_LEFT);
            document.add(brandTitle);

            Paragraph tagline = new Paragraph("Fast. Secure. Trusted. Payments.", FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 10, Color.GRAY));
            tagline.setSpacingAfter(15);
            document.add(tagline);

            // 2. User & Wallet Details
            PdfPTable infoTable = new PdfPTable(2);
            infoTable.setWidthPercentage(100);
            infoTable.setSpacingAfter(20);

            PdfPCell cellLeft = new PdfPCell(new Paragraph("ACCOUNT SUMMARY", sectionHeaderFont));
            cellLeft.setBorder(Rectangle.NO_BORDER);
            cellLeft.setColspan(2);
            cellLeft.setPaddingBottom(8);
            infoTable.addCell(cellLeft);

            // Details
            infoTable.addCell(createLabelValueCell("Account Holder:", user.getFullName(), boldFont, regularFont));
            infoTable.addCell(createLabelValueCell("Wallet ID:", wallet.getId().toString(), boldFont, regularFont));
            infoTable.addCell(createLabelValueCell("Email Address:", user.getEmail(), boldFont, regularFont));
            infoTable.addCell(createLabelValueCell("Current Balance:", "INR " + wallet.getBalance(), boldFont, regularFont));
            
            document.add(infoTable);

            // Calculate Period Summary
            BigDecimal totalCredits = BigDecimal.ZERO;
            BigDecimal totalDebits = BigDecimal.ZERO;
            for (Transaction txn : transactions) {
                if ("CREDIT".equalsIgnoreCase(txn.getType())) {
                    totalCredits = totalCredits.add(txn.getAmount());
                } else if ("DEBIT".equalsIgnoreCase(txn.getType())) {
                    totalDebits = totalDebits.add(txn.getAmount());
                }
            }

            // 3. Stats Table
            PdfPTable statsTable = new PdfPTable(3);
            statsTable.setWidthPercentage(100);
            statsTable.setSpacingAfter(20);

            PdfPCell statsCellHeader = new PdfPCell(new Paragraph("PERIOD SUMMARY", sectionHeaderFont));
            statsCellHeader.setBorder(Rectangle.NO_BORDER);
            statsCellHeader.setColspan(3);
            statsCellHeader.setPaddingBottom(8);
            statsTable.addCell(statsCellHeader);

            statsTable.addCell(createSummaryCard("Total Received (Credits)", "INR " + totalCredits, new Color(34, 197, 94))); // Success: #22C55E
            statsTable.addCell(createSummaryCard("Total Spent (Debits)", "INR " + totalDebits, new Color(239, 68, 68))); // Error: #EF4444
            statsTable.addCell(createSummaryCard("Net Activity", "INR " + totalCredits.subtract(totalDebits), new Color(32, 112, 255)));

            document.add(statsTable);

            // 4. Transaction List Table
            float[] columnWidths = {2.5f, 4.5f, 2.5f, 2.0f, 2.2f, 2.3f};
            PdfPTable table = new PdfPTable(6);
            table.setWidthPercentage(100);
            table.setWidths(columnWidths);

            // Header columns
            String[] headers = {"Date/Time", "Merchant / Description", "Category", "Type", "Amount", "Balance After"};
            for (String header : headers) {
                PdfPCell cell = new PdfPCell(new Paragraph(header, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.WHITE)));
                cell.setBackgroundColor(new Color(14, 23, 38)); // Dark: #0E1726
                cell.setHorizontalAlignment(Element.ALIGN_CENTER);
                cell.setPadding(6);
                table.addCell(cell);
            }

            // Data rows
            for (Transaction txn : transactions) {
                // Date
                PdfPCell dateCell = new PdfPCell(new Paragraph(DATE_FORMATTER.format(txn.getCreatedAt()), smallFont));
                dateCell.setPadding(5);
                dateCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                table.addCell(dateCell);

                // Merchant & Desc
                String desc = txn.getDescription() != null ? txn.getDescription() : "";
                Paragraph descText = new Paragraph(txn.getMerchant() + "\n" + desc, smallFont);
                PdfPCell descCell = new PdfPCell(descText);
                descCell.setPadding(5);
                table.addCell(descCell);

                // Category
                PdfPCell catCell = new PdfPCell(new Paragraph(txn.getCategory(), smallFont));
                catCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                catCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                catCell.setPadding(5);
                table.addCell(catCell);

                // Type
                boolean isCredit = "CREDIT".equalsIgnoreCase(txn.getType());
                Paragraph typeText = new Paragraph(txn.getType(), FontFactory.getFont(FontFactory.HELVETICA_BOLD, 8, isCredit ? new Color(34, 197, 94) : new Color(239, 68, 68)));
                PdfPCell typeCell = new PdfPCell(typeText);
                typeCell.setHorizontalAlignment(Element.ALIGN_CENTER);
                typeCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                typeCell.setPadding(5);
                table.addCell(typeCell);

                // Amount
                PdfPCell amtCell = new PdfPCell(new Paragraph("₹" + txn.getAmount(), boldFont));
                amtCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                amtCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                amtCell.setPadding(5);
                table.addCell(amtCell);

                // Balance After
                PdfPCell balCell = new PdfPCell(new Paragraph("₹" + txn.getBalanceAfter(), regularFont));
                balCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
                balCell.setVerticalAlignment(Element.ALIGN_MIDDLE);
                balCell.setPadding(5);
                table.addCell(balCell);
            }

            document.add(table);

            // 5. Footer Page Info
            Paragraph footer = new Paragraph("\nGenerated automatically by FST Pay Platform. Confidential & Secure.", smallFont);
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);

            document.close();
        } catch (DocumentException e) {
            log.error("Error creating PDF transaction export", e);
        }

        return new ByteArrayInputStream(out.toByteArray());
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
        cell.setBackgroundColor(new Color(245, 247, 250));
        cell.setBorderWidth(1);
        cell.setBorderColor(new Color(220, 224, 230));
        cell.setPadding(8);

        Paragraph labelPara = new Paragraph(label, FontFactory.getFont(FontFactory.HELVETICA, 8, Color.GRAY));
        cell.addElement(labelPara);

        Paragraph valuePara = new Paragraph(value, FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, color));
        valuePara.setSpacingBefore(4);
        cell.addElement(valuePara);

        return cell;
    }

    private String escapeCsvField(String field) {
        if (field == null) {
            return "";
        }
        String escaped = field.replace("\"", "\"\"");
        if (escaped.contains(",") || escaped.contains("\n") || escaped.contains("\"")) {
            return "\"" + escaped + "\"";
        }
        return escaped;
    }
}
