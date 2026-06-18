package com.fstpay.user.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;
import java.time.LocalDate;

@Data
public class UserUpdateDto {
    @Size(max = 100, message = "Full name cannot exceed 100 characters")
    private String fullName;

    @Size(max = 15, message = "Phone number cannot exceed 15 characters")
    private String phone;

    private LocalDate dateOfBirth;

    private String avatarUrl;
}
