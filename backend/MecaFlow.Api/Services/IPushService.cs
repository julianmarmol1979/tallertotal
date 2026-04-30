using TallerTotal.Api.Models;

namespace TallerTotal.Api.Services;

public interface IPushService
{
    Task SendOrderAssignedAsync(Mechanic mechanic, ServiceOrder order);
}
