using MecaFlow.Api.Models;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace MecaFlow.Api.Services;

public class WhatsAppService(IConfiguration config, ILogger<WhatsAppService> logger) : IWhatsAppService
{
    private static readonly JsonSerializerOptions JsonOpts = new() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

    private string? BaseUrl => config["Evolution:BaseUrl"];
    private string? ApiKey => config["Evolution:ApiKey"];
    private string? Instance => config["Evolution:Instance"];

    private bool IsConfigured =>
        !string.IsNullOrEmpty(BaseUrl) &&
        !string.IsNullOrEmpty(ApiKey) &&
        !string.IsNullOrEmpty(Instance);

    public Task SendOrderCreatedAsync(ServiceOrder order)
    {
        var phone = order.Vehicle.Customer.Phone;
        var name = order.Vehicle.Customer.Name.Split(' ')[0];
        var plate = order.Vehicle.LicensePlate;

        var text = $"👋 Hola *{name}*! Tu vehículo *{plate}* ingresó al taller. Te notificaremos cuando haya novedades.";
        return SendAsync(phone, text);
    }

    public Task SendStatusChangedAsync(ServiceOrder order, ServiceOrderStatus newStatus)
    {
        var phone = order.Vehicle.Customer.Phone;
        var name = order.Vehicle.Customer.Name.Split(' ')[0];
        var plate = order.Vehicle.LicensePlate;
        var vehicle = $"{order.Vehicle.Brand} {order.Vehicle.Model}";
        var mechanic = string.IsNullOrWhiteSpace(order.AssignedMechanic) ? "" : $" Mecánico: {order.AssignedMechanic}.";
        var total = order.TotalEstimate.ToString("N0");

        logger.LogInformation(
            "WhatsApp status-change notification — order={OrderId} plate={Plate} status={Status} phone='{Phone}'",
            order.Id, plate, newStatus, phone);

        var text = newStatus switch
        {
            ServiceOrderStatus.InProgress =>
                $"🔧 Hola *{name}*! Ya estamos trabajando en tu *{plate}* ({vehicle}).{mechanic}",
            ServiceOrderStatus.Completed =>
                $"✅ ¡Listo *{name}*! Tu *{plate}* está listo para retirar. Total estimado: *${total}*.",
            ServiceOrderStatus.Cancelled =>
                $"❌ Hola *{name}*. La orden de tu *{plate}* fue cancelada. Contactanos para más información.",
            _ => null
        };

        if (text is null)
        {
            logger.LogDebug("WhatsApp status-change: no message template for status {Status}, skipping", newStatus);
            return Task.CompletedTask;
        }

        return SendAsync(phone, text);
    }

