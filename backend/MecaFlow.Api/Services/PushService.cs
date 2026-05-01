using WebPush;
using TallerTotal.Api.Data;
using TallerTotal.Api.Models;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace TallerTotal.Api.Services;

public class PushService(IConfiguration config, ILogger<PushService> logger, AppDbContext db) : IPushService
{
    private static readonly Dictionary<ServiceOrderStatus, string> StatusLabels = new()
    {
        [ServiceOrderStatus.Open]       = "Abierta",
        [ServiceOrderStatus.InProgress] = "En progreso",
        [ServiceOrderStatus.Completed]  = "Completada",
        [ServiceOrderStatus.Cancelled]  = "Cancelada",
    };

    public Task SendOrderAssignedAsync(Mechanic mechanic, ServiceOrder order)
    {
        var orderNum = order.Id.ToString()[^8..].ToUpper();
        return Send(mechanic, new
        {
            title = "Nueva orden asignada 🔧",
            body  = $"Orden #{orderNum} · {order.Vehicle.LicensePlate} — {order.Vehicle.Brand} {order.Vehicle.Model}",
            url   = "/ordenes",
        });
    }

    public Task SendStatusChangedAsync(Mechanic mechanic, ServiceOrder order, ServiceOrderStatus newStatus)
    {
        var orderNum   = order.Id.ToString()[^8..].ToUpper();
        var label      = StatusLabels.GetValueOrDefault(newStatus, newStatus.ToString());
        return Send(mechanic, new
        {
            title = $"Orden actualizada — {label}",
            body  = $"Orden #{orderNum} · {order.Vehicle.LicensePlate} — {order.Vehicle.Brand} {order.Vehicle.Model}",
            url   = "/ordenes",
        });
    }

    /// <summary>
    /// Reads VAPID keys: DB takes priority over env vars / appsettings.
    /// This lets admins configure keys via the admin panel without needing
    /// Railway environment variables to work.
    /// </summary>
    private async Task<(string? publicKey, string? privateKey, string subject)> GetVapidKeysAsync()
    {
        // 1. Try database (set via admin panel)
        var dbPublic  = await db.AppSettings.Where(s => s.Key == "Vapid:PublicKey").Select(s => s.Value).FirstOrDefaultAsync();
        var dbPrivate = await db.AppSettings.Where(s => s.Key == "Vapid:PrivateKey").Select(s => s.Value).FirstOrDefaultAsync();
        if (!string.IsNullOrWhiteSpace(dbPublic) && !string.IsNullOrWhiteSpace(dbPrivate))
            return (dbPublic, dbPrivate, GetSubject());

        // 2. Fall back to config / env vars (multiple naming conventions for Railway compatibility)
        var publicKey  = config["Push:VapidPublicKey"]
            ?? config["VAPID_PUBLIC_KEY"]
            ?? Environment.GetEnvironmentVariable("Push__VapidPublicKey")
            ?? Environment.GetEnvironmentVariable("VAPID_PUBLIC_KEY");
        var privateKey = config["Push:VapidPrivateKey"]
            ?? config["VAPID_PRIVATE_KEY"]
            ?? Environment.GetEnvironmentVariable("Push__VapidPrivateKey")
            ?? Environment.GetEnvironmentVariable("VAPID_PRIVATE_KEY");

        return (publicKey, privateKey, GetSubject());
    }

    private string GetSubject() =>
        config["Push:VapidSubject"]
        ?? config["VAPID_SUBJECT"]
        ?? Environment.GetEnvironmentVariable("Push__VapidSubject")
        ?? Environment.GetEnvironmentVariable("VAPID_SUBJECT")
        ?? "mailto:admin@tallertotal.app";

    private async Task Send(Mechanic mechanic, object payload)
    {
        if (string.IsNullOrWhiteSpace(mechanic.PushSubscriptionJson)) return;

        var (publicKey, privateKey, subject) = await GetVapidKeysAsync();

        if (string.IsNullOrWhiteSpace(publicKey) || string.IsNullOrWhiteSpace(privateKey))
        {
            logger.LogWarning("Push VAPID keys not configured — skipping push to mechanic {Name}", mechanic.Name);
            return;
        }

        PushSubscription? sub;
        try { sub = JsonSerializer.Deserialize<PushSubscription>(mechanic.PushSubscriptionJson); }
        catch
        {
            logger.LogWarning("Invalid push subscription JSON for mechanic {Id}", mechanic.Id);
            return;
        }
        if (sub is null) return;

        var json         = JsonSerializer.Serialize(payload);
        var vapidDetails = new VapidDetails(subject, publicKey, privateKey);
        var client       = new WebPushClient();

        try
        {
            await client.SendNotificationAsync(sub, json, vapidDetails);
        }
        catch (WebPushException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Gone)
        {
            logger.LogInformation("Push subscription expired for mechanic {Id} — clearing", mechanic.Id);
            mechanic.PushSubscriptionJson = null;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send push to mechanic {Id}", mechanic.Id);
        }
    }
}
