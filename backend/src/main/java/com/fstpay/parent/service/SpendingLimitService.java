package com.fstpay.parent.service;

import com.fstpay.parent.dto.SetSpendingLimitRequest;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class SpendingLimitService {

    private final ParentLinkService parentLinkService;
    private final UserRepository userRepository;

    @Transactional
    public User setSpendingLimits(String parentEmail, UUID childId, SetSpendingLimitRequest request) {
        // Authenticate link
        User child = parentLinkService.getAuthorizedChild(parentEmail, childId);

        if (request.getParentalControlEnabled() != null) {
            child.setParentalControlEnabled(request.getParentalControlEnabled());
        }

        if (request.getMaxTxnAmount() != null) {
            if (request.getMaxTxnAmount().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Maximum transaction amount cannot be negative");
            }
            child.setParentalMaxTxnAmount(request.getMaxTxnAmount());
        }

        if (request.getDailyLimit() != null) {
            if (request.getDailyLimit().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Daily spending limit cannot be negative");
            }
            child.setParentalDailyLimit(request.getDailyLimit());
        }

        if (request.getWeeklyLimit() != null) {
            if (request.getWeeklyLimit().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Weekly spending limit cannot be negative");
            }
            child.setParentalWeeklyLimit(request.getWeeklyLimit());
        }

        if (request.getMonthlyLimit() != null) {
            if (request.getMonthlyLimit().compareTo(BigDecimal.ZERO) < 0) {
                throw new IllegalArgumentException("Monthly spending limit cannot be negative");
            }
            child.setParentalMonthlyLimit(request.getMonthlyLimit());
        }

        if (request.getRestrictedCategories() != null) {
            // Standardize restricted categories
            String categories = request.getRestrictedCategories().toUpperCase().trim();
            child.setParentalRestrictedCategories(categories);
        }

        if (request.getBlockedMerchants() != null) {
            // Standardize blocked merchants
            String merchants = request.getBlockedMerchants().toUpperCase().trim();
            child.setParentalBlockedMerchants(merchants);
        }

        User updatedChild = userRepository.save(child);
        log.info("Updated parental controls for child {}: Enabled={}, MaxTxn={}, Daily={}, Weekly={}, Monthly={}, Categories={}",
                child.getEmail(),
                updatedChild.getParentalControlEnabled(),
                updatedChild.getParentalMaxTxnAmount(),
                updatedChild.getParentalDailyLimit(),
                updatedChild.getParentalWeeklyLimit(),
                updatedChild.getParentalMonthlyLimit(),
                updatedChild.getParentalRestrictedCategories());

        return updatedChild;
    }
}
