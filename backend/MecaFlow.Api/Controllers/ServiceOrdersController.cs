using MecaFlow.Api.Data;
using MecaFlow.Api.DTOs;
using MecaFlow.Api.Models;
using MecaFlow.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MecaFlow.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ServiceOrdersController(AppDbContext db, IWhatsAppService whatsApp) : ControllerBase
{
    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")!.Value);
    private string CurrentUser => User.Identity?.Name ?? "unknown";

    private static ServiceOrderDto MapToDto(ServiceOrder o) => new(
        o.Id, o.VehicleId, o.Vehicle.LicensePlate,
        $"{o.Vehicle.Brand} {o.Vehicle.Model} {o.Vehicle.Year}",
        o.Vehicle.Customer.Name, o.Vehicle.Customer.Phone,
        o.Status, o.DiagnosisNotes, o.MileageIn, o.AssignedMechanic,
        o.InternalNotes, o.EstimatedDeliveryAt,
        o.TotalEstimate, o.TotalFinal, o.CreatedAt, o.CompletedAt,
        o.Items.Select(i => new ServiceItemDto(i.Id, i.Description, i.Type, i.Quantity, i.UnitPrice, i.Total)).ToList(),
        o.QuoteStatus, o.LastActivityAt
    );

    private IQueryable<ServiceOrder> BaseQuery() =>
        db.ServiceOrders
            .Include(o => o.Vehicle).ThenInclude(v => v.Customer)
            .Include(o => o.Items)
            .Where(o => o.Vehicle.Customer.TenantId == TenantId);

    [HttpGet]
    public async Task<IEnumerable<ServiceOrderDto>> GetAll(
        [FromQuery] ServiceOrderStatus? status,
        [FromQuery] string? plate,
        [FromQuery] string? customer,
        [FromQuery] string? mechanic,
        [FromQuery] Guid? vehicleId,
        [FromQuery] DateOnly? dateFrom,
        [FromQuery] DateOnly? dateTo)
    {
        var query = BaseQuery().AsQueryable();
        if (status.HasValue) query = query.Where(o => o.Status == status);
        if (!string.IsNullOrWhiteSpace(plate)) query = query.Where(o => o.Vehicle.LicensePlate.Contains(plate));
        if (!string.IsNullOrWhiteSpace(customer)) query = query.Where(o => o.Vehicle.Customer.Name.Contains(customer));
        if (!string.IsNullOrWhiteSpace(mechanic)) query = query.Where(o => o.AssignedMechanic != null && o.AssignedMechanic.Contains(mechanic));
        if (vehicleId.HasValue) query = query.Where(o => o.VehicleId == vehicleId);
        if (dateFrom.HasValue)
        {
            var from = dateFrom.Value.ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            query = query.Where(o => o.CreatedAt >= from);
        }
        if (dateTo.HasValue)
        {
            var to = dateTo.Value.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Utc);
            query = query.Where(o => o.CreatedAt < to);
        }
        return await query.OrderByDescending(o => o.CreatedAt).Select(o => MapToDto(o)).ToListAsync();
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<ServiceOrderDto>> GetById(Guid id)
    {
        var order = await BaseQuery().FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return NotFound();
        return MapToDto(order);
    }

    [HttpGet("{id:guid}/logs")]
    public async Task<ActionResult<IEnumerable<ServiceOrderLogDto>>> GetLogs(Guid id)
    {
        var exists = await BaseQuery().AnyAsync(o => o.Id == id);
        if (!exists) return NotFound();

        var logs = await db.ServiceOrderLogs
            .Where(l => l.ServiceOrderId == id)
            .OrderByDescending(l => l.ChangedAt)
            .Select(l => new ServiceOrderLogDto(l.Id, l.Event, l.OldValue, l.NewValue, l.ChangedBy, l.ChangedAt))
            .ToListAsync();

        return Ok(logs);
    }

    [HttpPost]
    public async Task<ActionResult<ServiceOrderDto>> Create(CreateServiceOrderDto dto)
    {
        if (!await db.Vehicles.AnyAsync(v => v.Id == dto.VehicleId && v.Customer.TenantId == TenantId))
            return BadRequest("Vehicle not found.");

        var order = new ServiceOrder
        {
            VehicleId = dto.VehicleId,
            DiagnosisNotes = dto.DiagnosisNotes,
            MileageIn = dto.MileageIn,
            AssignedMechanic = dto.AssignedMechanic,
            InternalNotes = dto.InternalNotes,
            EstimatedDeliveryAt = dto.EstimatedDeliveryAt,
            Items = dto.Items.Select(i => new ServiceItem
            {
                Description = i.Description, Type = i.Type, Quantity = i.Quantity, UnitPrice = i.UnitPrice
            }).ToList()
        };
        order.TotalEstimate = order.Items.Sum(i => i.Quantity * i.UnitPrice);

        db.ServiceOrders.Add(order);
        db.ServiceOrderLogs.Add(new ServiceOrderLog
        {
            ServiceOrderId = order.Id,
            Event = "Created",
            NewValue = "Open",
            ChangedBy = CurrentUser
        });
        await db.SaveChangesAsync();

        var created = await BaseQuery().FirstAsync(o => o.Id == order.Id);
        _ = whatsApp.SendOrderCreatedAsync(created);
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
        order.InternalNotes = dto.InternalNotes;
        order.EstimatedDeliveryAt = dto.EstimatedDeliveryAt;
        order.TotalEstimate = dto.TotalEstimate;
        order.TotalFinal = dto.TotalFinal;
        order.LastActivityAt = DateTime.UtcNow;
        order.ReminderSentAt = null;

        if (dto.Status == ServiceOrderStatus.Completed && order.CompletedAt is null)
            order.CompletedAt = DateTime.UtcNow;

        db.ServiceItems.RemoveRange(order.Items);
        order.Items = dto.Items.Select(i => new ServiceItem
        {
            ServiceOrderId = order.Id, Description = i.Description,
            Type = i.Type, Quantity = i.Quantity, UnitPrice = i.UnitPrice
        }).ToList();

        db.ServiceOrderLogs.Add(new ServiceOrderLog
        {
            ServiceOrderId = order.Id,
            Event = "Updated",
            ChangedBy = CurrentUser
        });

        await db.SaveChangesAsync();
        return MapToDto(await BaseQuery().FirstAsync(o => o.Id == id));
    }

    [HttpPatch("{id:guid}/status")]
    public async Task<ActionResult<ServiceOrderDto>> UpdateStatus(Guid id, [FromBody] ServiceOrderStatus status)
    {
        var order = await BaseQuery().FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return NotFound();

        var oldStatus = order.Status.ToString();
        order.Status = status;
        order.LastActivityAt = DateTime.UtcNow;
        order.ReminderSentAt = null;

        if (status == ServiceOrderStatus.Completed && order.CompletedAt is null)
            order.CompletedAt = DateTime.UtcNow;

        db.ServiceOrderLogs.Add(new ServiceOrderLog
        {
            ServiceOrderId = order.Id,
            Event = "StatusChanged",
            OldValue = oldStatus,
            NewValue = status.ToString(),
            ChangedBy = CurrentUser
        });

        await db.SaveChangesAsync();
        _ = whatsApp.SendStatusChangedAsync(order, status);
        return MapToDto(order);
    }

    [HttpPatch("{id:guid}/quote")]
    public async Task<ActionResult<ServiceOrderDto>> UpdateQuote(Guid id, [FromBody] QuoteStatus quoteStatus)
    {
        var order = await BaseQuery().FirstOrDefaultAsync(o => o.Id == id);
        if (order is null) return NotFound();

        var oldQuote = order.QuoteStatus.ToString();
        order.QuoteStatus = quoteStatus;
        order.LastActivityAt = DateTime.UtcNow;
        order.ReminderSentAt = null;

        db.ServiceOrderLogs.Add(new ServiceOrderLog
        {
            ServiceOrderId = order.Id,
            Event = "QuoteStatusChanged",
            OldValue = oldQuote,
            NewValue = quoteStatus.ToString(),
            ChangedBy = CurrentUser
        });

        await db.SaveChangesAsync();

        if (quoteStatus == QuoteStatus.Pending)
            _ = whatsApp.SendQuoteAsync(order);

        return MapToDto(order);
    }
}
