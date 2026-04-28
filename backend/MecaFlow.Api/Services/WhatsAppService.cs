using MecaFlow.Api.Models;
using System.Text;
using System.Text.Json;

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

        if (text is null) return Task.CompletedTask;
        return SendAsync(phone, text);
    }

    private async Task SendAsync(string rawPhone, string text)
    {
        if (!IsConfigured)
        {
            logger.LogDebug("WhatsApp not configured, skipping notification");
            return;
        }

        var phone = NormalizePhone(rawPhone);
        if (phone is null)
        {
            logger.LogWarning("Could not normalize phone number: {Phone}", rawPhone);
            return;
        }

        try
        {
            using var http = new HttpClient();
            http.DefaultRequestHeaders.Add("apikey", ApiKey);

            var payload = JsonSerializer.Serialize(new { number = phone, textMessage = new { text } }, JsonOpts);
            var content = new StringContent(payload, Encoding.UTF8, "application/json");

            var response = await http.PostAsync($"{BaseUrl}/message/sendText/{Instance}", content);

            if (!response.IsSuccessStatusCode)
            {
                var body = await response.Content.ReadAsStringAsync();
                logger.LogWarning("WhatsApp send failed {Status}: {Body}", response.StatusCode, body);
            }
        }
        catch (Exception ex)
        {
            // Never let WhatsApp errors break the main flow
            logger.LogError(ex, "WhatsApp notification failed for phone {Phone}", phone);
        }
    }

    /// <summary>
    /// Normalizes Argentine and international phone numbers to Evolution API format (digits only, with country code).
    /// Examples: "+54 9 11 1234-5678" → "5491112345678", "011-1234-5678" → "541112345678"
    /// </summary>
    private static string? NormalizePhone(string raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;

        // Strip everything except digits
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
