using MecaFlow.Api.Models;
using System.ComponentModel.DataAnnotations;

namespace MecaFlow.Api.DTOs;

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
    List<CreateServiceItemDto> Items
);

public record UpdateServiceOrderDto(
    ServiceOrderStatus Status,
    string? DiagnosisNotes,
    int? MileageIn,
    string? AssignedMechanic,
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
    decimal TotalEstimate,
    decimal TotalFinal,
    DateTime CreatedAt,
    DateTime? CompletedAt,
    List<ServiceItemDto> Items
);
