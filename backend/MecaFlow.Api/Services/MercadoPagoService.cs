using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using TallerTotal.Api.Models;

namespace TallerTotal.Api.Services;

public interface IMercadoPagoService
{
    /// <summary>
    /// Creates a Checkout Pro preference for the given order and returns the init_point URL.
    /// Returns null if the access token is not configured.
    /// Throws on API errors.
    /// </summary>
    Task<string> CreatePaymentLinkAsync(ServiceOrder order);

    bool IsConfigured { get; }
}

public class MercadoPagoService(
    IHttpClientFactory httpClientFactory,
    IConfiguration config,
    ILogger<MercadoPagoService> logger) : IMercadoPagoService
{
    private const string BaseUrl = "https://api.mercadopago.com";

    private string? AccessToken =>
        config["MercadoPago:AccessToken"]
        ?? config["MP_ACCESS_TOKEN"]
        ?? Environment.GetEnvironmentVariable("MP_ACCESS_TOKEN");

    public bool IsConfigured => !string.IsNullOrWhiteSpace(AccessToken);

    public async Task<string> CreatePaymentLinkAsync(ServiceOrder order)
    {
        var token = AccessToken
            ?? throw new InvalidOperationException("Mercado Pago access token not configured (MP_ACCESS_TOKEN).");

        var orderNum = order.Id.ToString()[^8..].ToUpper();
        var title    = $"Orden de servicio #{orderNum} · {order.Vehicle.LicensePlate}";
        var amount   = order.TotalFinal > 0 ? order.TotalFinal : order.TotalEstimate;

        var payload = new
        {
            items = new[]
            {
                new
                {
                    id          = order.Id.ToString(),
                    title,
                    quantity    = 1,
                    unit_price  = (double)amount,
                    currency_id = "ARS",
                    description = $"{order.Vehicle.Brand} {order.Vehicle.Model} {order.Vehicle.Year}",
                },
            },
            external_reference = order.Id.ToString(),
            statement_descriptor = "TallerTotal",
            back_urls = new
            {
                success = config["FrontendUrl"] ?? "https://tallertotal.vercel.app",
                failure = config["FrontendUrl"] ?? "https://tallertotal.vercel.app",
                pending = config["FrontendUrl"] ?? "https://tallertotal.vercel.app",
            },
        };

        var json    = JsonSerializer.Serialize(payload);
        var client  = httpClientFactory.CreateClient("mercadopago");
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);

        var response = await client.PostAsync(
            $"{BaseUrl}/checkout/preferences",
            new StringContent(json, Encoding.UTF8, "application/json"));

        var body = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("MercadoPago API error {Status}: {Body}", (int)response.StatusCode, body);
            throw new InvalidOperationException($"MercadoPago devolvió {(int)response.StatusCode}: {body}");
        }

        var doc      = JsonDocument.Parse(body);
        var initPoint = doc.RootElement.GetProperty("init_point").GetString()
            ?? throw new InvalidOperationException("MercadoPago response missing 'init_point'.");

        return initPoint;
    }
}
