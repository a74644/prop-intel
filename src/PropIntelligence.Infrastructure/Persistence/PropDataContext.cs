using Microsoft.EntityFrameworkCore;
using PropIntelligence.Domain.Entities;

namespace PropIntelligence.Infrastructure.Persistence;

public class PropIntelligenceContext : DbContext
{
    public PropIntelligenceContext(DbContextOptions<PropIntelligenceContext> options) : base(options) { }

    public DbSet<Property>         Properties        => Set<Property>();
    public DbSet<SalesHistory>     SalesHistory      => Set<SalesHistory>();
    public DbSet<PropertyListing>  PropertyListings  => Set<PropertyListing>();
    public DbSet<User>             Users             => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(PropIntelligenceContext).Assembly);
        base.OnModelCreating(modelBuilder);
    }
}
