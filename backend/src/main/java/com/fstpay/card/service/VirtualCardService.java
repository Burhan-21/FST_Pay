package com.fstpay.card.service;

import com.fstpay.card.dto.CreateCardRequest;
import com.fstpay.card.dto.UpdateLimitRequest;
import com.fstpay.card.entity.VirtualCard;
import com.fstpay.card.repository.VirtualCardRepository;
import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class VirtualCardService {

    private final VirtualCardRepository virtualCardRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom random = new SecureRandom();

    public List<VirtualCard> getCardsByUserEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return virtualCardRepository.findByUser(user).stream()
                .filter(c -> !"CANCELLED".equals(c.getStatus()))
                .collect(java.util.stream.Collectors.toList());
    }

    @Transactional
    public VirtualCard createCard(String email, CreateCardRequest request) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        // Generate virtual card properties
        String cardNumber = generateCardNumber();
        LocalDate expiryDate = LocalDate.now().plusYears(3); // 3 years expiry
        String rawCvv = String.format("%03d", random.nextInt(1000));
        String cvvHash = passwordEncoder.encode(rawCvv);

        VirtualCard card = VirtualCard.builder()
                .user(user)
                .cardNumber(cardNumber)
                .cardHolder(request.getCardHolder() != null ? request.getCardHolder() : user.getFullName())
                .expiryMonth(expiryDate.getMonthValue())
                .expiryYear(expiryDate.getYear())
                .cvvHash(cvvHash)
                .cardType("PREPAID")
                .status("ACTIVE")
                .spendingLimit(request.getSpendingLimit() != null ? request.getSpendingLimit() : new BigDecimal("50000.00"))
                .dailyLimit(request.getDailyLimit() != null ? request.getDailyLimit() : new BigDecimal("10000.00"))
                .isOneTime(request.getIsOneTime() != null ? request.getIsOneTime() : false)
                .merchantLock(request.getMerchantLock())
                .cardDesign(request.getCardDesign())
                .build();

        return virtualCardRepository.save(card);
    }

    @Transactional
    public VirtualCard freezeCard(String email, UUID cardId) {
        VirtualCard card = getCardForUser(email, cardId);
        card.setStatus("FROZEN");
        return virtualCardRepository.save(card);
    }

    @Transactional
    public VirtualCard unfreezeCard(String email, UUID cardId) {
        VirtualCard card = getCardForUser(email, cardId);
        card.setStatus("ACTIVE");
        return virtualCardRepository.save(card);
    }

    @Transactional
    public VirtualCard updateLimits(String email, UUID cardId, UpdateLimitRequest request) {
        VirtualCard card = getCardForUser(email, cardId);
        card.setSpendingLimit(request.getSpendingLimit());
        card.setDailyLimit(request.getDailyLimit());
        return virtualCardRepository.save(card);
    }

    @Transactional
    public void deleteCard(String email, UUID cardId) {
        VirtualCard card = getCardForUser(email, cardId);
        // Soft delete/cancel
        card.setStatus("CANCELLED");
        virtualCardRepository.save(card);
    }

    @Transactional
    public VirtualCard updateDesign(String email, UUID cardId, String cardDesign) {
        VirtualCard card = getCardForUser(email, cardId);
        card.setCardDesign(cardDesign);
        return virtualCardRepository.save(card);
    }

    private VirtualCard getCardForUser(String email, UUID cardId) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return virtualCardRepository.findByIdAndUser(cardId, user)
                .orElseThrow(() -> new ResourceNotFoundException("Virtual card not found"));
    }

    private String generateCardNumber() {
        // Generate a valid-looking 16-digit card number starting with 4 (Visa) or 5 (Mastercard)
        StringBuilder sb = new StringBuilder("4532"); // Sample BIN
        for (int i = 0; i < 12; i++) {
            sb.append(random.nextInt(10));
        }
        return sb.toString();
    }
}
