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
        loadDotEnv();
        SpringApplication.run(FstPayApplication.class, args);
    }

    private static void loadDotEnv() {
        for (String pathStr : new String[]{".env", "../.env", "../../.env"}) {
            java.io.File file = new java.io.File(pathStr);
            if (file.exists() && file.isFile()) {
                try (java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.FileReader(file, java.nio.charset.StandardCharsets.UTF_8))) {
                    System.out.println("[DOTENV] Loaded environment secrets from: " + file.getAbsolutePath());
                    String line;
                    while ((line = reader.readLine()) != null) {
                        line = line.trim();
                        if (!line.isEmpty() && !line.startsWith("#") && line.contains("=")) {
                            int eq = line.indexOf('=');
                            String key = line.substring(0, eq).trim();
                            String val = line.substring(eq + 1).trim();
                            if ((val.startsWith("\"") && val.endsWith("\"")) || (val.startsWith("'") && val.endsWith("'"))) {
                                val = val.substring(1, val.length() - 1);
                            }
                            if (System.getProperty(key) == null && System.getenv(key) == null) {
                                System.setProperty(key, val);
                                if ("SPRING_PROFILES_ACTIVE".equalsIgnoreCase(key)) {
                                    System.setProperty("spring.profiles.active", val);
                                }
                            }
                        }
                    }
                } catch (Exception ignored) {
                }
                break;
            }
        }
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
            
            String cleanEmail = adminEmail.trim().toLowerCase();
            String cleanPassword = adminPassword.trim();
            try {
                User user = userRepository.findByEmail(cleanEmail).orElse(null);
                if (user != null) {
                    user.setPasswordHash(passwordEncoder.encode(cleanPassword));
                    user.setRole("ADMIN");
                    user.setIsActive(true);
                    userRepository.save(user);
                    log.info("Admin user password updated successfully for email: {}", cleanEmail);
                } else {
                    User newAdmin = User.builder()
                            .email(cleanEmail)
                            .passwordHash(passwordEncoder.encode(cleanPassword))
                            .fullName(adminFullName != null ? adminFullName.trim() : "Admin User")
                            .role("ADMIN")
                            .isActive(true)
                            .build();
                    userRepository.save(newAdmin);
                    log.info("Admin user created successfully for email: {}", cleanEmail);
                }
            } catch (Exception e) {
                log.error("Failed to initialize users", e);
                throw new RuntimeException("User initialization failed", e);
            }
        };
    }
}
