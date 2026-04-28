using MecaFlow.Api.Data;
using MecaFlow.Api.DTOs;
using MecaFlow.Api.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace MecaFlow.Api.Controllers;

[ApiController]
[Route("api/admin")]
[Authorize(Roles = "SuperAdmin")]
public class AdminController(AppDbContext db) : ControllerBase
{
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
