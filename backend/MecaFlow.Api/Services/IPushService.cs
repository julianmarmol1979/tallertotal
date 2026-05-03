using TallerTotal.Api.Models;

namespace TallerTotal.Api.Services;

public interface IPushService
{
    Task SendOrderAssignedAsync(Mechanic mechanic, ServiceOrder order);
    Task SendStatusChangedAsync(Mechanic mechanic, ServiceOrder order, ServiceOrderStatus newStatus);

    /// <summary>
    /// Sends a test push and returns null on success, or the error message on failure.
    /// Used by the admin panel to diagnose push configuration.
    /// </summary>
    Task<string?> TestAsync(Mechanic mechanic);
    Task SendAgendaAlertAsync(Mechanic mechanic, string serviceType, string licensePlate, int daysLeft);
}
