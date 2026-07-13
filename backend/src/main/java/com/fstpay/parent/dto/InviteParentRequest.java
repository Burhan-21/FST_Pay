package com.fstpay.parent.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class InviteParentRequest {
    @NotBlank(message = "Parent email is required")
    @Email(message = "Invalid parent email format")
    private String parentEmail;

    @NotBlank(message = "Relationship type is required")
    private String relationship; // MOTHER, FATHER, GUARDIAN, OTHER
}
