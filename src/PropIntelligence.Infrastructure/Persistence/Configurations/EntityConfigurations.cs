using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using PropIntelligence.Domain.Entities;

namespace PropIntelligence.Infrastructure.Persistence.Configurations;

public class PropertyConfiguration : IEntityTypeConfiguration<Property>
{
    public void Configure(EntityTypeBuilder<Property> builder)
    {
        builder.HasKey(p => p.Id);
        builder.Property(p => p.StreetNumber).HasMaxLength(20).IsRequired();
        builder.Property(p => p.StreetName).HasMaxLength(200).IsRequired();
        builder.Property(p => p.StreetType).HasMaxLength(50).IsRequired();
        builder.Property(p => p.UnitNumber).HasMaxLength(20);
        builder.Property(p => p.FullAddress).HasMaxLength(500).IsRequired();
        builder.Property(p => p.Suburb).HasMaxLength(100).IsRequired();
        builder.Property(p => p.Postcode).HasMaxLength(4).IsRequired();
        builder.Property(p => p.LandAreaSqm).HasColumnType("decimal(10,2)");
        builder.Property(p => p.FloorAreaSqm).HasColumnType("decimal(10,2)");
        builder.Property(p => p.LotNumber).HasMaxLength(50);
        builder.Property(p => p.PlanNumber).HasMaxLength(50);

        // Indexes for the most common search patterns
        builder.HasIndex(p => p.Suburb);
        builder.HasIndex(p => p.State);
        builder.HasIndex(p => p.Postcode);
        builder.HasIndex(p => new { p.Suburb, p.State });
        // Composite lat/lon for bounding-box queries
        builder.HasIndex(p => new { p.Latitude, p.Longitude });

        builder.HasMany(p => p.SalesHistoryRecords)
            .WithOne(s => s.Property)
            .HasForeignKey(s => s.PropertyId)
            .OnDelete(DeleteBehavior.Cascade);

        // Tell EF Core to use the private backing field so it can call Add()
        // at materialisation time (the public property is IReadOnlyCollection).
        builder.Navigation(p => p.SalesHistoryRecords)
            .HasField("_salesHistory")
            .UsePropertyAccessMode(PropertyAccessMode.Field);

        builder.HasMany(p => p.Listings)
            .WithOne(l => l.Property)
            .HasForeignKey(l => l.PropertyId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.Navigation(p => p.Listings)
            .HasField("_listings")
            .UsePropertyAccessMode(PropertyAccessMode.Field);
    }
}

public class SalesHistoryConfiguration : IEntityTypeConfiguration<SalesHistory>
{
    public void Configure(EntityTypeBuilder<SalesHistory> builder)
    {
        builder.HasKey(s => s.Id);
        builder.Property(s => s.Price).HasColumnType("decimal(18,2)").IsRequired();
        builder.Property(s => s.AgencyName).HasMaxLength(200).IsRequired();
        builder.Property(s => s.AgentName).HasMaxLength(200);

        builder.HasIndex(s => s.PropertyId);
        builder.HasIndex(s => s.SaleDate);
    }
}

public class PropertyListingConfiguration : IEntityTypeConfiguration<PropertyListing>
{
    public void Configure(EntityTypeBuilder<PropertyListing> builder)
    {
        builder.HasKey(l => l.Id);
        builder.Property(l => l.AdvertisedPrice).HasColumnType("decimal(18,2)");
        builder.Property(l => l.PriceText).HasMaxLength(100).IsRequired();
        builder.Property(l => l.AgencyName).HasMaxLength(200).IsRequired();
        builder.Property(l => l.AgentName).HasMaxLength(200).IsRequired();
        builder.Property(l => l.Description).HasColumnType("nvarchar(max)");

        builder.HasIndex(l => l.PropertyId);
        builder.HasIndex(l => l.Status);
    }
}

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> builder)
    {
        builder.HasKey(u => u.Id);
        builder.Property(u => u.Email).HasMaxLength(256).IsRequired();
        builder.Property(u => u.PasswordHash).HasMaxLength(500).IsRequired();
        builder.Property(u => u.FirstName).HasMaxLength(100).IsRequired();
        builder.Property(u => u.LastName).HasMaxLength(100).IsRequired();
        builder.Property(u => u.Role).IsRequired();

        // Enforce unique emails at DB level — not just application layer
        builder.HasIndex(u => u.Email).IsUnique();

        // Computed column ignored by EF (no column storage)
        builder.Ignore(u => u.FullName);
    }
}
