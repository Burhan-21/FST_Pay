package com.fstpay.card.controller;

import com.fstpay.card.dto.CreateCardRequest;
import com.fstpay.card.dto.UpdateLimitRequest;
import com.fstpay.card.dto.UpdateDesignRequest;
import com.fstpay.card.entity.VirtualCard;
import com.fstpay.card.service.VirtualCardService;
import com.fstpay.common.dto.ApiResponse;
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
public class VirtualCardController {

    private final VirtualCardService virtualCardService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<VirtualCard>>> getCards(@AuthenticationPrincipal UserDetails userDetails) {
        List<VirtualCard> cards = virtualCardService.getCardsByUserEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(cards));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<VirtualCard>> createCard(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CreateCardRequest request) {
        VirtualCard card = virtualCardService.createCard(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Virtual card generated successfully", card));
    }

    @PostMapping("/{id}/freeze")
    public ResponseEntity<ApiResponse<VirtualCard>> freezeCard(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        VirtualCard card = virtualCardService.freezeCard(userDetails.getUsername(), id);
        return ResponseEntity.ok(ApiResponse.success("Card frozen successfully", card));
    }

    @PostMapping("/{id}/unfreeze")
    public ResponseEntity<ApiResponse<VirtualCard>> unfreezeCard(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        VirtualCard card = virtualCardService.unfreezeCard(userDetails.getUsername(), id);
        return ResponseEntity.ok(ApiResponse.success("Card activated successfully", card));
    }

    @PutMapping("/{id}/limit")
    public ResponseEntity<ApiResponse<VirtualCard>> updateLimits(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateLimitRequest request) {
        VirtualCard card = virtualCardService.updateLimits(userDetails.getUsername(), id, request);
        return ResponseEntity.ok(ApiResponse.success("Card limits updated successfully", card));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteCard(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        virtualCardService.deleteCard(userDetails.getUsername(), id);
        return ResponseEntity.ok(ApiResponse.success("Card cancelled successfully", null));
    }

    @PutMapping("/{id}/design")
    public ResponseEntity<ApiResponse<VirtualCard>> updateDesign(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id,
            @Valid @RequestBody UpdateDesignRequest request) {
        VirtualCard card = virtualCardService.updateDesign(userDetails.getUsername(), id, request.getCardDesign());
        return ResponseEntity.ok(ApiResponse.success("Card customization updated successfully", card));
    }
}
