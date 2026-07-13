package com.fstpay.transaction.service;

import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.common.rule.TransactionRuleEngine;
import com.fstpay.transaction.dto.SimulateSpendRequest;
import com.fstpay.transaction.entity.Transaction;
import com.fstpay.transaction.repository.TransactionRepository;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.repository.WalletRepository;
import com.fstpay.wallet.service.WalletDailySummaryService;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
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
    private final WalletDailySummaryService summaryService;

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

        // Evaluate all rules via Rule Engine
        ruleEngine.process(user, wallet, request);

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

        Transaction savedTxn = transactionRepository.save(transaction);

        // Track spend daily aggregate
        summaryService.trackSpend(savedWallet, request.getAmount());

        log.info("Simulated spend of ₹{} from user {} completed successfully", request.getAmount(), email);
        return savedTxn;
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
