using MecaFlow.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MecaFlow.Api.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Tenant> Tenants => Set<Tenant>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Customer> Customers => Set<Customer>();
    public DbSet<Vehicle> Vehicles => Set<Vehicle>();
    public DbSet<ServiceOrder> ServiceOrders => Set<ServiceOrder>();
    public DbSet<ServiceItem> ServiceItems => Set<ServiceItem>();
    public DbSet<ServiceOrderLog> ServiceOrderLogs => Set<ServiceOrderLog>();
    public DbSet<Mechanic> Mechanics => Set<Mechanic>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Tenant>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(150).IsRequired();
        });

        modelBuilder.Entity<User>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Username).HasMaxLength(60).IsRequired();
            e.Property(x => x.PasswordHash).IsRequired();
            e.Property(x => x.Role).HasConversion<string>();
            e.HasIndex(x => new { x.TenantId, x.Username }).IsUnique();
            e.HasOne(x => x.Tenant)
                .WithMany(x => x.Users)
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Customer>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(150).IsRequired();
            e.Property(x => x.Phone).HasMaxLength(30).IsRequired();
            e.Property(x => x.Email).HasMaxLength(150);
            e.HasOne(x => x.Tenant)
                .WithMany(x => x.Customers)
                .HasForeignKey(x => x.TenantId)
                .OnDelete(DeleteBehavior.Cascade);
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
            e.Property(x => x.QuoteStatus).HasConversion<string>().HasDefaultValue(QuoteStatus.None);
            e.Property(x => x.TotalEstimate).HasPrecision(10, 2);
            e.Property(x => x.TotalFinal).HasPrecision(10, 2);
            e.Property(x => x.AssignedMechanic).HasMaxLength(100);
            e.Property(x => x.InternalNotes).HasMaxLength(1000);
            e.HasOne(x => x.Vehicle)
                .WithMany(x => x.ServiceOrders)
                .HasForeignKey(x => x.VehicleId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<ServiceOrderLog>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Event).HasMaxLength(50).IsRequired();
            e.Property(x => x.OldValue).HasMaxLength(100);
            e.Property(x => x.NewValue).HasMaxLength(100);
            e.Property(x => x.ChangedBy).HasMaxLength(100).IsRequired();
            e.HasOne(x => x.ServiceOrder)
                .WithMany(x => x.Logs)
                .HasForeignKey(x => x.ServiceOrderId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<Mechanic>(e =>
        {
            e.HasKey(x => x.Id);
            e.Property(x => x.Name).HasMaxLength(150).IsRequired();
            e.Property(x => x.Phone).HasMaxLength(30);
            e.Property(x => x.Specialty).HasMaxLength(100);
            e.HasOne(x => x.Tenant)
                .WithMany(x => x.Mechanics)
                .HasForeignKey(x => x.TenantId)
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
