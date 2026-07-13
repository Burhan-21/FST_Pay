package com.fstpay.reward.repository;

import com.fstpay.reward.entity.RewardItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface RewardItemRepository extends JpaRepository<RewardItem, UUID> {
    List<RewardItem> findByStockGreaterThan(int minStock);
}
