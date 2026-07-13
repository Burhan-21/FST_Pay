package com.fstpay.parent.service;

import com.fstpay.auth.dto.TokenResponse;
import com.fstpay.auth.security.JwtProvider;
import com.fstpay.common.exception.BadRequestException;
import com.fstpay.common.exception.ResourceNotFoundException;
import com.fstpay.common.event.ParentInvitationAcceptedEvent;
import com.fstpay.parent.entity.ParentChildLink;
import com.fstpay.parent.entity.ParentInvitation;
import com.fstpay.parent.repository.ParentChildLinkRepository;
import com.fstpay.parent.repository.ParentInvitationRepository;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.wallet.entity.Wallet;
import com.fstpay.wallet.repository.WalletRepository;
import com.fstpay.notification.service.EmailService;
import com.fstpay.parent.dto.InviteParentRequest;
import com.fstpay.parent.dto.AcceptInvitationRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class ParentInvitationService {

    private final ParentInvitationRepository parentInvitationRepository;
    private final ParentChildLinkRepository parentChildLinkRepository;
    private final UserRepository userRepository;
    private final WalletRepository walletRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtProvider jwtProvider;
    private final EmailService emailService;
    private final ApplicationEventPublisher eventPublisher;

    @Value("${cors.allowed-origins:http://localhost:5173}")
    private String frontendUrl;

    @Transactional
    public ParentInvitation inviteParent(String childEmail, InviteParentRequest request) {
        User child = userRepository.findByEmail(childEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Child user not found"));

        if (child.getRole().equals("ADMIN") || child.getRole().equals("PARENT")) {
            throw new BadRequestException("Only regular user/teen accounts can invite a parent");
        }

        // Check if there is already an active pending invitation for this child
        boolean hasPending = parentInvitationRepository.existsByChildIdAndStatus(child.getId(), "PENDING");
        if (hasPending) {
            throw new BadRequestException("You already have a pending parent invitation. Cancel it before sending a new one.");
        }

        // Check if child is already linked to a parent
        Optional<ParentChildLink> existingLink = parentChildLinkRepository.findByChildIdAndStatus(child.getId(), "ACTIVE");
        if (existingLink.isPresent()) {
            throw new BadRequestException("You are already linked to a parent.");
        }

        String token = UUID.randomUUID().toString() + "-" + UUID.randomUUID().toString();
        ParentInvitation invitation = ParentInvitation.builder()
                .child(child)
                .parentEmail(request.getParentEmail().toLowerCase().trim())
                .relationship(request.getRelationship().toUpperCase().trim())
                .token(token)
                .status("PENDING")
                .expiresAt(Instant.now().plus(48, ChronoUnit.HOURS))
                .build();

        ParentInvitation saved = parentInvitationRepository.save(invitation);

        // Send email
        String baseUrl = frontendUrl.split(",")[0];
        String inviteLink = String.format("%s/accept-invitation?token=%s", baseUrl, token);
        emailService.sendParentInvitation(request.getParentEmail(), child.getFullName(), inviteLink);

        log.info("Invitation sent from {} to parent {} with token {}", childEmail, request.getParentEmail(), token);
        return saved;
    }

    public ParentInvitation getInvitationByToken(String token) {
        ParentInvitation invitation = parentInvitationRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation token not found"));

        if (invitation.getExpiresAt().isBefore(Instant.now()) && invitation.getStatus().equals("PENDING")) {
            invitation.setStatus("EXPIRED");
            parentInvitationRepository.save(invitation);
        }

        return invitation;
    }

    @Transactional
    public void cancelInvitation(String childEmail, UUID invitationId) {
        User child = userRepository.findByEmail(childEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Child not found"));
        ParentInvitation invitation = parentInvitationRepository.findById(invitationId)
                .orElseThrow(() -> new ResourceNotFoundException("Invitation not found"));

        if (!invitation.getChild().getId().equals(child.getId())) {
            throw new BadRequestException("Unauthorized access to invitation");
        }

        if (!invitation.getStatus().equals("PENDING")) {
            throw new BadRequestException("Only pending invitations can be cancelled");
        }

        invitation.setStatus("CANCELLED");
        invitation.setCancelledAt(Instant.now());
        parentInvitationRepository.save(invitation);
        log.info("Invitation {} cancelled by teen {}", invitationId, childEmail);
    }

    public Optional<ParentInvitation> getInvitationStatusForTeen(String childEmail) {
        User child = userRepository.findByEmail(childEmail)
                .orElseThrow(() -> new ResourceNotFoundException("Child not found"));
        List<ParentInvitation> pendingInvites = parentInvitationRepository.findByChildIdAndStatus(child.getId(), "PENDING");
        if (pendingInvites.isEmpty()) {
            return Optional.empty();
        }
        ParentInvitation invite = pendingInvites.get(0);
        if (invite.getExpiresAt().isBefore(Instant.now())) {
            invite.setStatus("EXPIRED");
            parentInvitationRepository.save(invite);
            return Optional.empty();
        }
        return Optional.of(invite);
    }

    @Transactional
    public TokenResponse acceptInvitation(AcceptInvitationRequest request) {
        ParentInvitation invitation = getInvitationByToken(request.getToken());

        if (!invitation.getStatus().equals("PENDING")) {
            throw new BadRequestException("Invitation is not active (current status: " + invitation.getStatus() + ")");
        }

        if (invitation.getExpiresAt().isBefore(Instant.now())) {
            invitation.setStatus("EXPIRED");
            parentInvitationRepository.save(invitation);
            throw new BadRequestException("Invitation has expired");
        }

        User child = invitation.getChild();
        String parentEmail = invitation.getParentEmail();

        // 1. Get or Create Parent User
        Optional<User> existingParentOpt = userRepository.findByEmail(parentEmail);
        User parent;
        if (existingParentOpt.isPresent()) {
            parent = existingParentOpt.get();
            // Verify existing role is appropriate or upgrade it
            if (parent.getRole().equals("USER")) {
                parent.setRole("PARENT");
                userRepository.save(parent);
            }
        } else {
            parent = User.builder()
                    .email(parentEmail)
                    .passwordHash(passwordEncoder.encode(request.getPassword()))
                    .fullName(request.getFullName())
                    .phone(request.getPhone())
                    .dateOfBirth(request.getDateOfBirth())
                    .role("PARENT")
                    .isActive(true)
                    .build();
            parent = userRepository.save(parent);

            // Create a wallet for the parent to support pocket money transfers
            Wallet wallet = Wallet.builder()
                    .user(parent)
                    .balance(BigDecimal.ZERO)
                    .currency("INR")
                    .isActive(true)
                    .build();
            walletRepository.save(wallet);
        }

        // 2. Double check if link already exists or update existing revoked link
        Optional<ParentChildLink> existingLinkOpt = parentChildLinkRepository.findByParentIdAndChildId(parent.getId(), child.getId());
        ParentChildLink link;
        if (existingLinkOpt.isPresent()) {
            link = existingLinkOpt.get();
            if ("ACTIVE".equals(link.getStatus())) {
                invitation.setStatus("ACCEPTED");
                invitation.setAcceptedAt(Instant.now());
                parentInvitationRepository.save(invitation);
                throw new BadRequestException("You are already linked to this child");
            }
            // Update the existing link to ACTIVE
            link.setStatus("ACTIVE");
            link.setRelationship(invitation.getRelationship());
            link.setLinkedAt(Instant.now());
            link.setRevokedAt(null);
        } else {
            // 3. Create ParentChildLink
            link = ParentChildLink.builder()
                    .parent(parent)
                    .child(child)
                    .relationship(invitation.getRelationship())
                    .status("ACTIVE")
                    .linkedAt(Instant.now())
                    .build();
        }
        parentChildLinkRepository.save(link);

        // 4. Update parent fields in child profile for backward compatibility
        child.setParentEmail(parentEmail);
        child.setParentName(parent.getFullName());
        child.setParentPhone(parent.getPhone());
        child.setParentDob(parent.getDateOfBirth());
        child.setParentalControlEnabled(true); // Enable by default upon linking
        userRepository.save(child);

        // 5. Update invitation status
        invitation.setStatus("ACCEPTED");
        invitation.setAcceptedAt(Instant.now());
        parentInvitationRepository.save(invitation);

        // 6. Publish Event for auditing, notifications, and onboarding
        eventPublisher.publishEvent(new ParentInvitationAcceptedEvent(this, parent, child, invitation.getRelationship()));

        // 7. Generate auth tokens for parent to auto-login
        String accessToken = jwtProvider.generateAccessToken(parent.getEmail(), parent.getRole());
        String refreshToken = jwtProvider.generateRefreshToken(parent.getEmail());

        log.info("Invitation accepted: Link created between parent {} and child {}", parentEmail, child.getEmail());

        return TokenResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(jwtProvider.getAccessTokenExpirationMs() / 1000)
                .requiresOtp(false)
                .user(parent)
                .build();
    }
}
