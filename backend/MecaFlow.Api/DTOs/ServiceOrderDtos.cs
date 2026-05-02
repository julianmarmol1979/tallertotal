using TallerTotal.Api.Models;
using System.ComponentModel.DataAnnotations;

namespace TallerTotal.Api.DTOs;

public record CreateServiceItemDto(
    [MaxLength(200)] string? Description,
    ServiceItemType Type,
    [Range(0.01, double.MaxValue)] decimal Quantity,
    [Range(0, double.MaxValue)] decimal UnitPrice
);

public record ServiceItemDto(
    Guid Id,
    string Description,
    ServiceItemType Type,
    decimal Quantity,
    decimal UnitPrice,
    decimal Total
);

public record CreateServiceOrderDto(
    [Required] Guid VehicleId,
    string? DiagnosisNotes,
    int? MileageIn,
    [MaxLength(100)] string? AssignedMechanic,
    [MaxLength(1000)] string? InternalNotes,
    DateOnly? EstimatedDeliveryAt,
    List<CreateServiceItemDto> Items
);

public record UpdateServiceOrderDto(
    ServiceOrderStatus Status,
    string? DiagnosisNotes,
    int? MileageIn,
    string? AssignedMechanic,
    [MaxLength(1000)] string? InternalNotes,
    DateOnly? EstimatedDeliveryAt,
    decimal TotalEstimate,
    decimal TotalFinal,
    List<CreateServiceItemDto> Items
);

public record ServiceOrderDto(
    Guid Id,
    Guid VehicleId,
    string LicensePlate,
    string VehicleDescription,
    string CustomerName,
    string CustomerPhone,
    ServiceOrderStatus Status,
    string? DiagnosisNotes,
    int? MileageIn,
    string? AssignedMechanic,
    string? InternalNotes,
    DateOnly? EstimatedDeliveryAt,
    decimal TotalEstimate,
    decimal TotalFinal,
    DateTime CreatedAt,
    DateTime? CompletedAt,
    List<ServiceItemDto> Items,
    QuoteStatus QuoteStatus,
    DateTime LastActivityAt,
    Guid PortalToken,
    string? MpPaymentLinkUrl
);

// Public portal DTO — no sensitive internal data
public record PortalOrderDto(
    Guid Id,
    string LicensePlate,
    string VehicleDescription,
    string CustomerName,
    ServiceOrderStatus Status,
    QuoteStatus QuoteStatus,
    string? DiagnosisNotes,
    DateOnly? EstimatedDeliveryAt,
    decimal TotalEstimate,
    decimal TotalFinal,
    DateTime CreatedAt,
    DateTime? CompletedAt,
    List<ServiceItemDto> Items
);

public record ServiceOrderLogDto(
    Guid Id,
    string Event,
    string? OldValue,
    string? NewValue,
    string ChangedBy,
    DateTime ChangedAt
);

public record DashboardMetricsDto(
    decimal RevenueThisMonth,
    decimal RevenueLastMonth,
    int OrdersThisMonth,
    int OrdersLastMonth,
    IEnumerable<StatusCountDto> OrdersByStatus,
    TopMechanicDto? TopMechanic,
    IEnumerable<MonthlyStatDto> MonthlyStats,
    IEnumerable<MechanicStatDto> MechanicStats,
    decimal AvgTicket,
    int OverdueCount,
    decimal CompletionRate
);

public record StatusCountDto(string Status, int Count, decimal Revenue);
public record TopMechanicDto(string Name, int OrderCount);
public record MonthlyStatDto(string Month, decimal Revenue, int Orders);
public record MechanicStatDto(string Name, int Orders, decimal Revenue);
