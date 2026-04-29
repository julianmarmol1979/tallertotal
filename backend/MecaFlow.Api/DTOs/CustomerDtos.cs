using System.ComponentModel.DataAnnotations;

namespace TallerTotal.Api.DTOs;

public record CreateCustomerDto(
    [Required, MaxLength(150)] string Name,
    [Required, MaxLength(30)] string Phone,
    [MaxLength(150), EmailAddress] string? Email
);

public record CustomerDto(
    Guid Id,
    string Name,
    string Phone,
    string? Email,
    DateTime CreatedAt,
    int VehicleCount
);
