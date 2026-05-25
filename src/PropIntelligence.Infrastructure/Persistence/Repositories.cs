using Microsoft.EntityFrameworkCore;
using PropIntelligence.Application.Interfaces;
using PropIntelligence.Domain.Entities;
using PropIntelligence.Domain.Enums;

namespace PropIntelligence.Infrastructure.Persistence;

// ── Property Repository ───────────────────────────────────────────────────────

public class PropertyRepository : IPropertyRepository
{
    private readonly PropIntelligenceContext _context;
    public PropertyRepository(PropIntelligenceContext context) => _context = context;

    public Task<Property?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _context.Properties
            .Include(p => p.SalesHistoryRecords)
            .Include(p => p.Listings)
            .FirstOrDefaultAsync(p => p.Id == id, ct);

    public async Task<(IEnumerable<Property> Items, int TotalCount)> SearchAsync(
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
        CancellationToken ct = default)
    {
        var query = _context.Properties
            .Include(p => p.SalesHistoryRecords)
            .Include(p => p.Listings)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(suburb))
            query = query.Where(p => EF.Functions.Like(p.Suburb, $"%{suburb}%"));

        if (state.HasValue)
            query = query.Where(p => p.State == state.Value);

        if (!string.IsNullOrWhiteSpace(postcode))
            query = query.Where(p => p.Postcode == postcode);

        if (propertyType.HasValue)
            query = query.Where(p => p.PropertyType == propertyType.Value);

        if (minBedrooms.HasValue)
            query = query.Where(p => p.Bedrooms >= minBedrooms.Value);

        if (maxBedrooms.HasValue)
            query = query.Where(p => p.Bedrooms <= maxBedrooms.Value);

        // Price filter uses most-recent sale — achieved via a correlated subquery
        if (minPrice.HasValue || maxPrice.HasValue)
        {
            query = query.Where(p => p.SalesHistoryRecords.Any());

            if (minPrice.HasValue)
                query = query.Where(p =>
                    p.SalesHistoryRecords.OrderByDescending(s => s.SaleDate)
                        .First().Price >= minPrice.Value);

            if (maxPrice.HasValue)
                query = query.Where(p =>
                    p.SalesHistoryRecords.OrderByDescending(s => s.SaleDate)
                        .First().Price <= maxPrice.Value);
        }

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, total);
    }

    public async Task<IEnumerable<Property>> GetWithinBoundingBoxAsync(
        double minLat, double maxLat,
        double minLon, double maxLon,
        CancellationToken ct = default) =>
        await _context.Properties
            .Include(p => p.SalesHistoryRecords)
            .Where(p =>
                p.Latitude  >= minLat && p.Latitude  <= maxLat &&
                p.Longitude >= minLon && p.Longitude <= maxLon)
            .ToListAsync(ct);

    public async Task AddAsync(Property property, CancellationToken ct = default) =>
        await _context.Properties.AddAsync(property, ct);

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var p = await _context.Properties.FindAsync([id], ct);
        if (p is not null) _context.Properties.Remove(p);
        // EF cascade deletes SalesHistory + Listings
    }
}

// ── Sales History Repository ──────────────────────────────────────────────────

public class SalesHistoryRepository : ISalesHistoryRepository
{
    private readonly PropIntelligenceContext _context;
    public SalesHistoryRepository(PropIntelligenceContext context) => _context = context;

    public async Task<IEnumerable<SalesHistory>> GetByPropertyIdAsync(
        Guid propertyId, CancellationToken ct = default) =>
        await _context.SalesHistory
            .Include(s => s.Property)
            .Where(s => s.PropertyId == propertyId)
            .OrderByDescending(s => s.SaleDate)
            .ToListAsync(ct);

    public async Task<(IEnumerable<SalesHistory> Items, int TotalCount)> GetBySuburbAsync(
        string suburb,
        AustralianState? state,
        DateTime? fromDate,
        DateTime? toDate,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        var query = _context.SalesHistory
            .Include(s => s.Property)
            .Where(s => EF.Functions.Like(s.Property.Suburb, $"%{suburb}%"))
            .AsQueryable();

        if (state.HasValue)
            query = query.Where(s => s.Property.State == state.Value);

        if (fromDate.HasValue)
            query = query.Where(s => s.SaleDate >= fromDate.Value);

        if (toDate.HasValue)
            query = query.Where(s => s.SaleDate <= toDate.Value);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(s => s.SaleDate)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return (items, total);
    }

    public async Task AddAsync(SalesHistory sale, CancellationToken ct = default) =>
        await _context.SalesHistory.AddAsync(sale, ct);
}

// ── Listing Repository ────────────────────────────────────────────────────────

public class ListingRepository : IListingRepository
{
    private readonly PropIntelligenceContext _context;
    public ListingRepository(PropIntelligenceContext context) => _context = context;

    public Task<PropertyListing?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _context.PropertyListings
            .Include(l => l.Property)
            .FirstOrDefaultAsync(l => l.Id == id, ct);

    public async Task<IEnumerable<PropertyListing>> GetActiveByPropertyIdAsync(
        Guid propertyId, CancellationToken ct = default) =>
        await _context.PropertyListings
            .Include(l => l.Property)
            .Where(l => l.PropertyId == propertyId &&
                        l.Status == Domain.Enums.ListingStatus.Active)
            .ToListAsync(ct);

    public async Task AddAsync(PropertyListing listing, CancellationToken ct = default) =>
        await _context.PropertyListings.AddAsync(listing, ct);
}

// ── User Repository ───────────────────────────────────────────────────────────

public class UserRepository : IUserRepository
{
    private readonly PropIntelligenceContext _context;
    public UserRepository(PropIntelligenceContext context) => _context = context;

    public Task<User?> GetByEmailAsync(string email, CancellationToken ct = default) =>
        _context.Users.FirstOrDefaultAsync(
            u => u.Email == email.ToLowerInvariant().Trim(), ct);

    public Task<User?> GetByIdAsync(Guid id, CancellationToken ct = default) =>
        _context.Users.FindAsync([id], ct).AsTask();

    public async Task AddAsync(User user, CancellationToken ct = default) =>
        await _context.Users.AddAsync(user, ct);
}

// ── Unit of Work ──────────────────────────────────────────────────────────────

public class UnitOfWork : IUnitOfWork
{
    private readonly PropIntelligenceContext _context;
    public UnitOfWork(PropIntelligenceContext context) => _context = context;
    public Task<int> SaveChangesAsync(CancellationToken ct = default) =>
        _context.SaveChangesAsync(ct);
}
