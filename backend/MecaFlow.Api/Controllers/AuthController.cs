using MecaFlow.Api.Data;
using MecaFlow.Api.DTOs;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

namespace MecaFlow.Api.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController(AppDbContext db, IConfiguration config) : ControllerBase
{
    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequest req)
    {
        var user = await db.Users
            .Include(u => u.Tenant)
            .FirstOrDefaultAsync(u => u.Username == req.Username && u.Tenant.IsActive);

        if (user is null || !BCrypt.Net.BCrypt.Verify(req.Password, user.PasswordHash))
            return Unauthorized(new { error = "Usuario o contraseña incorrectos" });

        var token = GenerateToken(user.Id, user.TenantId, user.Username, user.Role.ToString());
        return Ok(new LoginResponse(token, user.Username, user.Tenant.Name, user.Role.ToString()));
    }

    [HttpPost("admin-login")]
    public IActionResult AdminLogin([FromBody] AdminLoginRequest req)
    {
        var adminPassword = config["ADMIN_PASSWORD"];
        if (string.IsNullOrEmpty(adminPassword) || req.Password != adminPassword)
            return Unauthorized(new { error = "Contraseña incorrecta" });

        var token = GenerateToken(Guid.Empty, Guid.Empty, "superadmin", "SuperAdmin");
        return Ok(new LoginResponse(token, "superadmin", "Admin", "SuperAdmin"));
    }

    private string GenerateToken(Guid userId, Guid tenantId, string username, string role)
    {
        var secret = config["JWT_SECRET"] ?? throw new InvalidOperationException("JWT_SECRET not configured");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, userId.ToString()),
            new Claim("tenantId", tenantId.ToString()),
            new Claim("username", username),
            new Claim("role", role),
        };

        var token = new JwtSecurityToken(
            issuer: "mecaflow",
            audience: "mecaflow",
            claims: claims,
            expires: DateTime.UtcNow.AddDays(7),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
