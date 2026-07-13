package com.fstpay.reward.entity;

import com.fstpay.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.io.Serializable;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;

@Entity
@Table(name = "user_badges")
@IdClass(UserBadge.UserBadgeId.class)
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserBadge {

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Id
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "badge_id", nullable = false)
    private Badge badge;

    @Column(name = "unlocked_at", nullable = false)
    @Builder.Default
    private Instant unlockedAt = Instant.now();

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserBadgeId implements Serializable {
        private UUID user;
        private UUID badge;

        @Override
        public boolean equals(Object o) {
            if (this == o) return true;
            if (o == null || getClass() != o.getClass()) return false;
            UserBadgeId that = (UserBadgeId) o;
            return Objects.equals(user, that.user) && Objects.equals(badge, that.badge);
        }

        @Override
        public int hashCode() {
            return Objects.hash(user, badge);
        }
    }
}
