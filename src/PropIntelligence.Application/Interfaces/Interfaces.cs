using PropIntelligence.Application.DTOs;
using PropIntelligence.Domain.Entities;
using PropIntelligence.Domain.Enums;

namespace PropIntelligence.Application.Interfaces;

public interface IUnitOfWork
{
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}

public interface IPropertyRepository
{
    Task<Property?> GetByIdAsync(Guid id, CancellationToken ct = default);

    Task<(IEnumerable<Property> Items, int TotalCount)> SearchAsync(
        string? suburb,
        AustralianState? state,
        string? postcode,
        PropertyType? propertyType,
        int? minBedrooms,
        int? maxBedrooms,
        decimal? minPrice,
        decimal? maxPrice,
        int page,
        int pageSize,
        CancellationToken ct = default);

    /// <summary>
    /// Returns properties within a bounding box (lat/lon range).
    /// Haversine filtering is applied in the application layer after the
    /// bounding-box pre-filter narrows the candidate set in SQL.
    /// </summary>
    Task<IEnumerable<Property>> GetWithinBoundingBoxAsync(
        double minLat, double maxLat,
        double minLon, double maxLon,
        CancellationToken ct = default);

    Task AddAsync(Property property, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}

public interface ISalesHistoryRepository
{
    Task<IEnumerable<SalesHistory>> GetByPropertyIdAsync(Guid propertyId, CancellationToken ct = default);

    Task<(IEnumerable<SalesHistory> Items, int TotalCount)> GetBySuburbAsync(
        string suburb,
        AustralianState? state,
        DateTime? fromDate,
        DateTime? toDate,
        int page,
        int pageSize,
        CancellationToken ct = default);

    Task AddAsync(SalesHistory sale, CancellationToken ct = default);
}

public interface IListingRepository
{
    Task<PropertyListing?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<IEnumerable<PropertyListing>> GetActiveByPropertyIdAsync(Guid propertyId, CancellationToken ct = default);
    Task AddAsync(PropertyListing listing, CancellationToken ct = default);
}

public interface IUserRepository
{
    Task<User?> GetByEmailAsync(string email, CancellationToken ct = default);
    Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task AddAsync(User user, CancellationToken ct = default);
}

public interface ITokenService
{
    string GenerateToken(User user);
    DateTime TokenExpiresAt();
}

public interface IPasswordService
{
    string Hash(string plaintext);
    bool Verify(string plaintext, string hash);
}

public interface INaturalLanguageService
{
    Task<ParsedSearchParams> ParseSearchQueryAsync(string query, CancellationToken ct = default);
}
