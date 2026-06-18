package com.fstpay.user.service;

import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.user.dto.ChildSummaryDto;
import com.fstpay.user.dto.PasswordChangeDto;
import com.fstpay.user.dto.UserUpdateDto;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public User getProfile(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @Transactional
    public User updateProfile(String email, UserUpdateDto dto) {
        User user = getProfile(email);

        if (dto.getFullName() != null) {
            user.setFullName(dto.getFullName());
        }
        if (dto.getPhone() != null) {
            user.setPhone(dto.getPhone());
        }
        if (dto.getDateOfBirth() != null) {
            user.setDateOfBirth(dto.getDateOfBirth());
        }
        if (dto.getAvatarUrl() != null) {
            user.setAvatarUrl(dto.getAvatarUrl());
        }

        return userRepository.save(user);
    }

    @Transactional
    public void changePassword(String email, PasswordChangeDto dto) {
        User user = getProfile(email);

        if (!passwordEncoder.matches(dto.getCurrentPassword(), user.getPasswordHash())) {
            throw new BadRequestException("Current password does not match");
        }

        user.setPasswordHash(passwordEncoder.encode(dto.getNewPassword()));
        user.setIsActive(true); // Ensure user remains active
        userRepository.save(user);
    }

    @Transactional
    public User updateParentalControl(String email, com.fstpay.user.dto.ParentalControlDto dto) {
        User user = getProfile(email);

        if (dto.getParentalControlEnabled() != null) {
            user.setParentalControlEnabled(dto.getParentalControlEnabled());
        }
        if (dto.getParentalMaxTxnAmount() != null) {
            user.setParentalMaxTxnAmount(dto.getParentalMaxTxnAmount());
        }
        if (dto.getParentalRestrictedCategories() != null) {
            user.setParentalRestrictedCategories(dto.getParentalRestrictedCategories());
        }
        if (dto.getParentalPin() != null && !dto.getParentalPin().isEmpty()) {
            user.setParentalPin(passwordEncoder.encode(dto.getParentalPin()));
        }
        if (dto.getParentName() != null) {
            user.setParentName(dto.getParentName());
        }
        if (dto.getParentEmail() != null) {
            user.setParentEmail(dto.getParentEmail());
        }
        if (dto.getParentPhone() != null) {
            user.setParentPhone(dto.getParentPhone());
        }
        if (dto.getParentDob() != null) {
            user.setParentDob(dto.getParentDob());
        }
        if (dto.getParentGender() != null) {
            user.setParentGender(dto.getParentGender());
        }
        if (dto.getParentAge() != null) {
            user.setParentAge(dto.getParentAge());
        }

        return userRepository.save(user);
    }

    public List<ChildSummaryDto> getChildrenByParentEmail(String parentEmail) {
        List<User> children = userRepository.findByParentEmail(parentEmail);
        return children.stream().map(child -> ChildSummaryDto.builder()
                .id(child.getId())
                .fullName(child.getFullName())
                .email(child.getEmail())
                .isActive(child.getIsActive())
                .parentalControlEnabled(child.getParentalControlEnabled())
                .parentalMaxTxnAmount(child.getParentalMaxTxnAmount())
                .parentalRestrictedCategories(child.getParentalRestrictedCategories())
                .createdAt(child.getCreatedAt())
                .build()
        ).collect(Collectors.toList());
    }
}
