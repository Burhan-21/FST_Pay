package com.fstpay.transaction.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CircuitBreakerStatusDto {

    private String name;
    private String state;
    private float failureRate;
    private float slowCallRate;
    private int numberOfBufferedCalls;
    private int numberOfFailedCalls;
    private int numberOfSuccessfulCalls;
    private int numberOfSlowCalls;
    private long numberOfNotPermittedCalls;
}
