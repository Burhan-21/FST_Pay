package com.fstpay.admin.service;

import com.fstpay.admin.dto.AdminStatsResponse;
import com.fstpay.card.repository.VirtualCardRepository;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.transaction.entity.Transaction;
import com.fstpay.transaction.repository.TransactionRepository;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.wallet.repository.WalletRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final VirtualCardRepository virtualCardRepository;
    private final WalletRepository walletRepository;
    private final TransactionRepository transactionRepository;

    public AdminStatsResponse getStats() {
        return AdminStatsResponse.builder()
                .totalUsers(userRepository.count())
                .activeCards(virtualCardRepository.countActiveCards())
                .totalWalletBalance(walletRepository.sumAllBalances())
                .totalTransactions(transactionRepository.count())
                .totalVolume(transactionRepository.sumAllAmounts())
                .build();
    }

    public Page<User> getUsers(int page, int size) {
        return userRepository.findAll(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @Transactional
    public User toggleUserActive(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        user.setIsActive(!user.getIsActive());
        log.info("Admin toggled active state for user {}: new active = {}", user.getEmail(), user.getIsActive());
        return userRepository.save(user);
    }

    public Page<Transaction> getAllTransactions(int page, int size) {
        return transactionRepository.findAll(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
    }
}
