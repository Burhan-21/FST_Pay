package com.fstpay.fx.controller;

import com.fstpay.common.dto.ApiResponse;
import com.fstpay.fx.dto.FxConversionQuote;
import com.fstpay.fx.service.FxRateService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/api/v1/fx")
@RequiredArgsConstructor
@Tag(name = "Foreign Exchange", description = "Endpoints for currency exchange rates, conversion quotes, and cross-border calculations")
public class FxController {

    private final FxRateService fxRateService;

    @GetMapping("/currencies")
    @Operation(summary = "Get supported currencies", description = "Returns the list of supported foreign exchange currency codes.")
    public ResponseEntity<ApiResponse<Set<String>>> getSupportedCurrencies() {
        Set<String> currencies = fxRateService.getSupportedCurrencies();
        return ResponseEntity.ok(ApiResponse.success(currencies));
    }

    @GetMapping("/rates")
    @Operation(summary = "Get exchange rates", description = "Retrieves real-time exchange rates relative to the given base currency (default: INR).")
    public ResponseEntity<ApiResponse<Map<String, BigDecimal>>> getRates(
            @RequestParam(defaultValue = "INR") String base) {
        Map<String, BigDecimal> rates = fxRateService.getRates(base);
        return ResponseEntity.ok(ApiResponse.success(rates));
    }

    @GetMapping("/quote")
    @Operation(summary = "Get conversion quote", description = "Calculates cross-currency conversion with dynamic 1.5% platform FX fee.")
    public ResponseEntity<ApiResponse<FxConversionQuote>> getQuote(
            @RequestParam BigDecimal amount,
            @RequestParam(defaultValue = "USD") String from,
            @RequestParam(defaultValue = "INR") String to) {
        FxConversionQuote quote = fxRateService.getQuote(amount, from, to);
        return ResponseEntity.ok(ApiResponse.success(quote));
    }
}
