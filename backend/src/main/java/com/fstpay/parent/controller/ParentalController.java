package com.fstpay.parent.controller;

import com.fstpay.auth.dto.TokenResponse;
import com.fstpay.common.dto.ApiResponse;
import com.fstpay.parent.dto.*;
import com.fstpay.parent.entity.ParentInvitation;
import com.fstpay.parent.entity.TransactionApproval;
import com.fstpay.parent.service.*;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.card.entity.VirtualCard;
import com.fstpay.card.api.VirtualCardOperations;
import com.fstpay.notification.service.NotificationService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/parental")
@RequiredArgsConstructor
@Tag(name = "Parental Supervision", description = "Endpoints for parent-child accounts linking, invitations, limits management, allowance transfers, and transaction approvals")
public class ParentalController {

    private final ParentInvitationService parentInvitationService;
    private final ParentLinkService parentLinkService;
    private final SpendingLimitService spendingLimitService;
    private final PocketMoneyService pocketMoneyService;
    private final ApprovalService approvalService;
    private final ParentDashboardService parentDashboardService;
    private final NotificationService notificationService;
    private final VirtualCardOperations virtualCardService;
    private final UserRepository userRepository;
    private final ScheduledAllowanceService scheduledAllowanceService;

    // ── Public Endpoints ──

    @GetMapping("/invitation/{token}")
    @Operation(summary = "Get invitation details", description = "Retrieves parent invitation details using the unique invitation secure token.")
    public ResponseEntity<ApiResponse<ParentInvitation>> getInvitation(@PathVariable String token) {
        ParentInvitation invite = parentInvitationService.getInvitationByToken(token);
        return ResponseEntity.ok(ApiResponse.success(invite));
    }

    @PostMapping("/accept-invitation")
    @Operation(summary = "Accept parental invitation", description = "Called by the parent to accept the child's linking invitation, create/configure their parent account, and establish the family connection.")
    public ResponseEntity<ApiResponse<TokenResponse>> acceptInvitation(@Valid @RequestBody AcceptInvitationRequest request) {
        TokenResponse response = parentInvitationService.acceptInvitation(request);
        return ResponseEntity.ok(ApiResponse.success("Invitation accepted and parent account configured", response));
    }

    // ── Teen Endpoints (ROLE_USER) ──

