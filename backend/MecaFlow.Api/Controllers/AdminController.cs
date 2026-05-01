// redeploy: force Railway to load updated env vars
using TallerTotal.Api.Data;
using TallerTotal.Api.DTOs;
using TallerTotal.Api.Models;
using TallerTotal.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace TallerTotal.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "SuperAdmin")]
public class AdminController(AppDbContext db, IWhatsAppService whatsApp, IConfiguration config) : ControllerBase
{
    // GET /api/admin/whatsapp/status
    [HttpGet("whatsapp/status")]
    public async Task<IActionResult> WhatsAppStatus()
    {
        var status = await whatsApp.GetStatusAsync();
        return Ok(status);
    }

    // GET /api/admin/whatsapp/qr
    [HttpGet("whatsapp/qr")]
    public async Task<IActionResult> WhatsAppQr()
    {
        var result = await whatsApp.GetQrAsync();
        return Ok(result);
    }

    // POST /api/admin/whatsapp/test
    [HttpPost("whatsapp/test")]
    public async Task<IActionResult> WhatsAppTest([FromBody] WhatsAppTestRequest req)
    {
        var error = await whatsApp.SendTestAsync(req.Phone, req.Message ?? "🔧 TallerTotal - test de conexión WhatsApp");
        if (error is null) return Ok(new { ok = true });
        return BadRequest(new { error });
    }

    // GET /api/admin/push/status
    [HttpGet("push/status")]
    public async Task<IActionResult> PushStatus()
    {
        // Check database first (keys configured via admin panel)
        var dbPublic  = await db.AppSettings.Where(s => s.Key == "Vapid:PublicKey").Select(s => s.Value).FirstOrDefaultAsync();
        var dbPrivate = await db.AppSettings.Where(s => s.Key == "Vapid:PrivateKey").Select(s => s.Value).FirstOrDefaultAsync();

        // Fall back to env vars / appsettings
        var envPublic  = config["Push:VapidPublicKey"]  ?? config["VAPID_PUBLIC_KEY"]
            ?? Environment.GetEnvironmentVariable("Push__VapidPublicKey")
            ?? Environment.GetEnvironmentVariable("VAPID_PUBLIC_KEY");
        var envPrivate = config["Push:VapidPrivateKey"] ?? config["VAPID_PRIVATE_KEY"]
            ?? Environment.GetEnvironmentVariable("Push__VapidPrivateKey")
            ?? Environment.GetEnvironmentVariable("VAPID_PRIVATE_KEY");

        var publicKey  = !string.IsNullOrWhiteSpace(dbPublic)  ? dbPublic  : envPublic;
        var privateKey = !string.IsNullOrWhiteSpace(dbPrivate) ? dbPrivate : envPrivate;
        var source     = !string.IsNullOrWhiteSpace(dbPublic)  ? "database" : "env";

        return Ok(new
        {
            isConfigured     = !string.IsNullOrWhiteSpace(publicKey) && !string.IsNullOrWhiteSpace(privateKey),
            publicKeyPreview = string.IsNullOrWhiteSpace(publicKey) ? null : publicKey[..Math.Min(12, publicKey.Length)] + "…",
            source,
            // kept for diagnostics
            foundInConfig    = new[] { "Push:VapidPublicKey", "VAPID_PUBLIC_KEY" }
                                    .Where(k => !string.IsNullOrWhiteSpace(config[k])).ToList(),
            foundInEnv       = Environment.GetEnvironmentVariables().Keys.Cast<string>()
                                    .Where(k => k.Contains("VAPID", StringComparison.OrdinalIgnoreCase)
                                             || k.Contains("Push", StringComparison.OrdinalIgnoreCase))
                                    .OrderBy(k => k).ToList(),
        });
    }

