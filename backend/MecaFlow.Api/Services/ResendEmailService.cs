using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using TallerTotal.Api.Models;

namespace TallerTotal.Api.Services;

/// <summary>
/// Sends transactional emails via the Resend REST API.
/// Silently no-ops if Resend:ApiKey or Resend:From are not configured.
/// </summary>
public class ResendEmailService(
    IHttpClientFactory httpFactory,
    IConfiguration config,
    ILogger<ResendEmailService> logger) : IEmailService
{
    private readonly string? _apiKey = config["Resend:ApiKey"];
    private readonly string? _from   = config["Resend:From"];

    public async Task SendOrderCreatedAsync(ServiceOrder order)
    {
        var email = order.Vehicle.Customer.Email;
        if (!IsValid(email)) return;

        var orderNum  = order.Id.ToString()[^8..].ToUpper();
        var portalUrl = $"{config["FrontendUrl"]}/portal/{order.PortalToken}";

        await SendAsync(
            to:      email!,
            subject: $"Nueva orden de servicio #{orderNum} — {order.Vehicle.LicensePlate}",
            html:    OrderCreatedHtml(order, orderNum, portalUrl));
    }

    public async Task SendStatusChangedAsync(ServiceOrder order, ServiceOrderStatus newStatus)
    {
        var email = order.Vehicle.Customer.Email;
        if (!IsValid(email)) return;

        var orderNum    = order.Id.ToString()[^8..].ToUpper();
        var portalUrl   = $"{config["FrontendUrl"]}/portal/{order.PortalToken}";
        var statusLabel = StatusLabel(newStatus);

        await SendAsync(
            to:      email!,
            subject: $"Tu orden #{orderNum} está {statusLabel}",
            html:    StatusChangedHtml(order, orderNum, statusLabel, portalUrl));
    }

    public async Task SendQuoteAsync(ServiceOrder order)
    {
        var email = order.Vehicle.Customer.Email;
        if (!IsValid(email)) return;

        var orderNum  = order.Id.ToString()[^8..].ToUpper();
        var portalUrl = $"{config["FrontendUrl"]}/portal/{order.PortalToken}";

        await SendAsync(
            to:      email!,
            subject: $"Presupuesto listo para tu vehículo {order.Vehicle.LicensePlate}",
            html:    QuoteHtml(order, orderNum, portalUrl));
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private static bool IsValid(string? email) =>
        !string.IsNullOrWhiteSpace(email) && email.Contains('@');

    private async Task SendAsync(string to, string subject, string html)
    {
        if (string.IsNullOrWhiteSpace(_apiKey) || string.IsNullOrWhiteSpace(_from))
        {
            logger.LogDebug("Resend not configured — skipping email to {To}", to);
            return;
        }

        try
        {
            var client = httpFactory.CreateClient("resend");
            client.DefaultRequestHeaders.Authorization =
                new AuthenticationHeaderValue("Bearer", _apiKey);

            var payload = JsonSerializer.Serialize(new
            {
                from    = _from,
                to      = new[] { to },
                subject,
                html,
            });

            var response = await client.PostAsync(
                "https://api.resend.com/emails",
                new StringContent(payload, Encoding.UTF8, "application/json"));

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                logger.LogWarning("Resend returned {Status}: {Body}", response.StatusCode, body);
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to send email to {To}", to);
        }
    }

    private static string StatusLabel(ServiceOrderStatus s) => s switch
    {
        ServiceOrderStatus.Open        => "abierta",
        ServiceOrderStatus.InProgress  => "en progreso",
        ServiceOrderStatus.Completed   => "completada ✅",
        ServiceOrderStatus.Cancelled   => "cancelada",
        _                              => s.ToString()
    };

    // ── HTML templates ────────────────────────────────────────────────────────

    private static string BaseLayout(string title, string body) => $"""
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>{title}</title>
        </head>
        <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <div style="max-width:560px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08);">
            <div style="background:#1e293b;padding:24px 32px;">
              <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-.5px;">TallerTotal</span>
            </div>
            <div style="padding:32px;">
              {body}
            </div>
            <div style="padding:16px 32px;background:#f8fafc;text-align:center;font-size:12px;color:#94a3b8;">
              TallerTotal · Sistema de gestión para talleres mecánicos
            </div>
          </div>
        </body>
        </html>
        """;

    private static string OrderCreatedHtml(ServiceOrder o, string num, string portalUrl) => BaseLayout(
        $"Nueva orden #{num}",
        $"""
        <h2 style="margin:0 0 4px;font-size:20px;color:#1e293b;">Nueva orden de servicio</h2>
        <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Recibimos tu vehículo en el taller.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px;">
          <tr><td style="padding:8px 0;color:#64748b;width:40%;">Orden</td><td style="font-weight:600;color:#1e293b;">#{num}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Vehículo</td><td style="font-weight:600;color:#1e293b;">{o.Vehicle.LicensePlate} — {o.Vehicle.Brand} {o.Vehicle.Model}</td></tr>
          {(o.AssignedMechanic is not null ? $"<tr><td style=\"padding:8px 0;color:#64748b;\">Mecánico</td><td style=\"font-weight:600;color:#1e293b;\">{o.AssignedMechanic}</td></tr>" : "")}
          {(o.EstimatedDeliveryAt is not null ? $"<tr><td style=\"padding:8px 0;color:#64748b;\">Entrega estimada</td><td style=\"font-weight:600;color:#1e293b;\">{o.EstimatedDeliveryAt:dd/MM/yyyy}</td></tr>" : "")}
        </table>
        <a href="{portalUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Ver estado de mi orden</a>
        """
    );

    private static string StatusChangedHtml(ServiceOrder o, string num, string statusLabel, string portalUrl) => BaseLayout(
        $"Orden #{num} — {statusLabel}",
        $"""
        <h2 style="margin:0 0 4px;font-size:20px;color:#1e293b;">Actualización de tu orden</h2>
        <p style="margin:0 0 24px;color:#64748b;font-size:14px;">El estado de tu vehículo cambió.</p>
        <div style="background:#f0f9ff;border-left:4px solid #2563eb;padding:16px 20px;border-radius:0 8px 8px 0;margin-bottom:24px;">
          <p style="margin:0;font-size:14px;color:#64748b;">Orden <strong>#{num}</strong> · {o.Vehicle.LicensePlate}</p>
          <p style="margin:8px 0 0;font-size:18px;font-weight:700;color:#1e293b;">Estado: {statusLabel}</p>
        </div>
        <a href="{portalUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Ver detalle de mi orden</a>
        """
    );

    private static string QuoteHtml(ServiceOrder o, string num, string portalUrl) => BaseLayout(
        $"Presupuesto listo — {o.Vehicle.LicensePlate}",
        $"""
        <h2 style="margin:0 0 4px;font-size:20px;color:#1e293b;">Tu presupuesto está listo</h2>
        <p style="margin:0 0 24px;color:#64748b;font-size:14px;">Revisá el detalle y confirmanos si querés continuar.</p>
        <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:8px;">
          <tr><td style="padding:8px 0;color:#64748b;width:40%;">Vehículo</td><td style="font-weight:600;color:#1e293b;">{o.Vehicle.LicensePlate} — {o.Vehicle.Brand} {o.Vehicle.Model}</td></tr>
          <tr><td style="padding:8px 0;color:#64748b;">Total estimado</td><td style="font-weight:700;color:#1e293b;font-size:16px;">${o.TotalEstimate:N2}</td></tr>
        </table>
        <p style="font-size:13px;color:#94a3b8;margin:0 0 24px;">Entrá al portal para ver el desglose y aprobarlo o rechazarlo.</p>
        <a href="{portalUrl}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">Ver y aprobar presupuesto</a>
        """
    );
}
