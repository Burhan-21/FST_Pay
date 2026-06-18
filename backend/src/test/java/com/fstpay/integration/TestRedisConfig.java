package com.fstpay.integration;

import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.data.redis.core.StringRedisTemplate;

import static org.mockito.Mockito.mock;

@TestConfiguration
public class TestRedisConfig {

    @Bean
    StringRedisTemplate stringRedisTemplate() {
        return mock(StringRedisTemplate.class);
    }
}
