namespace TallerTotal.Api.DTOs;

public record LoginRequest(string Username, string Password);

public record LoginResponse(string Token, string Username, string TenantName, string Role);

public record AdminLoginRequest(string Password);
