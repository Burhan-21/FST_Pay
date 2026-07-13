package com.fstpay.reward.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "reward_items")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RewardItem {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    private String description;

    @Column(name = "cost_points", nullable = false)
    private Integer costPoints;

    @Column(nullable = false)
    private Integer stock;

    @Column(nullable = false)
    private String code;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
