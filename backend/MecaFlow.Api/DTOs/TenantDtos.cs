namespace MecaFlow.Api.DTOs;

public record TenantResponse(Guid Id, string Name, bool IsActive, DateTime CreatedAt, int UserCount);

public record CreateTenantRequest(string Name);

public record CreateUserRequest(string Username, string Password, string Role = "Owner");

public record UserResponse(Guid Id, string Username, string Role, DateTime CreatedAt);
