using MecaFlow.Api.Models;

namespace MecaFlow.Api.Services;

public interface IWhatsAppService
{
    Task SendOrderCreatedAsync(ServiceOrder order);
    Task SendStatusChangedAsync(ServiceOrder order, ServiceOrderStatus newStatus);
    Task<WhatsAppStatus> GetStatusAsync();
    Task<string?> SendTestAsync(string phone, string message);
}

public record WhatsAppStatus(
    bool IsConfigured,
    string? BaseUrl,
    string? Instance,
    string? ConnectionState,
    string? Error
);
