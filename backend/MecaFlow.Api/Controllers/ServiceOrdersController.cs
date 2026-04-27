using MecaFlow.Api.Data;
using MecaFlow.Api.DTOs;
using MecaFlow.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MecaFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ServiceOrdersController(AppDbContext db) : ControllerBase
{
    private static ServiceOrderDto MapToDto(ServiceOrder o) => new(
        o.Id,
        o.VehicleId,
        o.Vehicle.LicensePlate,
        $"{o.Vehicle.Brand} {o.Vehicle.Model} {o.Vehicle.Year}",
        o.Vehicle.Customer.Name,
        o.Vehicle.Customer.Phone,
        o.Status,
        o.DiagnosisNotes,
        o.MileageIn,
        o.AssignedMechanic,
        o.TotalEstimate,
        o.TotalFinal,
        o.CreatedAt,
        o.CompletedAt,
        o.Items.Select(i => new ServiceItemDto(i.Id, i.Description, i.Type, i.Quantity, i.UnitPrice, i.Total)).ToList()
    );

    private IQueryable<ServiceOrder> BaseQuery() =>
        db.ServiceOrders
            .Include(o => o.Vehicle).ThenInclude(v => v.Customer)
            .Include(o => o.Items);

    [HttpGet]
    public async Task<IEnumerable<ServiceOrderDto>> GetAll(
        [FromQuery] ServiceOrderStatus? status,
        [FromQuery] string? plate,
        [FromQuery] string? customer)
    {
        var query = BaseQuery().AsQueryable();

        if (status.HasValue) query = query.Where(o => o.Status == status);
        if (!string.IsNullOrWhiteSpace(plate)) query = query.Where(o => o.Vehicle.LicensePlate.Contains(plate));
        if (!string.IsNullOrWhiteSpace(customer)) query = query.Where(o => o.Vehicle.Customer.Name.Contains(customer));

        return await query.OrderByDescending(o => o.CreatedAt).Select(o => MapToDto(o)).ToListAsync();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ServiceOrderDto>> GetById(Guid id)
    {
        var order = await BaseQuery().FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return NotFound();
        return MapToDto(order);
    }

    [HttpPost]
    public async Task<ActionResult<ServiceOrderDto>> Create(CreateServiceOrderDto dto)
    {
        if (!await db.Vehicles.AnyAsync(v => v.Id == dto.VehicleId))
            return BadRequest("Vehicle not found.");

        var order = new ServiceOrder
        {
            VehicleId = dto.VehicleId,
            DiagnosisNotes = dto.DiagnosisNotes,
            MileageIn = dto.MileageIn,
            AssignedMechanic = dto.AssignedMechanic,
            Items = dto.Items.Select(i => new ServiceItem
            {
                Description = i.Description,
                Type = i.Type,
                Quantity = i.Quantity,
                UnitPrice = i.UnitPrice
            }).ToList()
        };

        order.TotalEstimate = order.Items.Sum(i => i.Quantity * i.UnitPrice);

        db.ServiceOrders.Add(order);
        await db.SaveChangesAsync();

        var created = await BaseQuery().FirstAsync(o => o.Id == order.Id);
        return CreatedAtAction(nameof(GetById), new { id = order.Id }, MapToDto(created));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<ServiceOrderDto>> Update(Guid id, UpdateServiceOrderDto dto)
    {
        var order = await BaseQuery().FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return NotFound();

        order.Status = dto.Status;
        order.DiagnosisNotes = dto.DiagnosisNotes;
        order.MileageIn = dto.MileageIn;
        order.AssignedMechanic = dto.AssignedMechanic;
        order.TotalEstimate = dto.TotalEstimate;
        order.TotalFinal = dto.TotalFinal;

        if (dto.Status == ServiceOrderStatus.Completed && order.CompletedAt is null)
            order.CompletedAt = DateTime.UtcNow;

        db.ServiceItems.RemoveRange(order.Items);
        order.Items = dto.Items.Select(i => new ServiceItem
        {
            ServiceOrderId = order.Id,
            Description = i.Description,
            Type = i.Type,
            Quantity = i.Quantity,
            UnitPrice = i.UnitPrice
        }).ToList();

        await db.SaveChangesAsync();

        var updated = await BaseQuery().FirstAsync(o => o.Id == id);
        return MapToDto(updated);
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<ActionResult<ServiceOrderDto>> UpdateStatus(Guid id, [FromBody] ServiceOrderStatus status)
    {
        var order = await BaseQuery().FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return NotFound();

        order.Status = status;
        if (status == ServiceOrderStatus.Completed && order.CompletedAt is null)
            order.CompletedAt = DateTime.UtcNow;

        await db.SaveChangesAsync();
        return MapToDto(order);
    }
}
