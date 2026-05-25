using Microsoft.EntityFrameworkCore;
using Microsoft.OpenApi.Models;
using PropIntelligence.Application.Commands.Properties;
using PropIntelligence.Infrastructure;
using PropIntelligence.Infrastructure.Persistence;
using PropIntelligence.Infrastructure.Persistence.Seed;
using PropIntelligence.API.Middleware;
using Serilog;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

// ── Serilog ───────────────────────────────────────────────────────────────────
Log.Logger = new LoggerConfiguration()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();
builder.Host.UseSerilog();

// ── Controllers ───────────────────────────────────────────────────────────────
builder.Services.AddControllers()
    .AddJsonOptions(o =>
    {
        // Enums as strings so consumers see "NSW" not 1, "Auction" not 1, etc.
        o.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
        o.JsonSerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull;
    });

// ── Swagger / OpenAPI ─────────────────────────────────────────────────────────
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo
    {
        Title       = "PropIntelligence API",
        Version     = "v1",
        Description = "Australian property data REST API — search properties, access suburb statistics, " +
                      "retrieve sales history, and generate automated valuations (AVM). " +
                      "Built on patterns from PropIntelligence.ai production delivery."
    });

    // JWT Auth button in Swagger UI
    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        Type   = SecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT",
        Description  = "Enter your JWT token (without the 'Bearer ' prefix)."
    });
    c.AddSecurityRequirement(new OpenApiSecurityRequirement
    {
        {
            new OpenApiSecurityScheme
            {
                Reference = new OpenApiReference { Type = ReferenceType.SecurityScheme, Id = "Bearer" }
            },
            Array.Empty<string>()
        }
    });

    c.EnableAnnotations();
});

// ── MediatR ───────────────────────────────────────────────────────────────────
builder.Services.AddMediatR(cfg =>
    cfg.RegisterServicesFromAssembly(typeof(CreatePropertyCommand).Assembly));

// ── Infrastructure (EF Core, JWT, Repositories, Auth) ────────────────────────
builder.Services.AddInfrastructure(builder.Configuration);

// ── CORS (permissive for demo — tighten in production) ────────────────────────
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
    p.AllowAnyOrigin().AllowAnyMethod().AllowAnyHeader()));

var app = builder.Build();

// ── Auto-migrate + seed on startup ───────────────────────────────────────────
using (var scope = app.Services.CreateScope())
{
    var db     = scope.ServiceProvider.GetRequiredService<PropIntelligenceContext>();
    var seeder = scope.ServiceProvider.GetRequiredService<DataSeeder>();

    // Log which migrations EF Core can discover (diagnostic)
    var allMigrations     = db.Database.GetMigrations().ToList();
    var pendingMigrations = (await db.Database.GetPendingMigrationsAsync()).ToList();
    Log.Information("Registered migrations: [{All}]", string.Join(", ", allMigrations));
    Log.Information("Pending migrations:    [{Pending}]", string.Join(", ", pendingMigrations));

    if (pendingMigrations.Count > 0)
    {
        // Happy path: migration classes are discoverable — apply them
        await db.Database.MigrateAsync();
    }
    else if (allMigrations.Count == 0)
    {
        // Migration classes not discovered (EF Core reflection issue) —
        // fall back to EnsureCreated which builds schema directly from the model.
        Log.Warning("No migration classes found via reflection. Falling back to EnsureCreated.");
        await db.Database.EnsureCreatedAsync();
    }
    // else: all migrations already applied — nothing to do

    await seeder.SeedAsync();
    await seeder.SeedAdminAsync();
}

// ── Middleware pipeline ───────────────────────────────────────────────────────
app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseCors();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "PropIntelligence v1");
        c.DocumentTitle = "PropIntelligence API";
    });
}

app.UseHttpsRedirection();
app.UseAuthentication();
app.UseAuthorization();
app.MapControllers();

Log.Information("PropIntelligence API started. Swagger at /swagger");
app.Run();
