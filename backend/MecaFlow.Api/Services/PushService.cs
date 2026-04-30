using WebPush;
using TallerTotal.Api.Models;
using System.Text.Json;

namespace TallerTotal.Api.Services;

public class PushService(IConfiguration config, ILogger<PushService> logger) : IPushService
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

    private async Task Send(Mechanic mechanic, object payload)
    {
        if (string.IsNullOrWhiteSpace(mechanic.PushSubscriptionJson)) return;

        var publicKey  = config["Push:VapidPublicKey"];
        var privateKey = config["Push:VapidPrivateKey"];
        var subject    = config["Push:VapidSubject"] ?? "mailto:admin@tallertotal.app";

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
