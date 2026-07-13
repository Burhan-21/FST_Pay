package com.fstpay.parent.repository;

import com.fstpay.parent.entity.TransactionApproval;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TransactionApprovalRepository extends JpaRepository<TransactionApproval, UUID> {
    List<TransactionApproval> findByParentIdAndStatusOrderByCreatedAtDesc(UUID parentId, String status);
    List<TransactionApproval> findByParentIdOrderByCreatedAtDesc(UUID parentId);
    List<TransactionApproval> findByChildIdOrderByCreatedAtDesc(UUID childId);
    List<TransactionApproval> findByChildIdAndStatusOrderByCreatedAtDesc(UUID childId, String status);
}
