package com.fstpay.card.api;

import com.fstpay.card.dto.CreateCardRequest;
import com.fstpay.card.dto.UpdateLimitRequest;
import com.fstpay.card.entity.VirtualCard;

import java.util.List;
import java.util.UUID;

public interface VirtualCardOperations {
    List<VirtualCard> getCardsByUserEmail(String email);
    VirtualCard createCard(String email, CreateCardRequest request);
    VirtualCard freezeCard(String email, UUID cardId);
    VirtualCard unfreezeCard(String email, UUID cardId);
    VirtualCard updateLimits(String email, UUID cardId, UpdateLimitRequest request);
    void deleteCard(String email, UUID cardId);
    VirtualCard updateDesign(String email, UUID cardId, String cardDesign);
    VirtualCard regenerateCard(String email, UUID cardId);
}
