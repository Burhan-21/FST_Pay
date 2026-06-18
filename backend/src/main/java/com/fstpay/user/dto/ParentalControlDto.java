package com.fstpay.user.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class ParentalControlDto {
    private Boolean parentalControlEnabled;
    private BigDecimal parentalMaxTxnAmount;
    private String parentalRestrictedCategories;
    private String parentalPin;
    private String parentName;
    private String parentEmail;
    private String parentPhone;
    private java.time.LocalDate parentDob;
    private String parentGender;
    private Integer parentAge;
}
