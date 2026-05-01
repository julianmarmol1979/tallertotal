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

    private static readonly string[] SpanishMonths =
        ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

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

        // Monthly stats: last 6 months
        var start6Months = startThisMonth.AddMonths(-5);
        var allRelevantOrders = await query
            .Where(o => o.CreatedAt >= start6Months ||
                        (o.Status == ServiceOrderStatus.Completed && o.CompletedAt >= start6Months))
            .Select(o => new
            {
                o.CreatedAt,
                o.CompletedAt,
                o.Status,
                o.TotalFinal
            })
            .ToListAsync();

        var monthlyStats = Enumerable.Range(0, 6)
            .Select(i =>
            {
                var monthStart = startThisMonth.AddMonths(-(5 - i));
                var monthEnd = monthStart.AddMonths(1);
                var label = SpanishMonths[monthStart.Month - 1];
                var orders = allRelevantOrders.Count(o => o.CreatedAt >= monthStart && o.CreatedAt < monthEnd);
                var revenue = allRelevantOrders
                    .Where(o => o.Status == ServiceOrderStatus.Completed
                             && o.CompletedAt >= monthStart
                             && o.CompletedAt < monthEnd)
                    .Sum(o => o.TotalFinal);
                return new MonthlyStatDto(label, revenue, orders);
            })
            .ToList();

        // Mechanic stats: completed orders this month grouped by mechanic
        var mechanicRaw = await query
            .Where(o => o.Status == ServiceOrderStatus.Completed
                     && o.CompletedAt >= startThisMonth
                     && o.AssignedMechanic != null
                     && o.AssignedMechanic != "")
            .GroupBy(o => o.AssignedMechanic!)
            .Select(g => new { Name = g.Key, Orders = g.Count(), Revenue = g.Sum(o => o.TotalFinal) })
            .ToListAsync();
        var mechanicStats = mechanicRaw
            .Select(m => new MechanicStatDto(m.Name, m.Orders, m.Revenue))
            .OrderByDescending(m => m.Orders)
            .ToList();

        // Average ticket: completed orders this month with TotalFinal > 0
        var completedThisMonth = await query
            .Where(o => o.Status == ServiceOrderStatus.Completed
                     && o.CompletedAt >= startThisMonth
                     && o.TotalFinal > 0)
            .Select(o => o.TotalFinal)
            .ToListAsync();
        var avgTicket = completedThisMonth.Count > 0
            ? completedThisMonth.Average()
            : 0m;

        // Overdue count: Open or InProgress with EstimatedDeliveryAt < today
        var today = DateOnly.FromDateTime(now);
        var overdueCount = await query
            .Where(o => (o.Status == ServiceOrderStatus.Open || o.Status == ServiceOrderStatus.InProgress)
                     && o.EstimatedDeliveryAt != null
                     && o.EstimatedDeliveryAt < today)
            .CountAsync();

        // Completion rate: % of orders created this month that are Completed
        var completionRate = ordersThisMonth > 0
            ? (decimal)await query
                .Where(o => o.CreatedAt >= startThisMonth && o.Status == ServiceOrderStatus.Completed)
                .CountAsync() / ordersThisMonth * 100m
            : 0m;

        return new DashboardMetricsDto(
            revenueThisMonth, revenueLastMonth,
            ordersThisMonth, ordersLastMonth,
            byStatus, topMechanic,
            monthlyStats, mechanicStats,
            avgTicket, overdueCount, completionRate);
    }
}
