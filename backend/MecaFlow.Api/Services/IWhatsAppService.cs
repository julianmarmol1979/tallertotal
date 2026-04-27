using MecaFlow.Api.Models;

namespace MecaFlow.Api.Services;

public interface IWhatsAppService
{
    Task SendOrderCreatedAsync(ServiceOrder order);
    Task SendStatusChangedAsync(ServiceOrder order, ServiceOrderStatus newStatus);
}
