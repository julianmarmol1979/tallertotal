using TallerTotal.Api.Data;
using TallerTotal.Api.DTOs;
using TallerTotal.Api.Models;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TallerTotal.Api.Controllers;

[ApiController]
[Route("api/portal")]
public class PortalController(AppDbContext db) : ControllerBase
{
    [HttpGet("{token:guid}")]
    public async Task<ActionResult<PortalOrderDto>> GetByToken(Guid token)
    {
        var order = await db.ServiceOrders
            .Include(o => o.Vehicle).ThenInclude(v => v.Customer)
            .Include(o => o.Items)
            .FirstOrDefaultAsync(o => o.PortalToken == token);

        if (order is null) return NotFound();

        return new PortalOrderDto(
            order.Id,
            order.Vehicle.LicensePlate,
            $"{order.Vehicle.Brand} {order.Vehicle.Model} {order.Vehicle.Year}",
            order.Vehicle.Customer.Name,
            order.Status,
            order.QuoteStatus,
            order.DiagnosisNotes,
            order.EstimatedDeliveryAt,
            order.TotalEstimate,
            order.TotalFinal,
            order.CreatedAt,
            order.CompletedAt,
            order.Items.Select(i => new ServiceItemDto(i.Id, i.Description, i.Type, i.Quantity, i.UnitPrice, i.Total)).ToList()
        );
    }
}
