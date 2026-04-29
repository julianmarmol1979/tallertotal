using MecaFlow.Api.Data;
using MecaFlow.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace MecaFlow.Api.Services;

/// <summary>
/// Background service that runs every hour and sends WhatsApp reminders
/// for orders that have been inactive for more than WhatsApp:ReminderAfterDays days (default 3).
/// </summary>
public class WhatsAppReminderService(IServiceProvider sp, ILogger<WhatsAppReminderService> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Short initial delay to let the app fully warm up
        await Task.Delay(TimeSpan.FromMinutes(2), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SendRemindersAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                logger.LogError(ex, "WhatsApp reminder service encountered an error");
            }

            await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
        }
    }

    private async Task SendRemindersAsync(CancellationToken ct)
    {
        using var scope = sp.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var config = scope.ServiceProvider.GetRequiredService<IConfiguration>();
        var whatsApp = scope.ServiceProvider.GetRequiredService<IWhatsAppService>();

        var days = config.GetValue<int>("WhatsApp:ReminderAfterDays", 3);
        var threshold = DateTime.UtcNow.AddDays(-days);

        var staleOrders = await db.ServiceOrders
            .Include(o => o.Vehicle).ThenInclude(v => v.Customer)
            .Where(o =>
                (o.Status == ServiceOrderStatus.Open || o.Status == ServiceOrderStatus.InProgress) &&
                o.LastActivityAt < threshold &&
                o.ReminderSentAt == null)
            .ToListAsync(ct);

        if (staleOrders.Count == 0) return;

        logger.LogInformation("WhatsApp reminder: found {Count} stale orders (inactive > {Days}d)", staleOrders.Count, days);

        foreach (var order in staleOrders)
        {
            try
            {
                await whatsApp.SendReminderAsync(order, days);
                order.ReminderSentAt = DateTime.UtcNow;
                logger.LogInformation("Reminder sent for order {OrderId} plate={Plate}", order.Id, order.Vehicle.LicensePlate);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Failed to send reminder for order {OrderId}", order.Id);
            }
        }

        await db.SaveChangesAsync(ct);
    }
}
