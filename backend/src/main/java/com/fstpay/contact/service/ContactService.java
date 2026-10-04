package com.fstpay.contact.service;

import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.contact.dto.ContactDtos.ContactResponse;
import com.fstpay.contact.dto.ContactDtos.CreateContactRequest;
import com.fstpay.contact.entity.UserContact;
import com.fstpay.contact.repository.UserContactRepository;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ContactService {

    private final UserContactRepository contactRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<ContactResponse> getContacts(String email) {
        User user = getUser(email);
        return contactRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public ContactResponse createContact(String email, CreateContactRequest request) {
        User user = getUser(email);

        String name = request.getName().trim();
        String upiId = request.getUpiId() != null && !request.getUpiId().trim().isEmpty() ? request.getUpiId().trim() : null;
        String phone = request.getPhone() != null && !request.getPhone().trim().isEmpty() ? request.getPhone().trim() : null;
        String acc = request.getAccountNumber() != null && !request.getAccountNumber().trim().isEmpty() ? request.getAccountNumber().trim() : null;
        String ifsc = request.getIfscCode() != null && !request.getIfscCode().trim().isEmpty() ? request.getIfscCode().trim().toUpperCase() : null;
        String bank = request.getBankName() != null && !request.getBankName().trim().isEmpty() ? request.getBankName().trim() : null;

        if (upiId == null && acc == null && phone == null) {
            throw new BadRequestException("At least one payment detail (UPI ID, Phone, or Account Number) must be provided");
        }

        UserContact contact = UserContact.builder()
                .user(user)
                .name(name)
                .upiId(upiId)
                .phone(phone)
                .accountNumber(acc)
                .ifscCode(ifsc)
                .bankName(bank)
                .build();

        UserContact saved = contactRepository.save(contact);
        return toResponse(saved);
    }

    @Transactional
    public void deleteContact(String email, String contactId) {
        User user = getUser(email);
        UUID uuid;
        try {
            uuid = UUID.fromString(contactId);
        } catch (IllegalArgumentException e) {
            throw new BadRequestException("Invalid contact ID format");
        }
        UserContact contact = contactRepository.findByIdAndUser(uuid, user)
                .orElseThrow(() -> new ResourceNotFoundException("Contact not found"));
        contactRepository.delete(contact);
    }

    private User getUser(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private ContactResponse toResponse(UserContact c) {
        return ContactResponse.builder()
                .id(c.getId() != null ? c.getId().toString() : null)
                .name(c.getName())
                .upiId(c.getUpiId())
                .phone(c.getPhone())
                .accountNumber(c.getAccountNumber())
                .ifscCode(c.getIfscCode())
                .bankName(c.getBankName())
                .createdAt(c.getCreatedAt())
                .build();
    }
}
