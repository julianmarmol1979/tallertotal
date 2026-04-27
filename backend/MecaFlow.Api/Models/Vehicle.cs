namespace MecaFlow.Api.Models;

public class Vehicle
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CustomerId { get; set; }
    public string LicensePlate { get; set; } = string.Empty;
    public string Brand { get; set; } = string.Empty;
    public string Model { get; set; } = string.Empty;
    public int Year { get; set; }
    public string? Color { get; set; }
    public string? Notes { get; set; }

    public Customer Customer { get; set; } = null!;
    public ICollection<ServiceOrder> ServiceOrders { get; set; } = [];
}
