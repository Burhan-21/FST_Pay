package com.fstpay.reward.repository;

import com.fstpay.reward.entity.RewardHistory;
import com.fstpay.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface RewardHistoryRepository extends JpaRepository<RewardHistory, UUID> {
    Page<RewardHistory> findByUser(User user, Pageable pageable);
}
