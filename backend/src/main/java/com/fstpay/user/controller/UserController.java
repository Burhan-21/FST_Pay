package com.fstpay.user.controller;

import com.fstpay.common.dto.ApiResponse;
import com.fstpay.user.dto.ChildSummaryDto;
import com.fstpay.user.dto.PasswordChangeDto;
import com.fstpay.user.dto.UserUpdateDto;
import com.fstpay.user.entity.User;
import com.fstpay.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<User>> getProfile(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.getProfile(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(user));
    }

    @PutMapping("/me")
    public ResponseEntity<ApiResponse<User>> updateProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody UserUpdateDto dto) {
        User updated = userService.updateProfile(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success("Profile updated successfully", updated));
    }

    @PutMapping("/me/password")
    public ResponseEntity<ApiResponse<String>> changePassword(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody PasswordChangeDto dto) {
        userService.changePassword(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success("Password changed successfully", null));
    }

    @PutMapping("/me/parental")
    public ResponseEntity<ApiResponse<User>> updateParentalControl(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody com.fstpay.user.dto.ParentalControlDto dto) {
        User updated = userService.updateParentalControl(userDetails.getUsername(), dto);
        return ResponseEntity.ok(ApiResponse.success("Parental control updated successfully", updated));
    }

    @GetMapping("/parent/children")
    public ResponseEntity<ApiResponse<List<com.fstpay.user.dto.ChildSummaryDto>>> getLinkedChildren(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<com.fstpay.user.dto.ChildSummaryDto> children = userService.getChildrenByParentEmail(userDetails.getUsername());
        return ResponseEntity.ok(ApiResponse.success(children));
    }
}
