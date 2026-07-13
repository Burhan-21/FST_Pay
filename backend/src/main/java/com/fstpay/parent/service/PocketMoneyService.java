package com.fstpay.parent.service;

import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.parent.dto.PocketMoneyRequest;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.wallet.api.WalletOperations;
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
public class PocketMoneyService {

    private final ParentLinkService parentLinkService;
    private final UserRepository userRepository;
    private final WalletOperations walletService;

    @Transactional
    public void sendPocketMoney(String parentEmail, PocketMoneyRequest request) {
        UUID childId = request.getChildId();
        BigDecimal amount = request.getAmount().setScale(2, RoundingMode.HALF_UP);

        // 1. Validate parent-child link authorization
        User child = parentLinkService.getAuthorizedChild(parentEmail, childId);
        User parent = userRepository.findByEmail(parentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Parent not found"));

        // 2. Delegate transfer to WalletService
        String category = "TRANSFER";
        String description = String.format("Pocket money: %s", request.getNote() != null ? request.getNote() : "");
        String merchant = "FST Pay Family";

        walletService.transfer(parent, child, amount, category, description, merchant);

        log.info("Sent pocket money of ₹{} from parent {} to child {} using delegated WalletService.transfer()", 
                amount, parentEmail, child.getEmail());
    }
}