    public async Task<WhatsAppStatus> GetStatusAsync()
    {
        if (!IsConfigured)
            return new WhatsAppStatus(false, BaseUrl, Instance, null, "Evolution not configured (missing BaseUrl, ApiKey or Instance)");

        try
        {
            using var http = BuildClient();
            var res = await http.GetAsync($"{BaseUrl}/instance/connectionState/{Instance}");
            var body = await res.Content.ReadAsStringAsync();

            logger.LogInformation("WhatsApp status check → {Status}: {Body}", res.StatusCode, body);

            if (!res.IsSuccessStatusCode)
                return new WhatsAppStatus(true, BaseUrl, Instance, null, $"HTTP {(int)res.StatusCode}: {body}");

            // Parse connection state from response
            var json = JsonNode.Parse(body);
            var state = json?["instance"]?["state"]?.GetValue<string>()
                     ?? json?["state"]?.GetValue<string>()
                     ?? body;

            return new WhatsAppStatus(true, BaseUrl, Instance, state, null);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "WhatsApp status check failed");
            return new WhatsAppStatus(true, BaseUrl, Instance, null, ex.Message);
        }
    }

    public async Task<bool> TryReconnectAsync()
    {
        if (!IsConfigured) return false;

        try
        {
            using var http = BuildClient();

            // Trigger connect (uses existing Baileys session files if present)
            await http.GetAsync($"{BaseUrl}/instance/connect/{Instance}");

            // Give Baileys up to 15 seconds to restore the session
            for (var i = 0; i < 3; i++)
            {
                await Task.Delay(5_000);
                var stateRes = await http.GetAsync($"{BaseUrl}/instance/connectionState/{Instance}");
                var body = await stateRes.Content.ReadAsStringAsync();
                var json = System.Text.Json.Nodes.JsonNode.Parse(body);
                var state = json?["instance"]?["state"]?.GetValue<string>();

                if (string.Equals(state, "open", StringComparison.OrdinalIgnoreCase))
                {
                    logger.LogInformation("WhatsApp auto-reconnect succeeded — state is now open");
                    return true;
                }
            }

            logger.LogWarning("WhatsApp auto-reconnect did not reach 'open' after 15 s — manual QR scan required");
            return false;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "WhatsApp TryReconnect failed");
            return false;
        }
    }

    public async Task<string?> SendTestAsync(string phone, string message)
    {
        if (!IsConfigured) return "Not configured";

        var normalized = NormalizePhone(phone);
        if (normalized is null) return $"Could not normalize phone: {phone}";

        try
        {
            using var http = BuildClient();
            var payload = JsonSerializer.Serialize(new { number = normalized, textMessage = new { text = message } }, JsonOpts);
            var content = new StringContent(payload, Encoding.UTF8, "application/json");

            logger.LogInformation("WhatsApp test send → URL: {Url}, payload: {Payload}",
                $"{BaseUrl}/message/sendText/{Instance}", payload);

            var res = await http.PostAsync($"{BaseUrl}/message/sendText/{Instance}", content);
            var body = await res.Content.ReadAsStringAsync();

            logger.LogInformation("WhatsApp test response → {Status}: {Body}", res.StatusCode, body);

            return res.IsSuccessStatusCode ? null : $"HTTP {(int)res.StatusCode}: {body}";
        }
        catch (Exception ex)
        {
            return ex.Message;
        }
    }

    private async Task SendAsync(string rawPhone, string text)
    {
        if (!IsConfigured)
        {
            logger.LogDebug("WhatsApp not configured — skipping. BaseUrl={BaseUrl} Instance={Instance}", BaseUrl, Instance);
            return;
        }

        if (string.IsNullOrWhiteSpace(rawPhone))
        {
            logger.LogWarning("WhatsApp send skipped — customer has no phone number on record");
            return;
        }

        var phone = NormalizePhone(rawPhone);
        if (phone is null)
        {
            logger.LogWarning("WhatsApp send skipped — could not normalize phone '{Phone}' (too short or invalid format)", rawPhone);
            return;
        }

        try
        {
            using var http = BuildClient();
            var payload = JsonSerializer.Serialize(new { number = phone, textMessage = new { text } }, JsonOpts);
            var content = new StringContent(payload, Encoding.UTF8, "application/json");
            var url = $"{BaseUrl}/message/sendText/{Instance}";

            logger.LogInformation("WhatsApp send → {Url} | phone={Phone} | payload={Payload}", url, phone, payload);

            var response = await http.PostAsync(url, content);
            var body = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
                logger.LogWarning("WhatsApp send FAILED {Status}: {Body}", response.StatusCode, body);
            else
                logger.LogInformation("WhatsApp send OK {Status}: {Body}", response.StatusCode, body);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "WhatsApp send exception for phone {Phone}", phone);
        }
    }

    private HttpClient BuildClient()
    {
        var http = new HttpClient { Timeout = TimeSpan.FromSeconds(15) };
        http.DefaultRequestHeaders.Add("apikey", ApiKey);
        return http;
    }

    /// <summary>
    /// Normalizes Argentine and international phone numbers to Evolution API format (digits only, with country code).
    /// Examples: "+54 9 11 1234-5678" → "5491112345678", "011-1234-5678" → "541112345678"
    /// </summary>
    private static string? NormalizePhone(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;

        var digits = new string(raw.Where(char.IsDigit).ToArray());
        if (digits.Length < 7) return null;

        // Already has country code 54
        if (digits.StartsWith("54") && digits.Length >= 12) return digits;

        // Starts with 0 (local Argentine format like 011...)
        if (digits.StartsWith("0")) digits = "54" + digits[1..];
        else digits = "54" + digits;

        return digits.Length >= 12 ? digits : null;
    }
}
