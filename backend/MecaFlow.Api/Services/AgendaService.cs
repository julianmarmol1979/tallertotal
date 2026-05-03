using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using TallerTotal.Api.Models;

namespace TallerTotal.Api.Services;

public interface IAgendaService
{
    /// <summary>Uploads a PDF to Supabase Storage and returns its public URL.</summary>
    Task<string> UploadPdfAsync(Stream fileStream, string fileName, Guid tenantId);

    /// <summary>
    /// Extracts text from the PDF stored at <paramref name="storageUrl"/>,
    /// sends it to Claude and returns parsed schedule entries.
    /// </summary>
    Task<ParsedDocument> ParseDocumentAsync(string storageUrl, string fileName);

    /// <summary>Returns true if both Supabase Storage and Claude are configured.</summary>
    bool IsConfigured { get; }
}

/// <summary>Result of parsing a service PDF with Claude.</summary>
public record ParsedDocument(
    string? VehicleLicensePlate,
    string? VehicleDescription,
    string? Notes,
    List<ParsedEntry> Entries
);

public record ParsedEntry(
    string ServiceType,
    DateOnly? LastServiceDate,
    int? IntervalMonths,
    int? IntervalKm,
    DateOnly? NextDueDate
);

public class AgendaService(
    IHttpClientFactory httpClientFactory,
    IConfiguration config,
    ILogger<AgendaService> logger) : IAgendaService
{
    // ── Config ────────────────────────────────────────────────────────────────

    private string? SupabaseUrl   => config["Supabase:Url"]         ?? config["SUPABASE_URL"]         ?? Environment.GetEnvironmentVariable("SUPABASE_URL");
    private string? SupabaseKey   => config["Supabase:ServiceKey"]   ?? config["SUPABASE_SERVICE_KEY"] ?? Environment.GetEnvironmentVariable("SUPABASE_SERVICE_KEY");
    private string  StorageBucket => config["Supabase:Bucket"]       ?? "agenda-pdfs";
    private string? ClaudeKey     => config["Anthropic:ApiKey"]      ?? config["ANTHROPIC_API_KEY"]    ?? Environment.GetEnvironmentVariable("ANTHROPIC_API_KEY");

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(SupabaseUrl) &&
        !string.IsNullOrWhiteSpace(SupabaseKey) &&
        !string.IsNullOrWhiteSpace(ClaudeKey);

    // ── Upload ────────────────────────────────────────────────────────────────

    public async Task<string> UploadPdfAsync(Stream fileStream, string fileName, Guid tenantId)
    {
        var supabaseUrl = SupabaseUrl ?? throw new InvalidOperationException("SUPABASE_URL not configured.");
        var supabaseKey = SupabaseKey ?? throw new InvalidOperationException("SUPABASE_SERVICE_KEY not configured.");

        var safeName = $"{tenantId}/{DateTime.UtcNow:yyyyMMddHHmmss}_{SanitizeFileName(fileName)}";
        var uploadUrl = $"{supabaseUrl}/storage/v1/object/{StorageBucket}/{safeName}";

        var client = httpClientFactory.CreateClient("supabase");
        client.DefaultRequestHeaders.Add("Authorization", $"Bearer {supabaseKey}");

        using var content = new StreamContent(fileStream);
        content.Headers.ContentType = new MediaTypeHeaderValue("application/pdf");

        var response = await client.PostAsync(uploadUrl, content);
        var body = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
            throw new InvalidOperationException($"Supabase Storage upload failed ({(int)response.StatusCode}): {body}");

        // Public URL
        return $"{supabaseUrl}/storage/v1/object/public/{StorageBucket}/{safeName}";
    }

    // ── Parse with Claude ─────────────────────────────────────────────────────

    public async Task<ParsedDocument> ParseDocumentAsync(string storageUrl, string fileName)
    {
        var claudeKey = ClaudeKey ?? throw new InvalidOperationException("ANTHROPIC_API_KEY not configured.");

        // Download the PDF bytes from Supabase Storage
        var httpClient = httpClientFactory.CreateClient("supabase");
        var pdfBytes = await httpClient.GetByteArrayAsync(storageUrl);
        var pdfBase64 = Convert.ToBase64String(pdfBytes);

        // Call Claude with the PDF as a document block
        var today = DateOnly.FromDateTime(DateTime.UtcNow).ToString("yyyy-MM-dd");
        var payload = new
        {
            model = "claude-opus-4-5",
            max_tokens = 1024,
            messages = new[]
            {
                new
                {
                    role = "user",
                    content = new object[]
                    {
                        new
                        {
                            type = "document",
                            source = new
                            {
                                type = "base64",
                                media_type = "application/pdf",
                                data = pdfBase64,
                            },
                        },
                        new
                        {
                            type = "text",
                            text = $$"""
                                Hoy es {{today}}. Analizá este documento de servicio/mantenimiento vehicular.
                                Extraé la información y respondé ÚNICAMENTE con un JSON válido con esta estructura exacta:
                                {
                                  "vehicleLicensePlate": "ABC123" o null,
                                  "vehicleDescription": "Toyota Corolla 2020" o null,
                                  "notes": "nota general del documento" o null,
                                  "entries": [
                                    {
                                      "serviceType": "Cambio de aceite",
                                      "lastServiceDate": "2024-05-01" o null,
                                      "intervalMonths": 6 o null,
                                      "intervalKm": 10000 o null,
                                      "nextDueDate": "2024-11-01" o null
                                    }
                                  ]
                                }
                                Si nextDueDate no está explícito pero tenés lastServiceDate e intervalMonths, calculalo.
                                Si no encontrás algún campo, usá null. No incluyas texto fuera del JSON.
                                """,
                        },
                    },
                },
            },
        };

        var client = httpClientFactory.CreateClient("anthropic");
        client.DefaultRequestHeaders.Add("x-api-key", claudeKey);
        client.DefaultRequestHeaders.Add("anthropic-version", "2023-06-01");
        client.DefaultRequestHeaders.Add("anthropic-beta", "pdfs-2024-09-25");

        var json     = JsonSerializer.Serialize(payload);
        var response = await client.PostAsync(
            "https://api.anthropic.com/v1/messages",
            new StringContent(json, Encoding.UTF8, "application/json"));

        var body = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            logger.LogError("Claude API error {Status}: {Body}", (int)response.StatusCode, body);
            throw new InvalidOperationException($"Claude API error {(int)response.StatusCode}: {body}");
        }

        // Extract the text content from Claude's response
        var doc  = JsonDocument.Parse(body);
        var text = doc.RootElement
            .GetProperty("content")[0]
            .GetProperty("text")
            .GetString() ?? "{}";

        // Parse Claude's JSON response
        return DeserializeParsedDocument(text);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static ParsedDocument DeserializeParsedDocument(string json)
    {
        // Strip markdown code fences if Claude wrapped the JSON
        var trimmed = json.Trim();
        if (trimmed.StartsWith("```"))
        {
            var start = trimmed.IndexOf('\n') + 1;
            var end   = trimmed.LastIndexOf("```");
            if (end > start) trimmed = trimmed[start..end].Trim();
        }

        try
        {
            var root = JsonNode.Parse(trimmed)!;

            var entries = (root["entries"] as JsonArray ?? [])
                .Select(e => new ParsedEntry(
                    ServiceType:     e?["serviceType"]?.GetValue<string>() ?? "Servicio",
                    LastServiceDate: ParseDate(e?["lastServiceDate"]?.GetValue<string>()),
                    IntervalMonths:  e?["intervalMonths"]?.GetValue<int?>(),
                    IntervalKm:      e?["intervalKm"]?.GetValue<int?>(),
                    NextDueDate:     ParseDate(e?["nextDueDate"]?.GetValue<string>())
                ))
                .ToList();

            return new ParsedDocument(
                VehicleLicensePlate: root["vehicleLicensePlate"]?.GetValue<string>(),
                VehicleDescription:  root["vehicleDescription"]?.GetValue<string>(),
                Notes:               root["notes"]?.GetValue<string>(),
                Entries:             entries
            );
        }
        catch
        {
            // If Claude returned something unexpected, return empty result
            return new ParsedDocument(null, null, null, []);
        }
    }

    private static DateOnly? ParseDate(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        return DateOnly.TryParse(raw, out var d) ? d : null;
    }

    private static string SanitizeFileName(string name) =>
        string.Concat(name.Select(c => char.IsLetterOrDigit(c) || c is '.' or '-' or '_' ? c : '_'));
}
