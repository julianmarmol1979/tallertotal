namespace TallerTotal.Api.Models;

public class ServiceItem
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid ServiceOrderId { get; set; }
    public string Description { get; set; } = string.Empty;
    public ServiceItemType Type { get; set; } = ServiceItemType.Labor;
    public decimal Quantity { get; set; } = 1;
    public decimal UnitPrice { get; set; }
    public decimal Total => Quantity * UnitPrice;

    public ServiceOrder ServiceOrder { get; set; } = null!;
}
