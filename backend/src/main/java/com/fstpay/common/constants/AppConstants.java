package com.fstpay.common.constants;

/**
 * Application-wide constants to avoid magic strings and numbers
 */
public class AppConstants {
    
    // User roles
    public static final String ROLE_ADMIN = "ADMIN";
    public static final String ROLE_USER = "USER";
    public static final String ROLE_PARENT = "PARENT";
    
    // Wallet/Financial Constants
    public static final int MONEY_SCALE = 2;
    public static final String DEFAULT_CURRENCY = "INR";
    
    // Transaction types
    public static final String TRANSACTION_TYPE_CREDIT = "CREDIT";
    public static final String TRANSACTION_TYPE_DEBIT = "DEBIT";
    
    // Transaction categories
    public static final String TRANSACTION_CATEGORY_TOPUP = "TOPUP";
    public static final String TRANSACTION_CATEGORY_PURCHASE = "PURCHASE";
    public static final String TRANSACTION_CATEGORY_WITHDRAWAL = "WITHDRAWAL";
    
    // Transaction status
    public static final String TRANSACTION_STATUS_PENDING = "PENDING";
    public static final String TRANSACTION_STATUS_COMPLETED = "COMPLETED";
    public static final String TRANSACTION_STATUS_FAILED = "FAILED";
    public static final String TRANSACTION_STATUS_CANCELLED = "CANCELLED";
    
    // Card status
    public static final String CARD_STATUS_ACTIVE = "ACTIVE";
    public static final String CARD_STATUS_FROZEN = "FROZEN";
    public static final String CARD_STATUS_EXPIRED = "EXPIRED";
    public static final String CARD_STATUS_CANCELLED = "CANCELLED";
    
    // Rate limiting - Request thresholds (per minute)
    public static final int RATE_LIMIT_AUTH_REQUESTS = 10;
    public static final int RATE_LIMIT_AUTH_WINDOW_MINUTES = 1;
    
    public static final int RATE_LIMIT_AI_REQUESTS = 20;
    public static final int RATE_LIMIT_AI_WINDOW_MINUTES = 1;
    
    public static final int RATE_LIMIT_GENERAL_REQUESTS = 150;
    public static final int RATE_LIMIT_GENERAL_WINDOW_MINUTES = 1;
    
    // Failed login attempts
    public static final int MAX_FAILED_LOGIN_ATTEMPTS = 5;
    public static final long ACCOUNT_LOCKOUT_DURATION_MINUTES = 15;
    
    // JWT
    public static final String JWT_HEADER_NAME = "Authorization";
    public static final String JWT_TOKEN_PREFIX = "Bearer ";
    
    // Validation
    public static final int MIN_PASSWORD_LENGTH = 8;
    public static final int MAX_FULLNAME_LENGTH = 100;
    public static final int MAX_PHONE_LENGTH = 20;
    
    // API
    public static final int DEFAULT_PAGE_SIZE = 20;
    public static final int MAX_PAGE_SIZE = 100;
    
    // OTP
    public static final int OTP_LENGTH = 6;
    public static final long OTP_EXPIRY_MINUTES = 10;
    public static final long OTP_RATE_LIMIT_SECONDS = 60; // Can resend after 60 seconds
    
    private AppConstants() {
        // Prevent instantiation
    }
}
