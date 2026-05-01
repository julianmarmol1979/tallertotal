using TallerTotal.Api.Data;
using TallerTotal.Api.Services;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.Text;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers()
    .AddJsonOptions(o => o.JsonSerializerOptions.Converters.Add(new System.Text.Json.Serialization.JsonStringEnumConverter()));

builder.Services.AddOpenApi();

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("Default")));

var jwtSecret = builder.Configuration["JWT_SECRET"] ?? throw new InvalidOperationException("JWT_SECRET not configured");
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Keep claim names as-is from the JWT (don't remap "role" → long URI)
        options.MapInboundClaims = false;
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidateAudience = true,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            ValidIssuer = "tallertotal",
            ValidAudience = "tallertotal",
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSecret)),
            RoleClaimType = "role",
            NameClaimType = "username",
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddSingleton<IWhatsAppService, WhatsAppService>();
builder.Services.AddHostedService<WhatsAppHealthService>();
builder.Services.AddHostedService<WhatsAppReminderService>();

// Email (Resend REST API via HttpClient) — no-op if Resend:ApiKey is not configured
builder.Services.AddHttpClient("resend");
builder.Services.AddScoped<IEmailService, ResendEmailService>();

// Web Push — Singleton so it survives beyond HTTP request scopes (needed for fire-and-forget sends)
builder.Services.AddMemoryCache();
builder.Services.AddSingleton<IPushService, PushService>();

var allowedOrigins = (builder.Configuration["AllowedOrigins"] ?? "http://localhost:3000")
    .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy =>
        policy.WithOrigins(allowedOrigins)
              .AllowAnyHeader()
              .AllowAnyMethod()));

var app = builder.Build();

// Always run migrations on startup so production DB stays up to date
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    db.Database.Migrate();
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

app.UseCors();
app.UseAuthentication();
app.UseAuthorization();
app.UseHttpsRedirection();

// Return exception details as plain-text so the frontend can surface them
app.UseExceptionHandler(errorApp =>
{
    errorApp.Run(async context =>
    {
        var feature = context.Features.Get<Microsoft.AspNetCore.Diagnostics.IExceptionHandlerFeature>();
        context.Response.StatusCode = 500;
        context.Response.ContentType = "text/plain";
        var msg = feature?.Error is { } ex
            ? $"{ex.GetType().Name}: {ex.Message}"
            : "Internal server error";
        await context.Response.WriteAsync(msg);
    });
});

app.MapControllers();
app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.Run();