    // PUT /api/admin/push/vapid  — saves VAPID keys to the database
    [HttpPut("push/vapid")]
    public async Task<IActionResult> SetVapidKeys([FromBody] SetVapidKeysRequest req)
    {
        if (string.IsNullOrWhiteSpace(req.PublicKey) || string.IsNullOrWhiteSpace(req.PrivateKey))
            return BadRequest(new { error = "Ambas claves son requeridas" });

        await UpsertSetting("Vapid:PublicKey",  req.PublicKey.Trim());
        await UpsertSetting("Vapid:PrivateKey", req.PrivateKey.Trim());
        await db.SaveChangesAsync();

        return Ok(new { ok = true });
    }

    private async Task UpsertSetting(string key, string value)
    {
        var setting = await db.AppSettings.FindAsync(key);
        if (setting is null)
            db.AppSettings.Add(new AppSetting { Key = key, Value = value });
        else
        {
            setting.Value     = value;
            setting.UpdatedAt = DateTime.UtcNow;
        }
    }

    // GET /api/admin/tenants
    [HttpGet("tenants")]
    public async Task<IActionResult> GetTenants()
    {
        var tenants = await db.Tenants
            .OrderBy(t => t.Name)
            .Select(t => new TenantResponse(
                t.Id, t.Name, t.IsActive, t.CreatedAt,
                t.Users.Count))
            .ToListAsync();
        return Ok(tenants);
    }

    // POST /api/admin/tenants
    [HttpPost("tenants")]
    public async Task<IActionResult> CreateTenant([FromBody] CreateTenantRequest req)
    {
        var tenant = new Tenant { Id = Guid.NewGuid(), Name = req.Name };
        db.Tenants.Add(tenant);
        await db.SaveChangesAsync();
        return Ok(new TenantResponse(tenant.Id, tenant.Name, tenant.IsActive, tenant.CreatedAt, 0));
    }

    // PATCH /api/admin/tenants/{id}/toggle
    [HttpPatch("tenants/{id:guid}/toggle")]
    public async Task<IActionResult> ToggleTenant(Guid id)
    {
        var tenant = await db.Tenants.FindAsync(id);
        if (tenant is null) return NotFound();
        tenant.IsActive = !tenant.IsActive;
        await db.SaveChangesAsync();
        return Ok(new { tenant.IsActive });
    }

    // GET /api/admin/tenants/{id}/users
    [HttpGet("tenants/{id:guid}/users")]
    public async Task<IActionResult> GetUsers(Guid id)
    {
        var users = await db.Users
            .Where(u => u.TenantId == id)
            .Select(u => new UserResponse(u.Id, u.Username, u.Role.ToString(), u.CreatedAt))
            .ToListAsync();
        return Ok(users);
    }

    // POST /api/admin/tenants/{id}/users
    [HttpPost("tenants/{id:guid}/users")]
    public async Task<IActionResult> CreateUser(Guid id, [FromBody] CreateUserRequest req)
    {
        if (!await db.Tenants.AnyAsync(t => t.Id == id))
            return NotFound(new { error = "Tenant no encontrado" });

        if (await db.Users.AnyAsync(u => u.TenantId == id && u.Username == req.Username))
            return Conflict(new { error = "El usuario ya existe en este taller" });

        if (!Enum.TryParse<UserRole>(req.Role, out var role))
            return BadRequest(new { error = "Rol inválido. Usar Owner o Mechanic" });

        var user = new User
        {
            Id = Guid.NewGuid(),
            TenantId = id,
            Username = req.Username,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(req.Password),
            Role = role,
        };
        db.Users.Add(user);
        await db.SaveChangesAsync();
        return Ok(new UserResponse(user.Id, user.Username, user.Role.ToString(), user.CreatedAt));
    }

    // DELETE /api/admin/users/{id}
    [HttpDelete("users/{id:guid}")]
    public async Task<IActionResult> DeleteUser(Guid id)
    {
        var user = await db.Users.FindAsync(id);
        if (user is null) return NotFound();
        db.Users.Remove(user);
        await db.SaveChangesAsync();
        return NoContent();
    }
}
