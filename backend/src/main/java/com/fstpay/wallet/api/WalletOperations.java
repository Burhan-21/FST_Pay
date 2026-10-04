package com.fstpay.wallet.api;

import com.fstpay.user.entity.User;
import com.fstpay.wallet.entity.Wallet;
import java.math.BigDecimal;

public interface WalletOperations {
    Wallet getWalletByUserEmail(String email);
    Wallet topUp(String email, BigDecimal amount, String method);
    Wallet withdraw(String email, BigDecimal amount, String bankName, String accountNumber);
    String transfer(User fromUser, User toUser, BigDecimal amount, String category, String description, String merchant);
}
