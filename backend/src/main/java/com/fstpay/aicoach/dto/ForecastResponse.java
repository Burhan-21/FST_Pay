package com.fstpay.aicoach.dto;

import lombok.*;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ForecastResponse {
    private List<ForecastPoint> points;
    private String modelUsed; // e.g. "Linear Trend Projection"

    @Getter
    @Setter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ForecastPoint {
        private String label; // e.g. "July 5"
        private BigDecimal predictedCumulativeSpend;
    }
}
