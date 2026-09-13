package com.fstpay.parent.webauthn.repository;

import com.fstpay.parent.webauthn.entity.UserWebAuthnCredential;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserWebAuthnCredentialRepository extends JpaRepository<UserWebAuthnCredential, UUID> {

    List<UserWebAuthnCredential> findByUserIdOrderByCreatedAtDesc(UUID userId);

    Optional<UserWebAuthnCredential> findByCredentialId(String credentialId);

    Optional<UserWebAuthnCredential> findByUserIdAndId(UUID userId, UUID id);

    long countByUserId(UUID userId);

    void deleteByUserIdAndId(UUID userId, UUID id);
}
