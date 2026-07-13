package com.fstpay;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import com.fstpay.user.repository.UserRepository;
import com.fstpay.user.entity.User;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.beans.factory.annotation.Value;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@SpringBootApplication
@EnableAsync
@EnableScheduling
public class FstPayApplication {
    public static void main(String[] args) {
        SpringApplication.run(FstPayApplication.class, args);
    }

    @Bean
    public CommandLineRunner initAdminUser(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.admin.email:#{null}}") String adminEmail,
            @Value("${app.admin.password:#{null}}") String adminPassword,
            @Value("${app.admin.fullName:#{null}}") String adminFullName) {
        
        return args -> {
            // Skip admin initialization if credentials not provided
            if (adminEmail == null || adminPassword == null) {
                log.info("Admin seeding skipped - credentials not provided in environment");
                return;
            }
            
            try {
                User user = userRepository.findByEmail(adminEmail).orElse(null);
                if (user != null) {
                    user.setPasswordHash(passwordEncoder.encode(adminPassword));
                    user.setRole("ADMIN");
                    user.setIsActive(true);
                    userRepository.save(user);
                    log.info("Admin user password updated successfully for email: {}", adminEmail);
                } else {
                    User newAdmin = User.builder()
                            .email(adminEmail)
                            .passwordHash(passwordEncoder.encode(adminPassword))
                            .fullName(adminFullName != null ? adminFullName : "Admin User")
                            .role("ADMIN")
                            .isActive(true)
                            .build();
                    userRepository.save(newAdmin);
                    log.info("Admin user created successfully for email: {}", adminEmail);
                }

                // Update E2E test users passwords to "Burhan@1234" to ensure test stability
                java.util.List<String> testEmails = java.util.List.of("burhan.test1@gmail.com", "burhan.parent1@gmail.com");
                for (String email : testEmails) {
                    userRepository.findByEmail(email).ifPresent(u -> {
                        u.setPasswordHash(passwordEncoder.encode("Burhan@1234"));
                        userRepository.save(u);
                        log.info("Test user password reset to Burhan@1234 for: {}", email);
                    });
                }
            } catch (Exception e) {
                log.error("Failed to initialize users", e);
                throw new RuntimeException("User initialization failed", e);
            }
        };
    }
}
