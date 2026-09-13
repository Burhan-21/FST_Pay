package com.fstpay.parent.repository;

import com.fstpay.parent.entity.ScheduledAllowance;
import com.fstpay.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ScheduledAllowanceRepository extends JpaRepository<ScheduledAllowance, UUID> {

    List<ScheduledAllowance> findByParent(User parent);

    List<ScheduledAllowance> findByParentAndActiveTrue(User parent);

    List<ScheduledAllowance> findByChild(User child);

    List<ScheduledAllowance> findByActiveTrueAndNextRunDateLessThanEqual(LocalDate date);

    Optional<ScheduledAllowance> findByIdAndParent(UUID id, User parent);
}
