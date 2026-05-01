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
    public IActionResult PushStatus()
    {
        var publicKey  = config["Push:VapidPublicKey"]
            ?? config["VAPID_PUBLIC_KEY"]
            ?? Environment.GetEnvironmentVariable("Push__VapidPublicKey")
            ?? Environment.GetEnvironmentVariable("VAPID_PUBLIC_KEY");
        var privateKey = config["Push:VapidPrivateKey"]
            ?? config["VAPID_PRIVATE_KEY"]
            ?? Environment.GetEnvironmentVariable("Push__VapidPrivateKey")
            ?? Environment.GetEnvironmentVariable("VAPID_PRIVATE_KEY");

        // Collect which config keys are actually populated (names only, no values)
        var foundKeys = new List<string>();
        var checkKeys = new[] {
            "Push:VapidPublicKey", "Push:VapidPrivateKey",
            "VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY",
        };
        foreach (var k in checkKeys)
            if (!string.IsNullOrWhiteSpace(config[k])) foundKeys.Add(k);

        var envKeys = Environment.GetEnvironmentVariables().Keys
            .Cast<string>()
            .Where(k => k.Contains("VAPID", StringComparison.OrdinalIgnoreCase)
                     || k.Contains("Push", StringComparison.OrdinalIgnoreCase))
            .OrderBy(k => k)
            .ToList();

        return Ok(new
        {
            isConfigured = !string.IsNullOrWhiteSpace(publicKey) && !string.IsNullOrWhiteSpace(privateKey),
            publicKeyPreview = string.IsNullOrWhiteSpace(publicKey) ? null : publicKey[..Math.Min(12, publicKey.Length)] + "…",
            foundInConfig = foundKeys,
            foundInEnv = envKeys,
        });
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
