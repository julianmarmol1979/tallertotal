using System.ComponentModel.DataAnnotations;

namespace MecaFlow.Api.DTOs;

public record CreateMechanicDto(
    [Required, MaxLength(150)] string Name,
    [MaxLength(30)] string? Phone,
    [MaxLength(100)] string? Specialty
);

public record MechanicDto(
    Guid Id,
    string Name,
    string? Phone,
    string? Specialty,
    bool IsActive
);
