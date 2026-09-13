package com.fstpay.fx.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class FxConversionQuote {

    private final BigDecimal sourceAmount;
    private final String sourceCurrency;
    private final String targetCurrency;
    private final BigDecimal exchangeRate;
    private final BigDecimal convertedAmount;
    private final BigDecimal feePercentage;
    private final BigDecimal feeAmount;
    private final BigDecimal totalAmount;
    private final long expiresInSeconds;
}
