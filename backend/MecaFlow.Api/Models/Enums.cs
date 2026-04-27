namespace MecaFlow.Api.Models;

public enum ServiceOrderStatus
{
    Open,
    InProgress,
    Completed,
    Cancelled
}

public enum ServiceItemType
{
    Labor,
    Part
}

public enum UserRole
{
    Owner,
    Mechanic
}
