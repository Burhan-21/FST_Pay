package com.fstpay.parent.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LinkChildRequest {
    @NotBlank(message = "Child email or phone is required")
    private String identifier;
    private String relationship;
}

