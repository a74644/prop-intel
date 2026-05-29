using System.Text;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using PropIntelligence.Application.Interfaces;
using PropIntelligence.Infrastructure.AI;
using PropIntelligence.Infrastructure.Auth;
using PropIntelligence.Infrastructure.Persistence;
using PropIntelligence.Infrastructure.Persistence.Seed;

namespace PropIntelligence.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration config)
    {
        // ── EF Core — SQL Server ──────────────────────────────────────────────
        services.AddDbContext<PropIntelligenceContext>(options =>
            options.UseSqlServer(
                config.GetConnectionString("DefaultConnection")));

        services.AddScoped<IPropertyRepository,     PropertyRepository>();
        services.AddScoped<ISalesHistoryRepository, SalesHistoryRepository>();
        services.AddScoped<IListingRepository,      ListingRepository>();
        services.AddScoped<IUserRepository,         UserRepository>();
        services.AddScoped<IUnitOfWork,             UnitOfWork>();

        // ── Auth ──────────────────────────────────────────────────────────────
        services.AddScoped<ITokenService,    TokenService>();
        services.AddScoped<IPasswordService, PasswordService>();
        services.AddScoped<DataSeeder>();

        // ── AI / OpenRouter ───────────────────────────────────────────────────
        services.AddHttpClient();
        services.AddScoped<INaturalLanguageService, NaturalLanguageService>();

        // ── JWT Bearer ────────────────────────────────────────────────────────
        var jwtSecret = config["Jwt:Secret"]
            ?? throw new InvalidOperationException("Jwt:Secret is required.");

        services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
            .AddJwtBearer(options =>
            {
                options.TokenValidationParameters = new TokenValidationParameters
                {
                    ValidateIssuer           = true,
                    ValidateAudience         = true,
                    ValidateLifetime         = true,
                    ValidateIssuerSigningKey  = true,
                    ValidIssuer              = config["Jwt:Issuer"],
                    ValidAudience            = config["Jwt:Audience"],
                    IssuerSigningKey         = new SymmetricSecurityKey(
                                                  Encoding.UTF8.GetBytes(jwtSecret)),
                    ClockSkew = TimeSpan.FromMinutes(1)
                };
            });

        services.AddAuthorization();

        return services;
    }
}
