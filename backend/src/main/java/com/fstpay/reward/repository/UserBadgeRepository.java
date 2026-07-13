package com.fstpay.reward.repository;

import com.fstpay.reward.entity.Badge;
import com.fstpay.reward.entity.UserBadge;
import com.fstpay.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface UserBadgeRepository extends JpaRepository<UserBadge, UserBadge.UserBadgeId> {
    List<UserBadge> findByUser(User user);
    boolean existsByUserAndBadge(User user, Badge badge);
}
