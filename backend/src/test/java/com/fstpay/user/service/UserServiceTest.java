package com.fstpay.user.service;

import com.fstpay.common.exception.BadRequestException;
import com.fstpay.user.dto.ParentalControlDto;
import com.fstpay.user.dto.PasswordChangeDto;
import com.fstpay.user.dto.UserUpdateDto;
import com.fstpay.user.entity.User;
import com.fstpay.user.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    private PasswordEncoder passwordEncoder;
    private UserService userService;

    private User testUser;
    private String rawPassword = "SecurePass123!";

    @BeforeEach
    void setUp() {
        passwordEncoder = new BCryptPasswordEncoder(12);
        userService = new UserService(userRepository, passwordEncoder);

        testUser = User.builder()
                .id(UUID.randomUUID())
                .email("test@example.com")
                .passwordHash(passwordEncoder.encode(rawPassword))
                .fullName("Test User")
                .phone("9876543210")
                .dateOfBirth(LocalDate.of(2000, 1, 15))
                .role("USER")
                .isActive(true)
                .build();
    }

    @Test
    void getProfile_WithValidEmail_ReturnsUser() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));

        User result = userService.getProfile("test@example.com");

        assertNotNull(result);
        assertEquals("test@example.com", result.getEmail());
        assertEquals("Test User", result.getFullName());
    }

    @Test
    void getProfile_WithNonexistentEmail_ThrowsException() {
        when(userRepository.findByEmail("nobody@example.com")).thenReturn(Optional.empty());

        assertThrows(com.fstpay.common.exception.ResourceNotFoundException.class,
                () -> userService.getProfile("nobody@example.com"));
    }

    @Test
    void updateProfile_WithValidData_UpdatesFields() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        UserUpdateDto dto = new UserUpdateDto();
        dto.setFullName("Updated Name");
        dto.setPhone("9988776655");

        User result = userService.updateProfile("test@example.com", dto);

        assertEquals("Updated Name", result.getFullName());
        assertEquals("9988776655", result.getPhone());
    }

    @Test
    void changePassword_WithCorrectCurrentPassword_Succeeds() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        PasswordChangeDto dto = new PasswordChangeDto();
        dto.setCurrentPassword(rawPassword);
        dto.setNewPassword("NewSecurePass456!");

        assertDoesNotThrow(() -> userService.changePassword("test@example.com", dto));
        assertTrue(passwordEncoder.matches("NewSecurePass456!", testUser.getPasswordHash()));
    }

    @Test
    void changePassword_WithWrongCurrentPassword_ThrowsException() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));

        PasswordChangeDto dto = new PasswordChangeDto();
        dto.setCurrentPassword("wrong-password");
        dto.setNewPassword("NewSecurePass456!");

        assertThrows(BadRequestException.class,
                () -> userService.changePassword("test@example.com", dto));
    }

    @Test
    void updateParentalControl_EnablesParentalControls() {
        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        ParentalControlDto dto = new ParentalControlDto();
        dto.setParentalControlEnabled(true);
        dto.setParentalMaxTxnAmount(new java.math.BigDecimal("1000.00"));
        dto.setParentalRestrictedCategories("GAMING,GAMBLING");
        dto.setParentalPin("1234");
        dto.setParentName("Parent Name");
        dto.setParentEmail("parent@example.com");

        User result = userService.updateParentalControl("test@example.com", dto);

        assertTrue(result.getParentalControlEnabled());
        assertEquals(new java.math.BigDecimal("1000.00"), result.getParentalMaxTxnAmount());
        assertEquals("GAMING,GAMBLING", result.getParentalRestrictedCategories());
        assertTrue(passwordEncoder.matches("1234", result.getParentalPin()));
        assertEquals("parent@example.com", result.getParentEmail());
    }

    @Test
    void updateParentalControl_WithNullFields_DoesNotOverrideExisting() {
        testUser.setParentalControlEnabled(true);
        testUser.setParentalMaxTxnAmount(new java.math.BigDecimal("500.00"));

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenAnswer(i -> i.getArgument(0));

        ParentalControlDto dto = new ParentalControlDto();
        dto.setParentalControlEnabled(false);

        User result = userService.updateParentalControl("test@example.com", dto);

        assertFalse(result.getParentalControlEnabled());
        assertEquals(new java.math.BigDecimal("500.00"), result.getParentalMaxTxnAmount());
    }

    @Test
    void getChildrenByParentEmail_ReturnsLinkedChildren() {
        String parentEmail = "parent@example.com";
        User child1 = User.builder()
                .id(UUID.randomUUID())
                .fullName("Child One")
                .email("child1@example.com")
                .parentEmail(parentEmail)
                .isActive(true)
                .build();
        User child2 = User.builder()
                .id(UUID.randomUUID())
                .fullName("Child Two")
                .email("child2@example.com")
                .parentEmail(parentEmail)
                .isActive(true)
                .build();

        when(userRepository.findByParentEmail(parentEmail)).thenReturn(java.util.List.of(child1, child2));

        var children = userService.getChildrenByParentEmail(parentEmail);

        assertEquals(2, children.size());
        assertEquals("Child One", children.get(0).getFullName());
        assertEquals("child2@example.com", children.get(1).getEmail());
    }
}
