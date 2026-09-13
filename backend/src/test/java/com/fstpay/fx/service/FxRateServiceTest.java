package com.fstpay.fx.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fstpay.common.exception.BadRequestException;
import com.fstpay.fx.dto.FxConversionQuote;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class FxRateServiceTest {

    @Mock
    private StringRedisTemplate redisTemplate;
    @Mock
    private ValueOperations<String, String> valueOperations;

    private FxRateService fxRateService;

    @BeforeEach
    void setUp() {
        // Mock Redis ops
        lenient().when(redisTemplate.opsForValue()).thenReturn(valueOperations);
        lenient().when(valueOperations.get(anyString())).thenReturn(null); // cache miss by default

        fxRateService = new FxRateService(redisTemplate, new ObjectMapper());
    }

    @Test
    void getExchangeRate_SameCurrency_ReturnsOne() {
        BigDecimal rate = fxRateService.getExchangeRate("INR", "INR");
        assertEquals(new BigDecimal("1.0000"), rate);

        BigDecimal usdRate = fxRateService.getExchangeRate("usd", "USD");
        assertEquals(new BigDecimal("1.0000"), usdRate);
    }

    @Test
    void getExchangeRate_UsdToInr_ReturnsCorrectRate() {
        BigDecimal rate = fxRateService.getExchangeRate("USD", "INR");
        assertEquals(new BigDecimal("86.5000"), rate);
    }

    @Test
    void getExchangeRate_InrToUsd_ReturnsInverseRate() {
        BigDecimal rate = fxRateService.getExchangeRate("INR", "USD");
        // 1 / 86.50 = 0.01156... => 0.0116
        assertEquals(new BigDecimal("0.0116"), rate);
    }

    @Test
    void getExchangeRate_EurToUsd_TriangularConversion() {
        // EUR in INR = 94.20, USD in INR = 86.50 -> 94.20 / 86.50 = 1.0890
        BigDecimal rate = fxRateService.getExchangeRate("EUR", "USD");
        assertEquals(new BigDecimal("1.0890"), rate);
    }

    @Test
    void getExchangeRate_UnsupportedCurrency_ThrowsBadRequest() {
        assertThrows(BadRequestException.class,
                () -> fxRateService.getExchangeRate("XYZ", "INR"));
        assertThrows(BadRequestException.class,
                () -> fxRateService.getExchangeRate("USD", "ABC"));
    }

    @Test
    void getQuote_SameCurrency_ZeroFee() {
        FxConversionQuote quote = fxRateService.getQuote(new BigDecimal("100.00"), "INR", "INR");

        assertNotNull(quote);
        assertEquals(new BigDecimal("100.00"), quote.getSourceAmount());
        assertEquals("INR", quote.getSourceCurrency());
        assertEquals("INR", quote.getTargetCurrency());
        assertEquals(new BigDecimal("1.0000"), quote.getExchangeRate());
        assertEquals(new BigDecimal("100.00"), quote.getConvertedAmount());
        assertEquals(BigDecimal.ZERO, quote.getFeePercentage());
        assertEquals(new BigDecimal("0.00"), quote.getFeeAmount());
        assertEquals(new BigDecimal("100.00"), quote.getTotalAmount());
    }

    @Test
    void getQuote_CrossCurrency_CalculatesConvertedAmountAnd1Point5PercentFee() {
        // $10.00 USD -> INR @ 86.50 = ₹865.00
        // Fee 1.5% = ₹12.98
        // Total = ₹877.98
        FxConversionQuote quote = fxRateService.getQuote(new BigDecimal("10.00"), "USD", "INR");

        assertNotNull(quote);
        assertEquals(new BigDecimal("10.00"), quote.getSourceAmount());
        assertEquals("USD", quote.getSourceCurrency());
        assertEquals("INR", quote.getTargetCurrency());
        assertEquals(new BigDecimal("86.5000"), quote.getExchangeRate());
        assertEquals(new BigDecimal("865.00"), quote.getConvertedAmount());
        assertEquals(new BigDecimal("1.50"), quote.getFeePercentage());
        assertEquals(new BigDecimal("12.98"), quote.getFeeAmount());
        assertEquals(new BigDecimal("877.98"), quote.getTotalAmount());
        assertEquals(900, quote.getExpiresInSeconds());
    }

    @Test
    void getQuote_InvalidAmount_ThrowsBadRequest() {
        assertThrows(BadRequestException.class,
                () -> fxRateService.getQuote(BigDecimal.ZERO, "USD", "INR"));
        assertThrows(BadRequestException.class,
                () -> fxRateService.getQuote(new BigDecimal("-5.00"), "USD", "INR"));
    }

    @Test
    void getRates_ReturnsRelativeRatesForBase() {
        Map<String, BigDecimal> rates = fxRateService.getRates("USD");
        assertNotNull(rates);
        assertEquals(new BigDecimal("1.0000"), rates.get("USD"));
        // 1 USD = 86.50 INR
        assertEquals(new BigDecimal("86.5000"), rates.get("INR"));
    }
}
