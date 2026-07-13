package com.fstpay.parent.dto;

import com.fstpay.user.dto.ChildSummaryDto;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class ParentDashboardDto {
    private List<ChildSummaryDto> children;
    private BigDecimal totalChildrenBalance;
    private BigDecimal totalPocketMoneySentThisMonth;
    private long pendingApprovalsCount;
    private List<ParentNotificationDto> recentNotifications;
    private List<ActivityTimelineDto> activityTimeline;
}
