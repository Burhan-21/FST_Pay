package com.fstpay.card.controller;

import com.fstpay.card.dto.CreateCardRequest;
import com.fstpay.card.dto.UpdateLimitRequest;
import com.fstpay.card.dto.UpdateDesignRequest;
import com.fstpay.card.entity.VirtualCard;
import com.fstpay.card.service.VirtualCardService;
import com.fstpay.common.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/cards")
@RequiredArgsConstructor
@Tag(name = "Virtual Cards", description = "Endpoints for creating, freezing, configuring limits, and styling virtual prepaid debit cards")
public class VirtualCardController {

    private final VirtualCardService virtualCardService;

    @GetMapping
    @Operation(summary = "Get active virtual cards", description = "Retrieves all active virtual cards associated with the authenticated user.")
    public ResponseEntity<ApiResponse<List<VirtualCard>>> getCards(@AuthenticationPrincipal UserDetails userDetails) {
        List<VirtualCard> cards = virtualCardService.getCardsByUserEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(cards));
    }

    @PostMapping
    @Operation(summary = "Generate a new virtual card", description = "Creates a new secure virtual card (Visa/Mastercard) with configured designs and initial transaction limits.")
    public ResponseEntity<ApiResponse<VirtualCard>> createCard(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CreateCardRequest request) {
        VirtualCard card = virtualCardService.createCard(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Virtual card generated successfully", card));
    }

    @PostMapping("/{id}/freeze")
    @Operation(summary = "Freeze virtual card", description = "Temporarily freezes the virtual card, blocking any new simulate-spend requests.")
    public ResponseEntity<ApiResponse<VirtualCard>> freezeCard(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        VirtualCard card = virtualCardService.freezeCard(userDetails.getUsername(), id);
        return ResponseEntity.ok(ApiResponse.success("Card frozen successfully", card));
    }

    @PostMapping("/{id}/unfreeze")
    @Operation(summary = "Unfreeze virtual card", description = "Unfreezes the virtual card, making it active again for transactions.")
    public ResponseEntity<ApiResponse<VirtualCard>> unfreezeCard(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        VirtualCard card = virtualCardService.unfreezeCard(userDetails.getUsername(), id);
        return ResponseEntity.ok(ApiResponse.success("Card activated successfully", card));
    }

    @PutMapping("/{id}/limit")
    @Operation(summary = "Update card limits", description = "Sets transaction and daily limit ceilings specifically on this card.")
    public ResponseEntity<ApiResponse<VirtualCard>> updateLimits(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateLimitRequest request) {
        VirtualCard card = virtualCardService.updateLimits(userDetails.getUsername(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Card limits updated successfully", card));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete virtual card", description = "Terminates the virtual card permanently. Deleted cards cannot be restored.")
    public ResponseEntity<ApiResponse<String>> deleteCard(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        virtualCardService.deleteCard(userDetails.getUsername(), id);
        return ResponseEntity.ok(ApiResponse.success("Card cancelled successfully", null));
    }

    @PutMapping("/{id}/design")
    @Operation(summary = "Customize card design", description = "Updates card aesthetic theme parameters (color gradient, styling details).")
    public ResponseEntity<ApiResponse<VirtualCard>> updateDesign(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateDesignRequest request) {
        VirtualCard card = virtualCardService.updateDesign(userDetails.getUsername(), id, request.getCardDesign());
        return ResponseEntity.ok(ApiResponse.success("Card customization updated successfully", card));
    }
}
