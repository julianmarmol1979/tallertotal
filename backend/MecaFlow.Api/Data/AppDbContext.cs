using MecaFlow.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MecaFlow.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<ServiceOrder> ServiceOrders => Set<ServiceOrder>();
    public DbSet<ServiceItem> ServiceItems => Set<ServiceItem>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Customer>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(150).IsRequired();
            e.Property(x => x.Phone).HasMaxLength(30).IsRequired();
            e.Property(x => x.Email).HasMaxLength(150);
        });

        modelBuilder.Entity<Vehicle>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.LicensePlate).HasMaxLength(20).IsRequired();
            e.Property(x => x.Brand).HasMaxLength(60).IsRequired();
            e.Property(x => x.Model).HasMaxLength(60).IsRequired();
            e.Property(x => x.Color).HasMaxLength(40);
            e.HasIndex(x => x.LicensePlate);
            e.HasOne(x => x.Customer)
                .WithMany(x => x.Vehicles)
                .HasForeignKey(x => x.CustomerId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ServiceOrder>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Status).HasConversion<string>();
            e.Property(x => x.TotalEstimate).HasPrecision(10, 2);
            e.Property(x => x.TotalFinal).HasPrecision(10, 2);
            e.Property(x => x.AssignedMechanic).HasMaxLength(100);
            e.HasOne(x => x.Vehicle)
                .WithMany(x => x.ServiceOrders)
                .HasForeignKey(x => x.VehicleId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ServiceItem>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Description).HasMaxLength(200).IsRequired();
            e.Property(x => x.Type).HasConversion<string>();
            e.Property(x => x.Quantity).HasPrecision(10, 2);
            e.Property(x => x.UnitPrice).HasPrecision(10, 2);
            e.Ignore(x => x.Total);
            e.HasOne(x => x.ServiceOrder)
                .WithMany(x => x.Items)
                .HasForeignKey(x => x.ServiceOrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });
    }
}
