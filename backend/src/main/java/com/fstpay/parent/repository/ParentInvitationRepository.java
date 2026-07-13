package com.fstpay.parent.repository;

import com.fstpay.parent.entity.ParentInvitation;
import com.fstpay.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ParentInvitationRepository extends JpaRepository<ParentInvitation, UUID> {
    Optional<ParentInvitation> findByToken(String token);
    Optional<ParentInvitation> findByTokenAndStatus(String token, String status);
    List<ParentInvitation> findByChildIdAndStatus(UUID childId, String status);
    boolean existsByChildIdAndStatus(UUID childId, String status);
    Optional<ParentInvitation> findFirstByChildIdOrderByCreatedAtDesc(UUID childId);
    List<ParentInvitation> findByParentEmailIgnoreCaseAndStatus(String parentEmail, String status);
}
