package com.fstpay.wallet.service;

import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.repository.WalletRepository;
import com.fstpay.transaction.entity.Transaction;
import com.fstpay.transaction.repository.TransactionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class WalletService {

    private static final BigDecimal MAX_TOPUP_AMOUNT = new BigDecimal("100000.00");
    private static final BigDecimal MIN_TOPUP_AMOUNT = new BigDecimal("1.00");
    private static final int MONEY_SCALE = 2;

    private final WalletRepository walletRepository;
    private final UserRepository userRepository;
    private final TransactionRepository transactionRepository;

    public Wallet getWalletByUserEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            throw new BadRequestException("Email cannot be null or empty");
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        
        return walletRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found"));
    }

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

        log.info("Top-up completed for wallet: {}, amount: {}, method: {}", 
                wallet.getId(), amount, transactionMethod);
        
        return savedWallet;
    }
}
