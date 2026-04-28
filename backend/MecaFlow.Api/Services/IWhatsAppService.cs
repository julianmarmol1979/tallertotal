using MecaFlow.Api.Models;

namespace MecaFlow.Api.Services;

public interface IWhatsAppService
{
    Task SendOrderCreatedAsync(ServiceOrder order);
    Task SendStatusChangedAsync(ServiceOrder order, ServiceOrderStatus newStatus);
    Task<WhatsAppStatus> GetStatusAsync();
    Task<string?> SendTestAsync(string phone, string message);
    /// <summary>
    /// Triggers /instance/connect and waits to see if the session auto-restores.
    /// Returns true if state reached "open" without needing a QR scan.
    /// </summary>
    Task<bool> TryReconnectAsync();
}

public record WhatsAppStatus(
    bool IsConfigured,
    string? BaseUrl,
    string? Instance,
    string? ConnectionState,
    string? Error
);
