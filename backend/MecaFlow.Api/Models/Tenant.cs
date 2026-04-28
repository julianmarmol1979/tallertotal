namespace MecaFlow.Api.Models;

public class Tenant
{
    public Guid Id { get; set; }
    public string Name { get; set; } = "";
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<User> Users { get; set; } = [];
    public ICollection<Customer> Customers { get; set; } = [];
    public ICollection<Mechanic> Mechanics { get; set; } = [];
}
