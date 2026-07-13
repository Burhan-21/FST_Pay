package com.fstpay.wallet.application;

import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.common.event.PocketMoneyTransferredEvent;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.wallet.api.WalletOperations;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.repository.WalletRepository;
import com.fstpay.transaction.entity.Transaction;
import com.fstpay.transaction.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class WalletService implements WalletOperations {

    private static final BigDecimal MAX_TOPUP_AMOUNT = new BigDecimal("100000.00");
    private static final BigDecimal MIN_TOPUP_AMOUNT = new BigDecimal("1.00");
    private static final int MONEY_SCALE = 2;

    private final WalletRepository walletRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;
    private final WalletDailySummaryService walletDailySummaryService;
    private final ApplicationEventPublisher eventPublisher;

    @Override
    public Wallet getWalletByUserEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new BadRequestException("Email cannot be null or empty");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        return walletRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found"));
    }

    @Override
    @Transactional
    public Wallet topUp(String email, BigDecimal amount, String method) {
        if (amount == null) {
            throw new BadRequestException("Top-up amount cannot be null");
        }

        // Normalize the amount to 2 decimal places
        amount = amount.setScale(MONEY_SCALE, RoundingMode.HALF_UP);

        // Validate amount
        if (amount.compareTo(MIN_TOPUP_AMOUNT) < 0) {
            throw new BadRequestException("Top-up amount must be greater than or equal to " + MIN_TOPUP_AMOUNT);
        }
        
        if (amount.compareTo(MAX_TOPUP_AMOUNT) > 0) {
            throw new BadRequestException("Top-up amount cannot exceed " + MAX_TOPUP_AMOUNT);
        }

        Wallet wallet = getWalletByUserEmail(email);
        
        // Check for overflow (preventing wallet balance from exceeding reasonable limits)
        BigDecimal newBalance = wallet.getBalance().add(amount);
        if (newBalance.compareTo(new BigDecimal("999999999.99")) > 0) {
            throw new BadRequestException("Wallet balance would exceed maximum allowed amount");
        }

        wallet.setBalance(newBalance.setScale(MONEY_SCALE, RoundingMode.HALF_UP));
        Wallet savedWallet = walletRepository.save(wallet);

        // Record Credit Transaction
        String transactionMethod = method != null && !method.trim().isEmpty() 
            ? method.toUpperCase() 
            : "WALLET";
            
        Transaction transaction = Transaction.builder()
                .wallet(savedWallet)
                .type("CREDIT")
                .category("TOPUP")
                .amount(amount)
                .balanceAfter(savedWallet.getBalance())
                .description("Wallet top-up via " + transactionMethod)
                .merchant("Top-up via " + transactionMethod)
                .referenceId("TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .status("COMPLETED")
                .build();
        
        transactionRepository.save(transaction);

        // Update daily aggregates: track receive/topup
        walletDailySummaryService.trackReceive(savedWallet, amount);

        log.info("Top-up completed for wallet: {}, amount: {}, method: {}", 
                wallet.getId(), amount, transactionMethod);
        
        return savedWallet;
    }

    @Override
    @Transactional
    public String transfer(User fromUser, User toUser, BigDecimal amount, String category, String description, String merchant) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Transfer amount must be greater than zero");
        }
        amount = amount.setScale(MONEY_SCALE, RoundingMode.HALF_UP);

        Wallet fromWallet = walletRepository.findByUser(fromUser)
                .orElseThrow(() -> new ResourceNotFoundException("Sender wallet not found"));
        Wallet toWallet = walletRepository.findByUser(toUser)
                .orElseThrow(() -> new ResourceNotFoundException("Receiver wallet not found"));

        if (!fromWallet.getIsActive() || !toWallet.getIsActive()) {
            throw new BadRequestException("One or both wallets are inactive");
        }

        if (fromWallet.getBalance().compareTo(amount) < 0) {
            throw new BadRequestException("Insufficient wallet balance");
        }

        // Deduct/Add
        fromWallet.setBalance(fromWallet.getBalance().subtract(amount));
        toWallet.setBalance(toWallet.getBalance().add(amount));

        walletRepository.save(fromWallet);
        walletRepository.save(toWallet);

        // Generate shared reference ID
        String dateStr = java.time.LocalDate.now().toString().replace("-", "");
        String referenceId = "TRF-" + dateStr + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();

        // 1. Record Debit Transaction
        Transaction debitTxn = Transaction.builder()
                .wallet(fromWallet)
                .type("DEBIT")
                .category(category)
                .amount(amount)
                .balanceAfter(fromWallet.getBalance())
                .description(description)
                .merchant(merchant)
                .referenceId(referenceId + "-D")
                .status("COMPLETED")
                .build();
        transactionRepository.save(debitTxn);

        // 2. Record Credit Transaction
        Transaction creditTxn = Transaction.builder()
                .wallet(toWallet)
                .type("CREDIT")
                .category(category)
                .amount(amount)
                .balanceAfter(toWallet.getBalance())
                .description(description)
                .merchant(merchant)
                .referenceId(referenceId + "-C")
                .status("COMPLETED")
                .build();
        transactionRepository.save(creditTxn);

        // 3. Update cached daily aggregates
        walletDailySummaryService.trackSent(fromWallet, amount);
        walletDailySummaryService.trackReceive(toWallet, amount);

        // 4. Publish Domain Event
        eventPublisher.publishEvent(new PocketMoneyTransferredEvent(this, fromUser, toUser, amount, referenceId, description));

        log.info("Wallet transfer of ₹{} complete. Ref: {}", amount, referenceId);
        return referenceId;
    }
}
