package com.fstpay.aicoach.repository;

import com.fstpay.aicoach.entity.AiSession;
import com.fstpay.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.UUID;

public interface AiSessionRepository extends JpaRepository<AiSession, UUID> {
    Page<AiSession> findByUser(User user, Pageable pageable);
}
