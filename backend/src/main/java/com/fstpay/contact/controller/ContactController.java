package com.fstpay.contact.controller;

import com.fstpay.common.dto.ApiResponse;
import com.fstpay.contact.dto.ContactDtos.ContactResponse;
import com.fstpay.contact.dto.ContactDtos.CreateContactRequest;
import com.fstpay.contact.service.ContactService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/contacts")
@RequiredArgsConstructor
@Tag(name = "Contacts", description = "Endpoints for managing saved recipient contacts and UPI IDs")
public class ContactController {

    private final ContactService contactService;

    @GetMapping
    @Operation(summary = "List saved contacts", description = "Retrieves all saved recipient contacts for the authenticated user.")
    public ResponseEntity<ApiResponse<List<ContactResponse>>> getContacts(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<ContactResponse> contacts = contactService.getContacts(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(contacts));
    }

    @PostMapping
    @Operation(summary = "Save a new contact", description = "Saves a new recipient name and UPI ID / account details.")
    public ResponseEntity<ApiResponse<ContactResponse>> createContact(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CreateContactRequest request) {
        ContactResponse contact = contactService.createContact(userDetails.getUsername(), request);
        return ResponseEntity.ok(ApiResponse.success("Contact saved successfully", contact));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a saved contact", description = "Removes a saved contact.")
    public ResponseEntity<ApiResponse<Void>> deleteContact(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable String id) {
        contactService.deleteContact(userDetails.getUsername(), id);
        return ResponseEntity.ok(ApiResponse.success("Contact removed successfully", null));
    }
}
