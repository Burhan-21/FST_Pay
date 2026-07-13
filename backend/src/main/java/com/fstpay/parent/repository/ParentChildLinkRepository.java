package com.fstpay.parent.repository;

import com.fstpay.parent.entity.ParentChildLink;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ParentChildLinkRepository extends JpaRepository<ParentChildLink, UUID> {
    List<ParentChildLink> findByParentIdAndStatus(UUID parentId, String status);
    Optional<ParentChildLink> findByChildIdAndStatus(UUID childId, String status);
    Optional<ParentChildLink> findByParentIdAndChildId(UUID parentId, UUID childId);
    boolean existsByParentIdAndChildIdAndStatus(UUID parentId, UUID childId, String status);

    @Query("SELECT pcl FROM ParentChildLink pcl WHERE pcl.parent.email = :parentEmail AND pcl.status = 'ACTIVE'")
    List<ParentChildLink> findActiveLinksByParentEmail(String parentEmail);

    @Query("SELECT pcl FROM ParentChildLink pcl WHERE pcl.child.email = :childEmail AND pcl.status = 'ACTIVE'")
    Optional<ParentChildLink> findActiveLinkByChildEmail(String childEmail);
}
