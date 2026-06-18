package com.fstpay.reward.repository;

import com.fstpay.reward.entity.RewardPoints;
import com.fstpay.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface RewardPointsRepository extends JpaRepository<RewardPoints, UUID> {
    Optional<RewardPoints> findByUser(User user);
    Optional<RewardPoints> findByUserId(UUID userId);
}
