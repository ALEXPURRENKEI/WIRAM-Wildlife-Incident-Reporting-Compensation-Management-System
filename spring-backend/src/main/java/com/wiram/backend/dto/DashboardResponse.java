package com.wiram.backend.dto;

import java.util.List;

public record DashboardResponse(
    long totalReports,
    long pendingReports,
    long verifiedReports,
    long rejectedReports,
    long paidReports,
    long approvedReports,
    long memberCount,
    long officerCount,
    long adminCount,
    List<ReportListResponse> recentReports,
    List<StatusCountResponse> statusBreakdown,
    List<MonthlyCountResponse> monthlyTrend) {}
