package com.fstpay.contact.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

public class ContactDtos {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class CreateContactRequest {
        @NotBlank(message = "Contact name is required")
        @Size(max = 100, message = "Name cannot exceed 100 characters")
        private String name;

        @Size(max = 100, message = "UPI ID cannot exceed 100 characters")
        private String upiId;

        @Size(max = 20, message = "Phone number cannot exceed 20 characters")
        private String phone;

        @Size(max = 30, message = "Account number cannot exceed 30 characters")
        private String accountNumber;

        @Size(max = 20, message = "IFSC code cannot exceed 20 characters")
        private String ifscCode;

        @Size(max = 100, message = "Bank name cannot exceed 100 characters")
        private String bankName;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class ContactResponse {
        private String id;
        private String name;
        private String upiId;
        private String phone;
        private String accountNumber;
        private String ifscCode;
        private String bankName;
        private Instant createdAt;
    }
}
