using TallerTotal.Api.Data;
using TallerTotal.Api.DTOs;
using TallerTotal.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TallerTotal.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController(AppDbContext db) : ControllerBase
{
    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")!.Value);

    [HttpGet("metrics")]
    public async Task<DashboardMetricsDto> GetMetrics()
    {
        var now = DateTime.UtcNow;
        var startThisMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var startLastMonth = startThisMonth.AddMonths(-1);

        var query = db.ServiceOrders
            .Include(o => o.Vehicle).ThenInclude(v => v.Customer)
            .Where(o => o.Vehicle.Customer.TenantId == TenantId);

        // Revenue: sum of TotalFinal for completed orders
        var revenueThisMonth = await query
            .Where(o => o.Status == ServiceOrderStatus.Completed && o.CompletedAt >= startThisMonth)
            .SumAsync(o => o.TotalFinal);

        var revenueLastMonth = await query
            .Where(o => o.Status == ServiceOrderStatus.Completed
                     && o.CompletedAt >= startLastMonth
                     && o.CompletedAt < startThisMonth)
            .SumAsync(o => o.TotalFinal);

        // Orders count
        var ordersThisMonth = await query.Where(o => o.CreatedAt >= startThisMonth).CountAsync();
        var ordersLastMonth = await query
            .Where(o => o.CreatedAt >= startLastMonth && o.CreatedAt < startThisMonth)
            .CountAsync();

        // Orders by status (all time for current tenant)
        var rawStatus = await query
            .GroupBy(o => o.Status)
            .Select(g => new { Status = g.Key, Count = g.Count(), Revenue = g.Sum(o => o.TotalFinal) })
            .ToListAsync();
        var byStatus = rawStatus
            .Select(g => new StatusCountDto(g.Status.ToString(), g.Count, g.Revenue))
            .ToList();

        // Top mechanic this month
        var topRaw = await query
            .Where(o => o.CreatedAt >= startThisMonth
                     && o.AssignedMechanic != null
                     && o.AssignedMechanic != "")
            .GroupBy(o => o.AssignedMechanic!)
            .Select(g => new { Name = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .FirstOrDefaultAsync();

        var topMechanic = topRaw is null ? null : new TopMechanicDto(topRaw.Name, topRaw.Count);

        return new DashboardMetricsDto(
            revenueThisMonth, revenueLastMonth,
            ordersThisMonth, ordersLastMonth,
            byStatus, topMechanic);
    }
}
