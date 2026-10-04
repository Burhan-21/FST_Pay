package com.fstpay.transaction.repository;

import com.fstpay.transaction.entity.SplitPayment;
import com.fstpay.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SplitPaymentRepository extends JpaRepository<SplitPayment, UUID> {
    List<SplitPayment> findByUserOrderByCreatedAtDesc(User user);
}
