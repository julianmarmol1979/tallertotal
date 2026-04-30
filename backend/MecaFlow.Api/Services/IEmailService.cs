using TallerTotal.Api.Models;

namespace TallerTotal.Api.Services;

public interface IEmailService
{
    Task SendOrderCreatedAsync(ServiceOrder order);
    Task SendStatusChangedAsync(ServiceOrder order, ServiceOrderStatus newStatus);
    Task SendQuoteAsync(ServiceOrder order);
}
