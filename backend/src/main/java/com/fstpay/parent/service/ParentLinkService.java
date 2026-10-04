package com.fstpay.parent.service;

import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.parent.dto.LinkChildRequest;
import com.fstpay.parent.entity.ParentChildLink;
import com.fstpay.parent.repository.ParentChildLinkRepository;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ParentLinkService {

    private final ParentChildLinkRepository parentChildLinkRepository;
    private final UserRepository userRepository;

    public List<ParentChildLink> getActiveLinksForParent(String parentEmail) {
        User parent = userRepository.findByEmail(parentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Parent not found"));
        return parentChildLinkRepository.findByParentIdAndStatus(parent.getId(), "ACTIVE");
    }

    public boolean isChildLinkedToParent(UUID parentId, UUID childId) {
        return parentChildLinkRepository.existsByParentIdAndChildIdAndStatus(parentId, childId, "ACTIVE");
    }

    public void validateLink(String parentEmail, UUID childId) {
        User parent = userRepository.findByEmail(parentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Parent not found"));
        boolean isLinked = isChildLinkedToParent(parent.getId(), childId);
        if (!isLinked) {
            throw new BadRequestException("Unauthorized access: You are not linked to this child account.");
        }
    }

    public User getAuthorizedChild(String parentEmail, UUID childId) {
        validateLink(parentEmail, childId);
        return userRepository.findById(childId)
                .orElseThrow(() -> new ResourceNotFoundException("Child account not found"));
    }

    @Transactional
    public void unlinkChild(String parentEmail, UUID childId) {
        User parent = userRepository.findByEmail(parentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Parent not found"));
        ParentChildLink link = parentChildLinkRepository.findByParentIdAndChildId(parent.getId(), childId)
                .orElseThrow(() -> new ResourceNotFoundException("Link between parent and child not found"));

        if (!link.getStatus().equals("ACTIVE")) {
            throw new BadRequestException("Link is already inactive");
        }

        link.setStatus("REVOKED");
        link.setRevokedAt(Instant.now());
        parentChildLinkRepository.save(link);

        // Reset child's parent details
        User child = link.getChild();
        child.setParentEmail(null);
        child.setParentName(null);
        child.setParentPhone(null);
        child.setParentDob(null);
        child.setParentalControlEnabled(false);
        userRepository.save(child);

        log.info("Parent {} unlinked from child {}", parentEmail, child.getEmail());
    }

    @Transactional
    public ParentChildLink linkChildByIdentifier(String parentEmail, LinkChildRequest request) {
        User parent = userRepository.findByEmail(parentEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Parent not found"));

        String rawId = request.getIdentifier().trim().toLowerCase();
        User child = userRepository.findByEmail(rawId)
                .or(() -> userRepository.findByPhone(request.getIdentifier().trim()))
                .orElseThrow(() -> new ResourceNotFoundException("No active account found with email/phone: " + request.getIdentifier()));

        if (child.getId().equals(parent.getId())) {
            throw new BadRequestException("You cannot link your own account as a child.");
        }

        if ("PARENT".equals(child.getRole()) || "ADMIN".equals(child.getRole())) {
            throw new BadRequestException("The target account has a parent or admin role and cannot be linked as a child.");
        }

        // Check if already linked
        Optional<ParentChildLink> existing = parentChildLinkRepository.findByParentIdAndChildId(parent.getId(), child.getId());
        ParentChildLink link;
        if (existing.isPresent()) {
            link = existing.get();
            if ("ACTIVE".equals(link.getStatus())) {
                throw new BadRequestException("This account is already linked to your family.");
            }
            link.setStatus("ACTIVE");
            link.setRelationship(request.getRelationship() != null && !request.getRelationship().trim().isEmpty() ? request.getRelationship().toUpperCase().trim() : "CHILD");
            link.setLinkedAt(Instant.now());
            link.setRevokedAt(null);
        } else {
            link = ParentChildLink.builder()
                    .parent(parent)
                    .child(child)
                    .relationship(request.getRelationship() != null && !request.getRelationship().trim().isEmpty() ? request.getRelationship().toUpperCase().trim() : "CHILD")
                    .status("ACTIVE")
                    .linkedAt(Instant.now())
                    .build();
        }

        child.setParentEmail(parent.getEmail());
        child.setParentName(parent.getFullName());
        child.setParentPhone(parent.getPhone());
        child.setParentalControlEnabled(true);
        userRepository.save(child);

        ParentChildLink saved = parentChildLinkRepository.save(link);
        log.info("Parent {} linked child account {} ({})", parentEmail, child.getEmail(), link.getRelationship());
        return saved;
    }
}
