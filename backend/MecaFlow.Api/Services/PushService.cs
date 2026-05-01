using WebPush;
using TallerTotal.Api.Data;
using TallerTotal.Api.Models;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace TallerTotal.Api.Services;

/// <summary>
/// Registered as Singleton so it survives beyond individual HTTP request scopes.
/// Uses IServiceScopeFactory to open its own DB scope when needed, avoiding
/// ObjectDisposedException in fire-and-forget push calls.
/// </summary>
public class PushService(
    IConfiguration config,
    ILogger<PushService> logger,
    IServiceScopeFactory scopeFactory,
    IMemoryCache cache) : IPushService
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
        var orderNum = order.Id.ToString()[^8..].ToUpper();
        var label    = StatusLabels.GetValueOrDefault(newStatus, newStatus.ToString());
        return Send(mechanic, new
        {
            title = $"Orden actualizada — {label}",
            body  = $"Orden #{orderNum} · {order.Vehicle.LicensePlate} — {order.Vehicle.Brand} {order.Vehicle.Model}",
            url   = "/ordenes",
        });
    }

    public Task<string?> TestAsync(Mechanic mechanic) =>
        SendInternal(mechanic, new
        {
            title = "🔔 Test de notificación",
            body  = "Push configurado correctamente ✓",
            url   = "/ordenes",
        }, surfaceErrors: true);

    // ── Internal ──────────────────────────────────────────────────────────────

    private Task Send(Mechanic mechanic, object payload) =>
        SendInternal(mechanic, payload, surfaceErrors: false).ContinueWith(_ => { });

    private async Task<string?> SendInternal(Mechanic mechanic, object payload, bool surfaceErrors)
    {
        if (string.IsNullOrWhiteSpace(mechanic.PushSubscriptionJson))
            return surfaceErrors ? "El mecánico no tiene suscripción push guardada." : null;

        var (publicKey, privateKey, subject) = await GetVapidKeysAsync();

        if (string.IsNullOrWhiteSpace(publicKey) || string.IsNullOrWhiteSpace(privateKey))
        {
            logger.LogWarning("Push VAPID keys not configured — skipping push to mechanic {Name}", mechanic.Name);
            return surfaceErrors ? "Claves VAPID no configuradas." : null;
        }

        PushSubscription sub;
        try
        {
            // The browser serialises the subscription as:
            //   { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } }
            // WebPush.PushSubscription expects flat properties, so map manually.
            var opts = new JsonSerializerOptions { PropertyNameCaseInsensitive = true };
            var raw  = JsonSerializer.Deserialize<BrowserPushSubscription>(mechanic.PushSubscriptionJson, opts);
            if (raw is null || string.IsNullOrWhiteSpace(raw.Endpoint))
                return surfaceErrors ? "JSON de suscripción inválido o endpoint vacío." : null;

            sub = new PushSubscription(raw.Endpoint, raw.Keys?.P256dh, raw.Keys?.Auth);
        }
        catch (Exception ex)
        {
            logger.LogWarning("Invalid push subscription JSON for mechanic {Id}", mechanic.Id);
            return surfaceErrors ? $"JSON de suscripción inválido: {ex.Message}" : null;
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
            // Subscription expired — clear it in DB using its own scope
            logger.LogInformation("Push subscription expired for mechanic {Id} — clearing", mechanic.Id);
            _ = ClearSubscriptionAsync(mechanic.Id);
            return surfaceErrors ? "Suscripción expirada (410 Gone) — el mecánico debe reactivar push." : null;
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

    /// <summary>
    /// Reads VAPID keys from cache → DB → env/config (in that order).
    /// Opens its own DB scope so it is safe to call from fire-and-forget tasks.
    /// </summary>
    private async Task<(string? publicKey, string? privateKey, string subject)> GetVapidKeysAsync()
    {
        const string CacheKey = "vapid:keys";

        if (cache.TryGetValue(CacheKey, out (string pub, string priv) hit))
            return (hit.pub, hit.priv, GetSubject());

        // Open a fresh scope — safe even when called from fire-and-forget
        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var dbPublic  = await db.AppSettings.Where(s => s.Key == "Vapid:PublicKey") .Select(s => s.Value).FirstOrDefaultAsync();
        var dbPrivate = await db.AppSettings.Where(s => s.Key == "Vapid:PrivateKey").Select(s => s.Value).FirstOrDefaultAsync();

        if (!string.IsNullOrWhiteSpace(dbPublic) && !string.IsNullOrWhiteSpace(dbPrivate))
        {
            cache.Set(CacheKey, (dbPublic, dbPrivate), TimeSpan.FromMinutes(10));
            return (dbPublic, dbPrivate, GetSubject());
        }

        // Fall back to config / env vars
        var publicKey  = config["Push:VapidPublicKey"]  ?? config["VAPID_PUBLIC_KEY"]
            ?? Environment.GetEnvironmentVariable("Push__VapidPublicKey")
            ?? Environment.GetEnvironmentVariable("VAPID_PUBLIC_KEY");
        var privateKey = config["Push:VapidPrivateKey"] ?? config["VAPID_PRIVATE_KEY"]
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

    private async Task ClearSubscriptionAsync(Guid mechanicId)
    {
        try
        {
            using var scope    = scopeFactory.CreateScope();
            var db             = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var mechanic       = await db.Mechanics.FindAsync(mechanicId);
            if (mechanic is null) return;
            mechanic.PushSubscriptionJson = null;
            await db.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to clear expired push subscription for mechanic {Id}", mechanicId);
        }
    }

    // ── Browser subscription JSON shape ──────────────────────────────────────

    private sealed class BrowserPushSubscription
    {
        public string Endpoint { get; set; } = string.Empty;
        public BrowserPushKeys? Keys { get; set; }
    }

    private sealed class BrowserPushKeys
    {
        [JsonPropertyName("p256dh")] public string? P256dh { get; set; }
        [JsonPropertyName("auth")]   public string? Auth   { get; set; }
    }
}
