package com.fstpay.card.repository;

import com.fstpay.card.entity.VirtualCard;
import com.fstpay.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface VirtualCardRepository extends JpaRepository<VirtualCard, UUID> {
    List<VirtualCard> findByUser(User user);
    List<VirtualCard> findByUserId(UUID userId);
    Optional<VirtualCard> findByIdAndUser(UUID id, User user);

    @Query("SELECT COUNT(c) FROM VirtualCard c WHERE c.status = 'ACTIVE'")
    long countActiveCards();
}
