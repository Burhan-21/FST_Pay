package com.fstpay.transaction.service;

import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.transaction.dto.SplitPaymentRequest;
import com.fstpay.transaction.entity.SplitPayment;
import com.fstpay.transaction.entity.Transaction;
import com.fstpay.transaction.repository.SplitPaymentRepository;
import com.fstpay.transaction.repository.TransactionRepository;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SplitPaymentService {

    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;
    private final SplitPaymentRepository splitPaymentRepository;

    @Transactional
    public SplitPayment executeSplitPayment(String email, SplitPaymentRequest request) {
        if (request.getTotalAmount() == null || request.getTotalAmount().compareTo(BigDecimal.ONE) < 0) {
            throw new BadRequestException("Total amount must be at least ₹1.00");
        }
        if (request.getSplitCount() == null || request.getSplitCount() < 2) {
            throw new BadRequestException("Split count must be at least 2 people");
        }

        BigDecimal total = request.getTotalAmount().setScale(2, RoundingMode.HALF_UP);
        int count = request.getSplitCount();
        BigDecimal perPerson = total.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
        BigDecimal userShare = (request.getUserShare() != null && request.getUserShare().compareTo(BigDecimal.ZERO) > 0)
                ? request.getUserShare().setScale(2, RoundingMode.HALF_UP)
                : perPerson;

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        Wallet wallet = walletRepository.findByUser(user)
                .orElseThrow(() -> new ResourceNotFoundException("Wallet not found"));

        if (!Boolean.TRUE.equals(wallet.getIsActive())) {
            throw new BadRequestException("Wallet is inactive");
        }

        if (wallet.getBalance().compareTo(userShare) < 0) {
            throw new BadRequestException("Insufficient balance for your share of ₹" + userShare + ". Available: ₹" + wallet.getBalance());
        }

        BigDecimal newBalance = wallet.getBalance().subtract(userShare).setScale(2, RoundingMode.HALF_UP);
        wallet.setBalance(newBalance);
        Wallet savedWallet = walletRepository.save(wallet);

        String note = request.getNote() != null ? request.getNote().trim() : "";
        String desc = !note.isEmpty()
                ? note + " (Split 1 of " + count + ")"
                : "Split bill (" + count + " people) at " + request.getMerchant();

        Transaction transaction = Transaction.builder()
                .wallet(savedWallet)
                .type("DEBIT")
                .category(request.getCategory() != null && !request.getCategory().trim().isEmpty() ? request.getCategory() : "FOOD")
                .amount(userShare)
                .balanceAfter(savedWallet.getBalance())
                .description(desc)
                .merchant(request.getMerchant())
                .referenceId("SPL-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .status("COMPLETED")
                .build();

        Transaction savedTxn = transactionRepository.save(transaction);

        SplitPayment splitPayment = SplitPayment.builder()
                .user(user)
                .transaction(savedTxn)
                .totalAmount(total)
                .splitCount(count)
                .userShare(userShare)
                .perPersonAmount(perPerson)
                .merchant(request.getMerchant())
                .note(note)
                .status("COMPLETED")
                .build();

        SplitPayment savedSplit = splitPaymentRepository.save(splitPayment);
        log.info("Split payment executed successfully: user={}, total={}, share={}, count={}",
                email, total, userShare, count);

        return savedSplit;
    }

    public List<SplitPayment> getUserSplitPayments(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return splitPaymentRepository.findByUserOrderByCreatedAtDesc(user);
    }
}
