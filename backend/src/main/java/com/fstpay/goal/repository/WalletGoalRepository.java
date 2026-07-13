package com.fstpay.goal.repository;

import com.fstpay.goal.entity.WalletGoal;
import com.fstpay.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface WalletGoalRepository extends JpaRepository<WalletGoal, UUID> {
    List<WalletGoal> findByUser(User user);
    Optional<WalletGoal> findByIdAndUser(UUID id, User user);
    boolean existsByUserAndNameIgnoreCaseAndStatus(User user, String name, String status);
    long countByUserAndStatus(User user, String status);
}
