package com.fstpay.transaction.service;

import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.transaction.dto.SimulateSpendRequest;
import com.fstpay.transaction.entity.Transaction;
import com.fstpay.transaction.repository.TransactionRepository;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.repository.WalletRepository;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TransactionService {

    private final TransactionRepository transactionRepository;
    private final WalletRepository walletRepository;
    private final UserRepository userRepository;

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
    public Transaction simulateSpend(String email, SimulateSpendRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        Wallet wallet = walletRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found"));

        if (!wallet.getIsActive()) {
            throw new BadRequestException("Wallet is inactive");
        }

        if (wallet.getBalance().compareTo(request.getAmount()) < 0) {
            throw new BadRequestException("Insufficient wallet balance");
        }

        // Parental Control Checks
        if (user.getParentalControlEnabled() != null && user.getParentalControlEnabled()) {
            if (user.getParentalMaxTxnAmount() != null && user.getParentalMaxTxnAmount().compareTo(java.math.BigDecimal.ZERO) > 0) {
                if (request.getAmount().compareTo(user.getParentalMaxTxnAmount()) > 0) {
                    throw new BadRequestException("Blocked by parental control: Exceeds max transaction limit of ₹" + user.getParentalMaxTxnAmount());
                }
            }
            if (user.getParentalRestrictedCategories() != null && !user.getParentalRestrictedCategories().trim().isEmpty()) {
                String reqCategory = request.getCategory().toUpperCase().trim();
                String[] restrictedList = user.getParentalRestrictedCategories().split(",");
                for (String restricted : restrictedList) {
                    if (restricted.trim().equalsIgnoreCase(reqCategory)) {
                        throw new BadRequestException("Blocked by parental control: Access restricted to category " + reqCategory);
                    }
                }
            }
        }

        // Deduct balance
        wallet.setBalance(wallet.getBalance().subtract(request.getAmount()));
        Wallet savedWallet = walletRepository.save(wallet);

        // Record debit transaction
        Transaction transaction = Transaction.builder()
                .wallet(savedWallet)
                .type("DEBIT")
                .category(request.getCategory().toUpperCase())
                .amount(request.getAmount())
                .balanceAfter(savedWallet.getBalance())
                .description(request.getDescription())
                .merchant(request.getMerchant())
                .referenceId("TXN-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .status("COMPLETED")
                .build();

        return transactionRepository.save(transaction);
    }
}
