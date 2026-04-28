namespace MecaFlow.Api.Services;

/// <summary>
/// Background service that monitors the Evolution API WhatsApp instance
/// and automatically attempts to reconnect when the state is "close".
/// Runs on startup and then every 5 minutes.
/// </summary>
public class WhatsAppHealthService(
    IWhatsAppService whatsApp,
    ILogger<WhatsAppHealthService> logger) : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromMinutes(5);
    private int _consecutiveFailures;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Brief startup delay so the rest of the app can finish initializing
        await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            await CheckAndHealAsync();
            await Task.Delay(CheckInterval, stoppingToken);
        }
    }

    private async Task CheckAndHealAsync()
    {
        try
        {
            var status = await whatsApp.GetStatusAsync();

            if (!status.IsConfigured)
            {
                logger.LogDebug("WhatsApp health: not configured, skipping check");
                return;
            }

            var state = status.ConnectionState?.ToLower();
            logger.LogDebug("WhatsApp health check — state: {State}", state);

            if (state == "open")
            {
                _consecutiveFailures = 0;
                return;
            }

            // State is "close", "closed", or an error — attempt auto-reconnect
            logger.LogWarning("WhatsApp instance state is '{State}' — attempting auto-reconnect", state);

            var reconnected = await whatsApp.TryReconnectAsync();

            if (reconnected)
            {
                _consecutiveFailures = 0;
                logger.LogInformation("WhatsApp auto-reconnect successful");
            }
            else
            {
                _consecutiveFailures++;
                logger.LogWarning(
                    "WhatsApp auto-reconnect failed (attempt #{Attempt}) — manual QR scan needed. " +
                    "Open the Evolution API panel to reconnect.",
                    _consecutiveFailures);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "WhatsApp health check threw an exception");
        }
    }
}
