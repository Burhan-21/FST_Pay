package com.fstpay.auth.totp.repository;

import com.fstpay.auth.totp.entity.UserBackupCode;
import com.fstpay.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserBackupCodeRepository extends JpaRepository<UserBackupCode, UUID> {

    List<UserBackupCode> findByUserAndUsedFalse(User user);

    long countByUserAndUsedFalse(User user);

    Optional<UserBackupCode> findByUserAndCodeHashAndUsedFalse(User user, String codeHash);

    @Modifying
    void deleteByUser(User user);
}
