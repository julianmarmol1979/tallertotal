namespace TallerTotal.Api.Models;

/// <summary>
/// Global key-value settings stored in the database.
/// Used for runtime-configurable values (e.g. VAPID keys) that can't rely on
/// Railway environment variables being injected correctly.
/// </summary>
public class AppSetting
{
    public string Key   { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
