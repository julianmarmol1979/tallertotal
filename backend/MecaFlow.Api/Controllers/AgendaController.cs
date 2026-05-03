using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TallerTotal.Api.Data;
using TallerTotal.Api.Models;
using TallerTotal.Api.Services;

namespace TallerTotal.Api.Controllers;

[ApiController]
[Route("api/agenda")]
[Authorize]
public class AgendaController(
    AppDbContext db,
    IAgendaService agenda,
    IWhatsAppService whatsApp,
    IPushService push) : ControllerBase
{
    private Guid TenantId => Guid.Parse(User.FindFirst("tenantId")!.Value);

    // GET /api/agenda — list all documents for this tenant
    [HttpGet]
    public async Task<IActionResult> GetDocuments()
    {
        var docs = await db.ServiceDocuments
            .Include(d => d.Entries)
            .Where(d => d.TenantId == TenantId)
            .OrderByDescending(d => d.UploadedAt)
            .Select(d => new
            {
                d.Id,
                d.FileName,
                d.StorageUrl,
                d.UploadedAt,
                d.ParsedAt,
                d.VehicleLicensePlate,
                d.VehicleDescription,
                d.Notes,
                Entries = d.Entries.Select(e => new
                {
                    e.Id,
                    e.ServiceType,
                    e.LastServiceDate,
                    e.IntervalMonths,
                    e.IntervalKm,
                    e.NextDueDate,
                    e.IsActive,
                    e.LastAlertSentAt,
                    DaysUntilDue = e.NextDueDate.HasValue
                        ? (int)(e.NextDueDate.Value.ToDateTime(TimeOnly.MinValue) - DateTime.UtcNow.Date).TotalDays
                        : (int?)null,
                }),
            })
            .ToListAsync();

        return Ok(docs);
    }

    // POST /api/agenda/upload — upload a PDF
    [HttpPost("upload")]
    [RequestSizeLimit(20 * 1024 * 1024)] // 20 MB
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "No se recibió ningún archivo." });

        if (!file.ContentType.Equals("application/pdf", StringComparison.OrdinalIgnoreCase)
            && !file.FileName.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { error = "Solo se aceptan archivos PDF." });

        if (!agenda.IsConfigured)
            return BadRequest(new { error = "Supabase Storage o Claude API no están configurados." });

        try
        {
            await using var stream = file.OpenReadStream();
            var url = await agenda.UploadPdfAsync(stream, file.FileName, TenantId);

            var doc = new ServiceDocument
            {
                TenantId   = TenantId,
                FileName   = file.FileName,
                StorageUrl = url,
            };
            db.ServiceDocuments.Add(doc);
            await db.SaveChangesAsync();

            return Ok(new { doc.Id, doc.FileName, doc.StorageUrl, doc.UploadedAt });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // POST /api/agenda/{id}/parse — parse the PDF with Claude
    [HttpPost("{id:guid}/parse")]
    public async Task<IActionResult> Parse(Guid id)
    {
        var doc = await db.ServiceDocuments
            .Include(d => d.Entries)
            .FirstOrDefaultAsync(d => d.Id == id && d.TenantId == TenantId);

        if (doc is null) return NotFound();

        if (!agenda.IsConfigured)
            return BadRequest(new { error = "Anthropic API key no configurada (ANTHROPIC_API_KEY)." });

        try
        {
            var parsed = await agenda.ParseDocumentAsync(doc.StorageUrl, doc.FileName);

            // Update document metadata
            doc.ParsedAt            = DateTime.UtcNow;
            doc.VehicleLicensePlate = parsed.VehicleLicensePlate;
            doc.VehicleDescription  = parsed.VehicleDescription;
            doc.Notes               = parsed.Notes;

            // Replace existing entries
            db.ServiceScheduleEntries.RemoveRange(doc.Entries);
            doc.Entries = parsed.Entries.Select(e => new ServiceScheduleEntry
            {
                ServiceDocumentId = doc.Id,
                ServiceType       = e.ServiceType,
                LastServiceDate   = e.LastServiceDate,
                IntervalMonths    = e.IntervalMonths,
                IntervalKm        = e.IntervalKm,
                NextDueDate       = e.NextDueDate,
            }).ToList();

            await db.SaveChangesAsync();
            return Ok(new { ok = true, entriesFound = doc.Entries.Count });
        }
        catch (Exception ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // POST /api/agenda/check-alerts — check all entries and send alerts for due/overdue ones
    [HttpPost("check-alerts")]
    public async Task<IActionResult> CheckAlerts([FromQuery] int alertDaysBefore = 30)
    {
        var today     = DateOnly.FromDateTime(DateTime.UtcNow);
        var threshold = today.AddDays(alertDaysBefore);

        var due = await db.ServiceScheduleEntries
            .Include(e => e.Document)
            .Where(e =>
                e.Document.TenantId == TenantId &&
                e.IsActive &&
                e.NextDueDate.HasValue &&
                e.NextDueDate.Value <= threshold)
            .ToListAsync();

        if (due.Count == 0)
            return Ok(new { alertsSent = 0, message = "No hay servicios próximos a vencer." });

        var sent = 0;
        foreach (var entry in due)
        {
            // Avoid spamming: only send once every 7 days per entry
            if (entry.LastAlertSentAt.HasValue &&
                (DateTime.UtcNow - entry.LastAlertSentAt.Value).TotalDays < 7)
                continue;

            var daysLeft = (entry.NextDueDate!.Value.ToDateTime(TimeOnly.MinValue) - DateTime.UtcNow.Date).TotalDays;
            var plate    = entry.Document.VehicleLicensePlate ?? "vehículo";
            var vehicle  = entry.Document.VehicleDescription  ?? plate;

            var waMsg = daysLeft <= 0
                ? $"⚠️ *{entry.ServiceType}* para *{plate}* está VENCIDO (venció el {entry.NextDueDate:dd/MM/yyyy}). Coordiná el turno lo antes posible."
                : $"🔔 *{entry.ServiceType}* para *{plate}* vence en {(int)daysLeft} días ({entry.NextDueDate:dd/MM/yyyy}). Coordiná el turno a tiempo.";

            // Find a WhatsApp number — look for the vehicle's customer if registered
            var customer = await db.Vehicles
                .Include(v => v.Customer)
                .Where(v => v.Customer.TenantId == TenantId &&
                            entry.Document.VehicleLicensePlate != null &&
                            v.LicensePlate == entry.Document.VehicleLicensePlate)
                .Select(v => v.Customer)
                .FirstOrDefaultAsync();

            if (customer is not null)
                _ = whatsApp.SendAsync(customer.Phone, waMsg);

            // Always send push to all mechanics of this tenant
            var mechanics = await db.Mechanics
                .Where(m => m.TenantId == TenantId && m.PushSubscriptionJson != null)
                .ToListAsync();

            foreach (var mechanic in mechanics)
                _ = push.SendAgendaAlertAsync(mechanic, entry.ServiceType, plate, (int)daysLeft);

            entry.LastAlertSentAt = DateTime.UtcNow;
            sent++;
        }

        await db.SaveChangesAsync();
        return Ok(new { alertsSent = sent });
    }

    // DELETE /api/agenda/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var doc = await db.ServiceDocuments.FirstOrDefaultAsync(d => d.Id == id && d.TenantId == TenantId);
        if (doc is null) return NotFound();
        db.ServiceDocuments.Remove(doc);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // PATCH /api/agenda/entries/{id}/toggle
    [HttpPatch("entries/{id:guid}/toggle")]
    public async Task<IActionResult> ToggleEntry(Guid id)
    {
        var entry = await db.ServiceScheduleEntries
            .Include(e => e.Document)
            .FirstOrDefaultAsync(e => e.Id == id && e.Document.TenantId == TenantId);

        if (entry is null) return NotFound();
        entry.IsActive = !entry.IsActive;
        await db.SaveChangesAsync();
        return Ok(new { entry.IsActive });
    }
}
