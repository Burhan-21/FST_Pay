package com.fstpay.parent.service;

import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.exception.ResourceNotFoundException;
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
}
