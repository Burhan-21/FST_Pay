package com.fstpay.contact.repository;

import com.fstpay.contact.entity.UserContact;
import com.fstpay.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserContactRepository extends JpaRepository<UserContact, UUID> {
    List<UserContact> findByUserOrderByCreatedAtDesc(User user);
    Optional<UserContact> findByIdAndUser(UUID id, User user);
    boolean existsByUserAndUpiId(User user, String upiId);
}
