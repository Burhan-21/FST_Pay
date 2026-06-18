package com.fstpay.card.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateDesignRequest {
    @Size(max = 2000, message = "Card design data cannot exceed 2000 characters")
    private String cardDesign;
}
