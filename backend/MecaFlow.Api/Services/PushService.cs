using WebPush;
using TallerTotal.Api.Data;
using TallerTotal.Api.Models;
using System.Text.Json;
using System.Text.Json.Serialization;
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

    // ── Browser subscription JSON shape ─────────────────────────────────────────

    private sealed class BrowserPushSubscription
    {
        public string Endpoint { get; set; } = string.Empty;
        public BrowserPushKeys? Keys { get; set; }
    }

    private sealed class BrowserPushKeys
    {
        [JsonPropertyName("p256dh")]
        public string? P256dh { get; set; }
        [JsonPropertyName("auth")]
        public string? Auth { get; set; }
    }

    private string GetSubject() =>
        config["Push:VapidSubject"]
        ?? config["VAPID_SUBJECT"]
        ?? Environment.GetEnvironmentVariable("Push__VapidSubject")
        ?? Environment.GetEnvironmentVariable("VAPID_SUBJECT")
        ?? "mailto:admin@tallertotal.app";

    public Task<string?> TestAsync(Mechanic mechanic) =>
        SendInternal(mechanic, new
        {
            title = "🔔 Test de notificación",
            body  = "Push configurado correctamente ✓",
            url   = "/ordenes",
        }, surfaceErrors: true);

    private Task Send(Mechanic mechanic, object payload) =>
        SendInternal(mechanic, payload, surfaceErrors: false).ContinueWith(_ => { });

    /// <summary>
    /// Core send logic.
    /// surfaceErrors=true  → throws / returns error string (used by TestAsync)
    /// surfaceErrors=false → swallows errors, only logs (fire-and-forget callers)
    /// </summary>
    private async Task<string?> SendInternal(Mechanic mechanic, object payload, bool surfaceErrors)
    {
        if (string.IsNullOrWhiteSpace(mechanic.PushSubscriptionJson))
            return surfaceErrors ? "El mecánico no tiene suscripción push guardada." : null;

        var (publicKey, privateKey, subject) = await GetVapidKeysAsync();

        if (string.IsNullOrWhiteSpace(publicKey) || string.IsNullOrWhiteSpace(privateKey))
        {
            const string msg = "Claves VAPID no configuradas.";
            logger.LogWarning("Push VAPID keys not configured — skipping push to mechanic {Name}", mechanic.Name);
            return surfaceErrors ? msg : null;
        }

        // The browser stores the subscription as:
        // { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } }
        // WebPush.PushSubscription has flat properties (Endpoint, P256DH, Auth),
        // so we must deserialise into our own model first.
        PushSubscription sub;
        try
        {
            var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var raw  = JsonSerializer.Deserialize<BrowserPushSubscription>(mechanic.PushSubscriptionJson, opts);
            if (raw is null || string.IsNullOrWhiteSpace(raw.Endpoint))
                return surfaceErrors ? "JSON de suscripción inválido o endpoint vacío." : null;

            sub = new PushSubscription(raw.Endpoint, raw.Keys?.P256dh, raw.Keys?.Auth);
        }
        catch (Exception ex)
        {
            var msg = $"JSON de suscripción inválido: {ex.Message}";
            logger.LogWarning("Invalid push subscription JSON for mechanic {Id}", mechanic.Id);
            return surfaceErrors ? msg : null;
        }

        var json         = JsonSerializer.Serialize(payload);
        var vapidDetails = new VapidDetails(subject, publicKey, privateKey);
        var client       = new WebPushClient();

        try
        {
            await client.SendNotificationAsync(sub, json, vapidDetails);
            return null; // success
        }
        catch (WebPushException ex) when (ex.StatusCode == System.Net.HttpStatusCode.Gone)
        {
            logger.LogInformation("Push subscription expired for mechanic {Id} — clearing", mechanic.Id);
            mechanic.PushSubscriptionJson = null;
            return surfaceErrors ? $"Suscripción expirada (410 Gone) — el mecánico debe reactivar push." : null;
        }
        catch (WebPushException ex)
        {
            var msg = $"WebPushException {(int)ex.StatusCode}: {ex.Message}";
            logger.LogError(ex, "WebPush error for mechanic {Id}", mechanic.Id);
            return surfaceErrors ? msg : null;
        }
        catch (Exception ex)
        {
            var msg = $"{ex.GetType().Name}: {ex.Message}";
            logger.LogError(ex, "Failed to send push to mechanic {Id}", mechanic.Id);
            return surfaceErrors ? msg : null;
        }
    }
}
