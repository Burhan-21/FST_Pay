package com.fstpay.transaction.service;

import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.common.rule.TransactionRuleEngine;
import com.fstpay.transaction.dto.SimulateSpendRequest;
import com.fstpay.transaction.entity.Transaction;
import com.fstpay.transaction.repository.TransactionRepository;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.repository.WalletRepository;
import com.fstpay.wallet.api.WalletDailySummaryOperations;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.fx.dto.FxConversionQuote;
import com.fstpay.fx.service.FxRateService;
import com.fstpay.parent.policy.ParentalControlPolicy;
import com.fstpay.parent.policy.ParentalPolicyResult;
import com.fstpay.transaction.dto.SpendSimulationResult;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final WalletRepository walletRepository;
    private final UserRepository userRepository;
    private final TransactionExportService transactionExportService;
    private final TransactionRuleEngine ruleEngine;
    private final WalletDailySummaryOperations summaryService;
    private final ParentalControlPolicy parentalControlPolicy;
    private final FxRateService fxRateService;

    public Page<Transaction> getTransactions(String email, String category, String type, int page, int size) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Wallet wallet = walletRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found"));

        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        
        String normCategory = (category == null || category.equalsIgnoreCase("ALL")) ? null : category.toUpperCase();
        String normType = (type == null || type.equalsIgnoreCase("ALL")) ? null : type.toUpperCase();

        return transactionRepository.findFiltered(wallet.getId(), normCategory, normType, pageable);
    }

    public Transaction getTransactionById(String email, UUID id) {
        Transaction transaction = transactionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Transaction not found"));

        if (!transaction.getWallet().getUser().getEmail().equals(email)) {
            throw new BadRequestException("Unauthorized access to transaction");
        }

        return transaction;
    }

    @Transactional
    public SpendSimulationResult simulateSpend(String email, SimulateSpendRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Wallet wallet = walletRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found"));

        // FX Currency Conversion: if requested currency differs from wallet currency, convert & add FX fee
        BigDecimal chargeAmount = request.getAmount();
        BigDecimal originalAmount = null;
        String originalCurrency = null;
        BigDecimal fxRate = null;
        BigDecimal fxFee = null;
        String description = request.getDescription();

        String reqCurrency = (request.getCurrency() != null && !request.getCurrency().trim().isEmpty())
                ? request.getCurrency().trim().toUpperCase()
                : wallet.getCurrency();

        if (!reqCurrency.equalsIgnoreCase(wallet.getCurrency())) {
            FxConversionQuote quote = fxRateService.getQuote(request.getAmount(), reqCurrency, wallet.getCurrency());
            chargeAmount = quote.getTotalAmount();
            originalAmount = quote.getSourceAmount();
            originalCurrency = quote.getSourceCurrency();
            fxRate = quote.getExchangeRate();
            fxFee = quote.getFeeAmount();

            String descPrefix = (description != null && !description.isBlank()) 
                    ? description 
                    : "Spend at " + request.getMerchant();
            description = String.format("%s (Converted: %s %.2f @ %.4f + %s %.2f FX fee)",
                    descPrefix, originalCurrency, originalAmount, fxRate, wallet.getCurrency(), fxFee);

            log.info("FX conversion applied for user {}: {} {} -> {} {} (fee: {})",
                    email, originalAmount, originalCurrency, chargeAmount, wallet.getCurrency(), fxFee);
        }

        // Validate wallet balance against the final domestic charge amount
        if (wallet.getBalance().compareTo(chargeAmount) < 0) {
            throw new BadRequestException(String.format(
                    "Insufficient wallet balance. Available: %s %.2f, Required: %s %.2f",
                    wallet.getCurrency(), wallet.getBalance(), wallet.getCurrency(), chargeAmount
            ));
        }

        // Evaluate base rules (BalanceRule, CardStatusRule)
        ruleEngine.process(user, wallet, request);

        // Evaluate Parental Control Policy against final charge amount
        ParentalPolicyResult policyResult = parentalControlPolicy.evaluate(
                user, wallet, chargeAmount, request.getCategory(), request.getMerchant(), description
        );

        if (policyResult.isRejected()) {
            throw new BadRequestException(policyResult.getReason());
        }

        if (policyResult.isRequiresApproval()) {
            log.info("Simulated spend of {} {} for user {} queued for parent approval: {}",
                    wallet.getCurrency(), chargeAmount, email, policyResult.getReason());
            return SpendSimulationResult.pendingApproval(policyResult.getApproval(), policyResult.getReason());
        }

        // Deduct balance
        wallet.setBalance(wallet.getBalance().subtract(chargeAmount));
        Wallet savedWallet = walletRepository.save(wallet);

        // Record debit transaction with FX metadata
        Transaction transaction = Transaction.builder()
                .wallet(savedWallet)
                .type("DEBIT")
                .category(request.getCategory().toUpperCase())
                .amount(chargeAmount)
                .balanceAfter(savedWallet.getBalance())
                .description(description)
                .merchant(request.getMerchant())
                .referenceId("TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .status("COMPLETED")
                .originalAmount(originalAmount)
                .originalCurrency(originalCurrency)
                .fxRate(fxRate)
                .fxFee(fxFee)
                .build();

        Transaction savedTxn = transactionRepository.save(transaction);

        // Track spend daily aggregate
        summaryService.trackSpend(savedWallet, chargeAmount);

        log.info("Simulated spend of {} {} from user {} completed successfully", wallet.getCurrency(), chargeAmount, email);
        return SpendSimulationResult.completed(savedTxn, "Transaction simulated successfully");
    }

    public String exportTransactionsCsv(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Wallet wallet = walletRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found"));
        List<Transaction> transactions = transactionRepository.findByWalletIdOrderByCreatedAtDesc(wallet.getId());
        return transactionExportService.exportToCsv(transactions, user, wallet);
    }

    public java.io.ByteArrayInputStream exportTransactionsPdf(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Wallet wallet = walletRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found"));
        List<Transaction> transactions = transactionRepository.findByWalletIdOrderByCreatedAtDesc(wallet.getId());
        return transactionExportService.exportToPdf(transactions, user, wallet);
    }
}
