package com.fstpay.reward.repository;

import com.fstpay.reward.entity.RewardRedemption;
import com.fstpay.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface RewardRedemptionRepository extends JpaRepository<RewardRedemption, UUID> {
    List<RewardRedemption> findByUserOrderByRedeemedAtDesc(User user);
}