    @PostMapping("/teen/invite-parent")
    @Operation(summary = "Invite parent", description = "Triggered by the teenager to send an invitation request to their parent's email.")
    public ResponseEntity<ApiResponse<ParentInvitation>> inviteParent(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody InviteParentRequest request) {
        ParentInvitation invite = parentInvitationService.inviteParent(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Invitation email dispatched to parent", invite));
    }

    @GetMapping("/teen/invitation-status")
    @Operation(summary = "Get teen invitation status", description = "Checks status of the teenager's outgoing parental linking invitation.")
    public ResponseEntity<ApiResponse<ParentInvitation>> getInvitationStatus(@AuthenticationPrincipal UserDetails userDetails) {
        ParentInvitation invite = parentInvitationService.getInvitationStatusForTeen(userDetails.getUsername()).orElse(null);
        return ResponseEntity.ok(ApiResponse.success(invite));
    }

    @DeleteMapping("/teen/invitation/{id}")
    @Operation(summary = "Cancel parent invitation", description = "Revokes a pending parental invitation sent by the teenager.")
    public ResponseEntity<ApiResponse<String>> cancelInvitation(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        parentInvitationService.cancelInvitation(userDetails.getUsername(), id);
        return ResponseEntity.ok(ApiResponse.success("Invitation revoked successfully", null));
    }

    @PostMapping("/teen/request-approval")
    @Operation(summary = "Request parent approval", description = "Puts a proposed card transaction that exceeded spending rules or limits into the Parent's pending approvals queue.")
    public ResponseEntity<ApiResponse<ApprovalDto>> requestApproval(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody SpendApprovalRequest request) {
        TransactionApproval approval = approvalService.requestApproval(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Approval request sent to parent", mapToApprovalDto(approval)));
    }

    @GetMapping("/teen/approvals")
    @Operation(summary = "Get teen approvals history", description = "Returns a history of all transaction approval requests submitted by the teenager.")
    public ResponseEntity<ApiResponse<List<ApprovalDto>>> getTeenApprovalHistory(@AuthenticationPrincipal UserDetails userDetails) {
        List<TransactionApproval> approvals = approvalService.getApprovalHistoryForChild(userDetails.getUsername());
        List<ApprovalDto> dtos = approvals.stream().map(this::mapToApprovalDto).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    // ── Parent Endpoints (ROLE_PARENT) ──

    @GetMapping("/dashboard")
    @Operation(summary = "Get parent dashboard data", description = "Retrieves family widgets data including child balances, goals status, monthly allowances sent, and recent activities.")
    public ResponseEntity<ApiResponse<ParentDashboardDto>> getDashboard(@AuthenticationPrincipal UserDetails userDetails) {
        ParentDashboardDto dto = parentDashboardService.getParentDashboard(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @GetMapping("/children/{childId}")
    @Operation(summary = "Get child profile details", description = "Retrieves details about a specific linked child including limits, analytics, goals, and cards.")
    public ResponseEntity<ApiResponse<ChildDetailDto>> getChildDetails(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID childId) {
        ChildDetailDto dto = parentDashboardService.getChildDetails(userDetails.getUsername(), childId);
        return ResponseEntity.ok(ApiResponse.success(dto));
    }

    @PostMapping("/pocket-money")
    @Operation(summary = "Transfer pocket money allowance", description = "Performs a ledger-backed transfer from parent's wallet directly into the child's wallet account.")
    public ResponseEntity<ApiResponse<String>> sendPocketMoney(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PocketMoneyRequest request) {
        pocketMoneyService.sendPocketMoney(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Pocket money transferred successfully", null));
    }

    @GetMapping("/allowances")
    @Operation(summary = "Get scheduled allowances", description = "Retrieves all active and paused recurring allowance schedules configured by the parent.")
    public ResponseEntity<ApiResponse<List<ScheduledAllowanceResponse>>> getAllowances(@AuthenticationPrincipal UserDetails userDetails) {
        List<ScheduledAllowanceResponse> allowances = scheduledAllowanceService.getAllowancesForParent(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(allowances));
    }

    @PostMapping("/allowances")
    @Operation(summary = "Create scheduled allowance", description = "Creates a recurring pocket money allowance schedule with optional direct savings goal auto-sweep.")
    public ResponseEntity<ApiResponse<ScheduledAllowanceResponse>> createAllowance(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CreateAllowanceRequest request) {
        ScheduledAllowanceResponse response = scheduledAllowanceService.createAllowance(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Scheduled allowance created successfully", response));
    }

    @PutMapping("/allowances/{id}")
    @Operation(summary = "Update scheduled allowance", description = "Updates recurring allowance configuration, frequency, amount, or pauses/resumes the schedule.")
    public ResponseEntity<ApiResponse<ScheduledAllowanceResponse>> updateAllowance(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id,
            @RequestBody UpdateAllowanceRequest request) {
        ScheduledAllowanceResponse response = scheduledAllowanceService.updateAllowance(userDetails.getUsername(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Scheduled allowance updated successfully", response));
    }

    @DeleteMapping("/allowances/{id}")
    @Operation(summary = "Delete scheduled allowance", description = "Permanently removes a scheduled allowance.")
    public ResponseEntity<ApiResponse<String>> deleteAllowance(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        scheduledAllowanceService.deleteAllowance(userDetails.getUsername(), id);
        return ResponseEntity.ok(ApiResponse.success("Scheduled allowance deleted successfully", null));
    }

    @PostMapping("/allowances/{id}/trigger")
    @Operation(summary = "Trigger scheduled allowance now", description = "Executes an immediate manual sweep of the scheduled allowance.")
    public ResponseEntity<ApiResponse<ScheduledAllowanceResponse>> triggerAllowanceNow(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        ScheduledAllowanceResponse response = scheduledAllowanceService.triggerAllowanceNow(userDetails.getUsername(), id);
        return ResponseEntity.ok(ApiResponse.success("Scheduled allowance triggered successfully", response));
    }

    @PutMapping("/children/{childId}/limits")
    @Operation(summary = "Set child spending limits", description = "Configures transaction rules like transaction limits, daily/weekly/monthly rolling caps, and category blocks.")
    public ResponseEntity<ApiResponse<User>> setSpendingLimits(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID childId,
            @RequestBody SetSpendingLimitRequest request) {
        User updatedChild = spendingLimitService.setSpendingLimits(userDetails.getUsername(), childId, request);
        return ResponseEntity.ok(ApiResponse.success("Spending constraints updated successfully", updatedChild));
    }

    @GetMapping("/approvals")
    @Operation(summary = "Get pending transaction approval requests", description = "Retrieves the list of active approval requests awaiting decision from the parent.")
    public ResponseEntity<ApiResponse<List<ApprovalDto>>> getPendingApprovals(@AuthenticationPrincipal UserDetails userDetails) {
        List<TransactionApproval> approvals = approvalService.getPendingApprovals(userDetails.getUsername());
        List<ApprovalDto> dtos = approvals.stream().map(this::mapToApprovalDto).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @GetMapping("/approvals/history")
    @Operation(summary = "Get parental approval requests history", description = "Retrieves historically processed transaction approvals decided by the parent.")
    public ResponseEntity<ApiResponse<List<ApprovalDto>>> getParentApprovalHistory(@AuthenticationPrincipal UserDetails userDetails) {
        List<TransactionApproval> approvals = approvalService.getApprovalHistoryForParent(userDetails.getUsername());
        List<ApprovalDto> dtos = approvals.stream().map(this::mapToApprovalDto).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @PutMapping("/approvals/{id}")
    @Operation(summary = "Resolve a transaction approval request", description = "Approves or rejects a teenager's pending card purchase approval request.")
    public ResponseEntity<ApiResponse<ApprovalDto>> decideApproval(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id,
            @Valid @RequestBody ApprovalDecisionRequest request) {
        TransactionApproval approval = approvalService.decideApproval(userDetails.getUsername(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Request resolved successfully", mapToApprovalDto(approval)));
    }

    @DeleteMapping("/children/{childId}/unlink")
    @Operation(summary = "Revoke child link", description = "Sever the parental connection link with a specific child.")
    public ResponseEntity<ApiResponse<String>> unlinkChild(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID childId) {
        parentLinkService.unlinkChild(userDetails.getUsername(), childId);
        return ResponseEntity.ok(ApiResponse.success("Parent-child link revoked", null));
    }

    @GetMapping("/notifications")
    @Operation(summary = "Get parent notifications feed", description = "Retrieves recent event notifications related to the linked teenager.")
    public ResponseEntity<ApiResponse<List<ParentNotificationDto>>> getNotifications(@AuthenticationPrincipal UserDetails userDetails) {
        List<ParentNotificationDto> dtos = notificationService.getNotificationsForUser(userDetails.getUsername()).stream().map(n -> ParentNotificationDto.builder()
                .id(n.getId())
                .type(n.getType() != null ? n.getType().name() : null)
                .title(n.getTitle())
                .message(n.getMessage())
                .isRead(n.getIsRead())
                .createdAt(n.getCreatedAt())
                .childId(n.getSender() != null ? n.getSender().getId() : null)
                .childName(n.getSender() != null ? n.getSender().getFullName() : null)
                .build()
        ).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.success(dtos));
    }

    @PutMapping("/notifications/read")
    @Operation(summary = "Mark notifications as read", description = "Marks all active parent notifications as read.")
    public ResponseEntity<ApiResponse<String>> markNotificationsAsRead(@AuthenticationPrincipal UserDetails userDetails) {
        notificationService.markAllAsRead(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success("Notifications marked as read", null));
    }

    @PostMapping("/children/{childId}/freeze-card/{cardId}")
    @Operation(summary = "Freeze child virtual card", description = "Suspends card activity for a child's virtual prepaid card.")
    public ResponseEntity<ApiResponse<VirtualCard>> freezeChildCard(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID childId,
            @PathVariable UUID cardId) {
        User child = parentLinkService.getAuthorizedChild(userDetails.getUsername(), childId);
        VirtualCard card = virtualCardService.freezeCard(child.getEmail(), cardId);
        return ResponseEntity.ok(ApiResponse.success("Child's virtual card frozen successfully", card));
    }

    @PostMapping("/children/{childId}/unfreeze-card/{cardId}")
    @Operation(summary = "Unfreeze child virtual card", description = "Re-activates card activity for a child's virtual prepaid card.")
    public ResponseEntity<ApiResponse<VirtualCard>> unfreezeChildCard(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID childId,
            @PathVariable UUID cardId) {
        User child = parentLinkService.getAuthorizedChild(userDetails.getUsername(), childId);
        VirtualCard card = virtualCardService.unfreezeCard(child.getEmail(), cardId);
        return ResponseEntity.ok(ApiResponse.success("Child's virtual card activated successfully", card));
    }

    private ApprovalDto mapToApprovalDto(TransactionApproval app) {
        return ApprovalDto.builder()
                .id(app.getId())
                .requestType(app.getRequestType())
                .amount(app.getAmount())
                .category(app.getCategory())
                .merchant(app.getMerchant())
                .description(app.getDescription())
                .status(app.getStatus())
                .parentNote(app.getParentNote())
                .targetId(app.getTargetId())
                .childId(app.getChild().getId())
                .childName(app.getChild().getFullName())
                .createdAt(app.getCreatedAt())
                .decidedAt(app.getDecidedAt())
                .biometricVerified(app.getBiometricVerified())
                .biometricAuthMethod(app.getBiometricAuthMethod())
                .biometricCredentialId(app.getBiometricCredentialId())
                .biometricVerifiedAt(app.getBiometricVerifiedAt())
                .build();
    }
}
