package com.fstpay.fx.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fstpay.common.exception.BadRequestException;
import com.fstpay.fx.dto.FxConversionQuote;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.util.*;

@Slf4j
@Service
public class FxRateService {

    public static final String CACHE_KEY = "fstpay:fx:rates";
    public static final Duration CACHE_TTL = Duration.ofMinutes(15);
    public static final BigDecimal PLATFORM_FX_FEE_PERCENT = new BigDecimal("1.50"); // 1.5%

    // Base market exchange rates relative to 1 INR (anchor currency)
    // 1 Foreign Unit = X INR
    private static final Map<String, BigDecimal> BASE_INR_RATES = Map.of(
            "INR", new BigDecimal("1.0000"),
            "USD", new BigDecimal("86.5000"),
            "EUR", new BigDecimal("94.2000"),
            "GBP", new BigDecimal("111.3000"),
            "AED", new BigDecimal("23.5500"),
            "CAD", new BigDecimal("61.2000"),
            "SGD", new BigDecimal("64.8000")
    );

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private io.micrometer.core.instrument.MeterRegistry meterRegistry = new io.micrometer.core.instrument.simple.SimpleMeterRegistry();

    public FxRateService(
            @Autowired(required = false) StringRedisTemplate redisTemplate,
            ObjectMapper objectMapper) {
        this.redisTemplate = redisTemplate;
        this.objectMapper = objectMapper;
    }

    /**
     * Retrieves the supported currencies.
     */
    public Set<String> getSupportedCurrencies() {
        return BASE_INR_RATES.keySet();
    }

    /**
     * Calculates the exchange rate between two currencies using triangular conversion via INR.
     * Rate(FROM -> TO) = Rate(FROM -> INR) / Rate(TO -> INR)
     */
    public BigDecimal getExchangeRate(String fromCurrency, String toCurrency) {
        String from = normalize(fromCurrency);
        String to = normalize(toCurrency);

        if (from.equals(to)) {
            return BigDecimal.ONE.setScale(4, RoundingMode.HALF_UP);
        }

        Map<String, BigDecimal> rates = getRatesAgainstInr();

        BigDecimal fromRateInInr = rates.get(from);
        BigDecimal toRateInInr = rates.get(to);

        if (fromRateInInr == null) {
            throw new BadRequestException("Unsupported source currency: " + from);
        }
        if (toRateInInr == null) {
            throw new BadRequestException("Unsupported target currency: " + to);
        }

        return fromRateInInr.divide(toRateInInr, 6, RoundingMode.HALF_UP)
                .setScale(4, RoundingMode.HALF_UP);
    }

    /**
     * Returns exchange rates for all supported currencies relative to the specified base currency.
     */
    public Map<String, BigDecimal> getRates(String baseCurrency) {
        String base = normalize(baseCurrency);
        if (!BASE_INR_RATES.containsKey(base)) {
            throw new BadRequestException("Unsupported base currency: " + base);
        }

        Map<String, BigDecimal> inrRates = getRatesAgainstInr();
        BigDecimal baseInInr = inrRates.get(base);

        Map<String, BigDecimal> relativeRates = new LinkedHashMap<>();
        for (Map.Entry<String, BigDecimal> entry : inrRates.entrySet()) {
            String curr = entry.getKey();
            if (curr.equals(base)) {
                relativeRates.put(curr, BigDecimal.ONE.setScale(4, RoundingMode.HALF_UP));
            } else {
                BigDecimal rate = baseInInr.divide(entry.getValue(), 6, RoundingMode.HALF_UP)
                        .setScale(4, RoundingMode.HALF_UP);
                relativeRates.put(curr, rate);
            }
        }
        return relativeRates;
    }

    /**
     * Generates a comprehensive conversion quote including fee breakdown and expiry.
     */
    public FxConversionQuote getQuote(BigDecimal amount, String fromCurrency, String toCurrency) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) <= 0) {
            throw new BadRequestException("Conversion amount must be greater than zero");
        }

        String from = normalize(fromCurrency);
        String to = normalize(toCurrency);

        if (meterRegistry != null) {
            try {
                meterRegistry.counter("fstpay.fx.quotes.requested.total", "from", from, "to", to).increment();
            } catch (Exception ignored) {}
        }

        BigDecimal rate = getExchangeRate(from, to);
        BigDecimal convertedAmount = amount.multiply(rate).setScale(2, RoundingMode.HALF_UP);

        BigDecimal feePercent = from.equals(to) ? BigDecimal.ZERO : PLATFORM_FX_FEE_PERCENT;
        BigDecimal feeAmount = from.equals(to)
                ? BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP)
                : convertedAmount.multiply(feePercent).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);

        BigDecimal totalAmount = convertedAmount.add(feeAmount).setScale(2, RoundingMode.HALF_UP);

        return FxConversionQuote.builder()
                .sourceAmount(amount.setScale(2, RoundingMode.HALF_UP))
                .sourceCurrency(from)
                .targetCurrency(to)
                .exchangeRate(rate)
                .convertedAmount(convertedAmount)
                .feePercentage(feePercent)
                .feeAmount(feeAmount)
                .totalAmount(totalAmount)
                .expiresInSeconds(CACHE_TTL.toSeconds())
                .build();
    }

    /**
     * Reads INR base rates from Redis cache or loads defaults into Redis.
     */
    private Map<String, BigDecimal> getRatesAgainstInr() {
        if (redisTemplate != null) {
            try {
                String cachedJson = redisTemplate.opsForValue().get(CACHE_KEY);
                if (cachedJson != null && !cachedJson.isBlank()) {
                    Map<String, String> rawMap = objectMapper.readValue(cachedJson, new TypeReference<>() {});
                    Map<String, BigDecimal> parsed = new LinkedHashMap<>();
                    rawMap.forEach((k, v) -> parsed.put(k, new BigDecimal(v)));
                    if (meterRegistry != null) {
                        try {
                            meterRegistry.counter("fstpay.fx.cache.hits.total").increment();
                        } catch (Exception ignored) {}
                    }
                    return parsed;
                }
            } catch (Exception e) {
                log.warn("Redis FX cache read failed, falling back to in-memory rates: {}", e.getMessage());
            }
        }

        if (meterRegistry != null) {
            try {
                meterRegistry.counter("fstpay.fx.cache.misses.total").increment();
            } catch (Exception ignored) {}
        }

        // Cache miss or Redis unavailable: use defaults
        Map<String, BigDecimal> rates = new LinkedHashMap<>(BASE_INR_RATES);

        if (redisTemplate != null) {
            try {
                Map<String, String> stringMap = new LinkedHashMap<>();
                rates.forEach((k, v) -> stringMap.put(k, v.toPlainString()));
                redisTemplate.opsForValue().set(CACHE_KEY, objectMapper.writeValueAsString(stringMap), CACHE_TTL);
                log.debug("Populated Redis FX rates cache with TTL {} minutes", CACHE_TTL.toMinutes());
            } catch (Exception e) {
                log.warn("Failed to populate Redis FX cache: {}", e.getMessage());
            }
        }

        return rates;
    }

    private String normalize(String currency) {
        if (currency == null || currency.trim().isEmpty()) {
            return "INR";
        }
        return currency.trim().toUpperCase();
    }
}
