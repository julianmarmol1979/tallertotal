using TallerTotal.Api.Models;

namespace TallerTotal.Api.Services;

public interface IWhatsAppService
{
    Task SendOrderCreatedAsync(ServiceOrder order);
    Task SendStatusChangedAsync(ServiceOrder order, ServiceOrderStatus newStatus);
    Task SendQuoteAsync(ServiceOrder order);
    Task SendReminderAsync(ServiceOrder order, int daysSinceActivity);
    Task<WhatsAppStatus> GetStatusAsync();
    Task<string?> SendTestAsync(string phone, string message);
    /// <summary>
    /// Triggers /instance/connect and waits to see if the session auto-restores.
    /// Returns true if state reached "open" without needing a QR scan.
    /// </summary>
    Task<bool> TryReconnectAsync();

    /// <summary>
    /// Returns the QR code (base64 data URL) needed to reconnect a disconnected instance.
    /// Returns null if already connected or not configured.
    /// </summary>
    Task<WhatsAppQrResult> GetQrAsync();
}

public record WhatsAppStatus(
    bool IsConfigured,
    string? BaseUrl,
    string? Instance,
    string? ConnectionState,
    string? Error
);

public record WhatsAppQrResult(
    bool IsConfigured,
    bool IsAlreadyConnected,
    string? QrBase64,
    string? Error
);

public record WhatsAppStatus(
    bool IsConfigured,
    string? BaseUrl,
    string? Instance,
    string? ConnectionState,
    string? Error
);
