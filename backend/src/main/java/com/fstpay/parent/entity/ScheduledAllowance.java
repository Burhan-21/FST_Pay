package com.fstpay.parent.entity;

import com.fstpay.goal.entity.WalletGoal;
import com.fstpay.parent.enums.AllowanceFrequency;
import com.fstpay.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "scheduled_allowances")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScheduledAllowance {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "parent_id", nullable = false)
    private User parent;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "child_id", nullable = false)
    private User child;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private AllowanceFrequency frequency;

    @Enumerated(EnumType.STRING)
    @Column(name = "day_of_week", length = 20)
    private DayOfWeek dayOfWeek;

    @Column(name = "day_of_month")
    private Integer dayOfMonth;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "target_goal_id")
    private WalletGoal targetGoal;

    @Column(length = 255)
    private String note;

    @Column(nullable = false)
    @Builder.Default
    private Boolean active = true;

    @Column(name = "next_run_date", nullable = false)
    private LocalDate nextRunDate;

    @Column(name = "last_run_date")
    private LocalDate lastRunDate;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private Instant updatedAt;
}
