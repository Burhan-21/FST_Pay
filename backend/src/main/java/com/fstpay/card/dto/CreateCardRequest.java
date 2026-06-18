package com.fstpay.card.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
public class CreateCardRequest {
    @Size(max = 100, message = "Card holder name cannot exceed 100 characters")
    private String cardHolder;

    private BigDecimal spendingLimit;
    private BigDecimal dailyLimit;
    private Boolean isOneTime;
    private List<String> merchantLock;
    private String cardDesign;
}
