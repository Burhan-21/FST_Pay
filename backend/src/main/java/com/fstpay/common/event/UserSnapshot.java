package com.fstpay.common.event;

import com.fstpay.user.entity.User;
import java.util.UUID;

public record UserSnapshot(
    UUID id,
    String email,
    String fullName
) {
    public static UserSnapshot from(User user) {
        if (user == null) {
            return null;
        }
        return new UserSnapshot(user.getId(), user.getEmail(), user.getFullName());
    }
}
