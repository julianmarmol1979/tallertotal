namespace TallerTotal.Api.Models;

public class ServiceOrder
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid VehicleId { get; set; }
    public ServiceOrderStatus Status { get; set; } = ServiceOrderStatus.Open;
    public string? DiagnosisNotes { get; set; }
    public int? MileageIn { get; set; }
    public string? AssignedMechanic { get; set; }
    public string? InternalNotes { get; set; }
    public DateOnly? EstimatedDeliveryAt { get; set; }
    public decimal TotalEstimate { get; set; }
    public decimal TotalFinal { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public QuoteStatus QuoteStatus { get; set; } = QuoteStatus.None;
    public DateTime LastActivityAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReminderSentAt { get; set; }

    public Guid PortalToken { get; set; } = Guid.NewGuid();

    /// <summary>Mercado Pago Checkout Pro init_point URL, set when a payment link is generated.</summary>
    public string? MpPaymentLinkUrl { get; set; }

    public Vehicle Vehicle { get; set; } = null!;
    public ICollection<ServiceItem> Items { get; set; } = [];
    public ICollection<ServiceOrderLog> Logs { get; set; } = [];
}
