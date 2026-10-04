package com.fstpay.card.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateDesignRequest {
    @Size(max = 5000000, message = "Card design data cannot exceed 5MB")
    private String cardDesign;
}
