package com.fstpay.common.rule;

import com.fstpay.transaction.dto.SimulateSpendRequest;
import com.fstpay.user.entity.User;
import com.fstpay.wallet.entity.Wallet;

public interface TransactionRule {
    RuleEvaluationResult evaluate(User user, Wallet wallet, SimulateSpendRequest request);
}
