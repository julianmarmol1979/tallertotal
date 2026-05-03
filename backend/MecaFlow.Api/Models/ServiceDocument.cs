namespace TallerTotal.Api.Models;

/// <summary>
/// A PDF document uploaded by the tenant (e.g. a factory maintenance order received by email).
/// One document may contain multiple scheduled service items.
/// </summary>
public class ServiceDocument
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid TenantId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string StorageUrl { get; set; } = string.Empty;
    public DateTime UploadedAt { get; set; } = DateTime.UtcNow;

    // Populated after AI parsing
    public DateTime? ParsedAt { get; set; }
    public string? VehicleLicensePlate { get; set; }
    public string? VehicleDescription { get; set; }
    public string? Notes { get; set; }

    // Navigation
    public Tenant Tenant { get; set; } = null!;
    public ICollection<ServiceScheduleEntry> Entries { get; set; } = [];
}

/// <summary>
/// A single service item extracted from a ServiceDocument (e.g. "Oil change every 6 months").
/// </summary>
public class ServiceScheduleEntry
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ServiceDocumentId { get; set; }
    public string ServiceType { get; set; } = string.Empty;
    public DateOnly? LastServiceDate { get; set; }
    public int? IntervalMonths { get; set; }
    public int? IntervalKm { get; set; }
    public DateOnly? NextDueDate { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastAlertSentAt { get; set; }

    // Navigation
    public ServiceDocument Document { get; set; } = null!;
}
