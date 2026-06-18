package com.fstpay.admin.controller;

import com.fstpay.admin.dto.AdminStatsResponse;
import com.fstpay.admin.service.AdminService;
import com.fstpay.common.dto.ApiResponse;
import com.fstpay.transaction.entity.Transaction;
import com.fstpay.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/stats")
    public ResponseEntity<ApiResponse<AdminStatsResponse>> getStats() {
        return ResponseEntity.ok(ApiResponse.success(adminService.getStats()));
    }

    @GetMapping("/users")
    public ResponseEntity<ApiResponse<Page<User>>> getUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(adminService.getUsers(page, size)));
    }

    @PostMapping("/users/{id}/toggle-active")
    public ResponseEntity<ApiResponse<User>> toggleActive(@PathVariable UUID id) {
        return ResponseEntity.ok(ApiResponse.success("User status toggled successfully", adminService.toggleUserActive(id)));
    }

    @GetMapping("/transactions")
    public ResponseEntity<ApiResponse<Page<Transaction>>> getAllTransactions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.success(adminService.getAllTransactions(page, size)));
    }
}
