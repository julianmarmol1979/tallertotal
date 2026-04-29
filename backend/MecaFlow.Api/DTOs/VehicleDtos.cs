using System.ComponentModel.DataAnnotations;

namespace TallerTotal.Api.DTOs;

public record CreateVehicleDto(
    [Required] Guid CustomerId,
    [Required, MaxLength(20)] string LicensePlate,
    [Required, MaxLength(60)] string Brand,
    [Required, MaxLength(60)] string Model,
    [Range(1900, 2100)] int Year,
    [MaxLength(40)] string? Color,
    string? Notes
);

public record VehicleDto(
    Guid Id,
    Guid CustomerId,
    string CustomerName,
    string LicensePlate,
    string Brand,
    string Model,
    int Year,
    string? Color,
    string? Notes
);
