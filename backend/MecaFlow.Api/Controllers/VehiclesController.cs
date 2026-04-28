using MecaFlow.Api.Data;
using MecaFlow.Api.DTOs;
using MecaFlow.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MecaFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class VehiclesController(AppDbContext db) : ControllerBase
{
    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")!.Value);

    [HttpGet]
    public async Task<IEnumerable<VehicleDto>> GetAll([FromQuery] string? plate, [FromQuery] Guid? customerId)
    {
        var query = db.Vehicles
            .Include(v => v.Customer)
            .Where(v => v.Customer.TenantId == TenantId)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(plate))
            query = query.Where(v => v.LicensePlate.Contains(plate));

        if (customerId.HasValue)
            query = query.Where(v => v.CustomerId == customerId);

        return await query
            .Select(v => new VehicleDto(v.Id, v.CustomerId, v.Customer.Name, v.LicensePlate, v.Brand, v.Model, v.Year, v.Color, v.Notes))
            .ToListAsync();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<VehicleDto>> GetById(Guid id)
    {
        var v = await db.Vehicles
            .Include(x => x.Customer)
            .FirstOrDefaultAsync(x => x.Id == id && x.Customer.TenantId == TenantId);
        if (v is null) return NotFound();
        return new VehicleDto(v.Id, v.CustomerId, v.Customer.Name, v.LicensePlate, v.Brand, v.Model, v.Year, v.Color, v.Notes);
    }

    [HttpPost]
    public async Task<ActionResult<VehicleDto>> Create(CreateVehicleDto dto)
    {
        if (!await db.Customers.AnyAsync(c => c.Id == dto.CustomerId && c.TenantId == TenantId))
            return BadRequest("Customer not found.");

        var vehicle = new Vehicle
        {
            CustomerId = dto.CustomerId,
            LicensePlate = dto.LicensePlate.ToUpperInvariant(),
            Brand = dto.Brand,
            Model = dto.Model,
            Year = dto.Year,
            Color = dto.Color,
            Notes = dto.Notes
        };
        db.Vehicles.Add(vehicle);
        await db.SaveChangesAsync();

        await db.Entry(vehicle).Reference(v => v.Customer).LoadAsync();
        return CreatedAtAction(nameof(GetById), new { id = vehicle.Id },
            new VehicleDto(vehicle.Id, vehicle.CustomerId, vehicle.Customer.Name, vehicle.LicensePlate, vehicle.Brand, vehicle.Model, vehicle.Year, vehicle.Color, vehicle.Notes));
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var vehicle = await db.Vehicles
            .Include(v => v.Customer)
            .Include(v => v.ServiceOrders)
                .ThenInclude(o => o.Items)
            .FirstOrDefaultAsync(v => v.Id == id && v.Customer.TenantId == TenantId);
        if (vehicle is null) return NotFound();

        // Remove service items, orders, then vehicle explicitly to avoid FK issues
        foreach (var order in vehicle.ServiceOrders)
            db.ServiceItems.RemoveRange(order.Items);
        db.ServiceOrders.RemoveRange(vehicle.ServiceOrders);
        db.Vehicles.Remove(vehicle);

        await db.SaveChangesAsync();
        return NoContent();
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<VehicleDto>> Update(Guid id, CreateVehicleDto dto)
    {
        var vehicle = await db.Vehicles
            .Include(v => v.Customer)
            .FirstOrDefaultAsync(v => v.Id == id && v.Customer.TenantId == TenantId);
        if (vehicle is null) return NotFound();

        vehicle.LicensePlate = dto.LicensePlate.ToUpperInvariant();
        vehicle.Brand = dto.Brand;
        vehicle.Model = dto.Model;
        vehicle.Year = dto.Year;
        vehicle.Color = dto.Color;
        vehicle.Notes = dto.Notes;
        await db.SaveChangesAsync();

        return new VehicleDto(vehicle.Id, vehicle.CustomerId, vehicle.Customer.Name, vehicle.LicensePlate, vehicle.Brand, vehicle.Model, vehicle.Year, vehicle.Color, vehicle.Notes);
    }
}
