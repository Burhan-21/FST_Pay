package com.fstpay;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
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
            } catch (Exception e) {
                log.error("Failed to initialize admin user", e);
                throw new RuntimeException("Admin initialization failed", e);
            }
        };
    }
}
