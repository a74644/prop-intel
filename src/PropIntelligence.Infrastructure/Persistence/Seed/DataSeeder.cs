using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PropIntelligence.Application.Interfaces;
using PropIntelligence.Domain.Entities;
using PropIntelligence.Domain.Enums;

namespace PropIntelligence.Infrastructure.Persistence.Seed;

/// <summary>
/// Seeds representative Australian property data for demo / portfolio purposes.
/// All addresses, prices, and agent names are fictitious but geographically accurate
/// (real suburb coordinates, realistic 2024-2025 price ranges for each market).
///
/// Real-world context: PropIntelligence.ai sources live data from RP Data / CoreLogic APIs.
/// This seed data mirrors the schema and price distributions of that production feed.
/// </summary>
public class DataSeeder
{
    private readonly PropIntelligenceContext _context;
    private readonly ILogger<DataSeeder>     _logger;
    private readonly IPasswordService        _passwords;
    private readonly IConfiguration          _config;

    public DataSeeder(
        PropIntelligenceContext context,
        ILogger<DataSeeder>     logger,
        IPasswordService        passwords,
        IConfiguration          config)
    {
        _context   = context;
        _logger    = logger;
        _passwords = passwords;
        _config    = config;
    }

    // ── Property seed ─────────────────────────────────────────────────────────

    public async Task SeedAsync(CancellationToken ct = default)
    {
        if (await _context.Properties.AnyAsync(ct))
        {
            _logger.LogInformation("Seed data already exists — skipping.");
            return;
        }

        _logger.LogInformation("Seeding demo property data…");
        var properties = BuildProperties();
        await _context.Properties.AddRangeAsync(properties, ct);
        await _context.SaveChangesAsync(ct);
        _logger.LogInformation("Seeded {Count} properties.", properties.Count);
    }

    // ── Admin seed ────────────────────────────────────────────────────────────

    /// <summary>
    /// Ensures a bootstrap Admin account exists on every startup.
    /// Driven by Seed:AdminEmail / Seed:AdminPassword configuration (set via
    /// ADMIN_EMAIL / ADMIN_PASSWORD environment variables in docker-compose / .env).
    ///
    /// Idempotent: if the configured email is already in the Users table this
    /// method is a no-op, so re-deployments never create duplicates.
    /// </summary>
    public async Task SeedAdminAsync(CancellationToken ct = default)
    {
        var email    = _config["Seed:AdminEmail"]?.Trim();
        var password = _config["Seed:AdminPassword"];

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
        {
            _logger.LogWarning(
                "Seed:AdminEmail or Seed:AdminPassword not configured — " +
                "admin account not seeded. Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.");
            return;
        }

        var normalised = email.ToLowerInvariant();
        if (await _context.Users.AnyAsync(u => u.Email == normalised, ct))
        {
            _logger.LogInformation("Admin account already exists ({Email}) — skipping.", normalised);
            return;
        }

        var hash  = _passwords.Hash(password);
        var admin = User.Create(email, hash, "Admin", "User", UserRole.Admin);
        await _context.Users.AddAsync(admin, ct);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("Admin account seeded: {Email} (role=Admin)", admin.Email);
    }

    private static List<Property> BuildProperties()
    {
        var props = new List<Property>();

        // ── Sydney Inner / Eastern Suburbs (NSW) ─────────────────────────────

        var surryHillsTerrace = P("42", "Crown", "St", "Surry Hills", AustralianState.NSW, "2010",
            -33.8840, 151.2115, PropertyType.House, 3, 1, 1, 162m, 140m);
        surryHillsTerrace.AddSales(
            Sale(surryHillsTerrace.Id, 1_420_000m, "2025-03-14", SaleMethod.Auction, "Ray White Surry Hills", "Sarah Mitchell", 18),
            Sale(surryHillsTerrace.Id, 1_080_000m, "2022-08-10", SaleMethod.Auction, "McGrath Surry Hills", "James Park", 22));
        props.Add(surryHillsTerrace);

        var glebeApartment = P("12", "21", "Glebe Point Rd", "Glebe", AustralianState.NSW, "2037",
            -33.8750, 151.1880, PropertyType.Apartment, 2, 1, 1, null, 78m);
        glebeApartment.AddSales(
            Sale(glebeApartment.Id, 895_000m, "2025-01-22", SaleMethod.PrivateTreaty, "Belle Property Glebe", "Amy Chen", 35));
        props.Add(glebeApartment);

        var paddingtonTerrace = P("88", "Oxford", "St", "Paddington", AustralianState.NSW, "2021",
            -33.8850, 151.2270, PropertyType.House, 3, 2, 0, 185m, 160m);
        paddingtonTerrace.AddSales(
            Sale(paddingtonTerrace.Id, 2_150_000m, "2024-11-08", SaleMethod.Auction, "BresicWhitney Paddington", "Tom O'Brien", 14));
        props.Add(paddingtonTerrace);

        var mosmanHouse = P("15", "Raglan", "St", "Mosman", AustralianState.NSW, "2088",
            -33.8267, 151.2441, PropertyType.House, 4, 3, 2, 620m, 340m);
        mosmanHouse.AddSales(
            Sale(mosmanHouse.Id, 4_850_000m, "2025-02-20", SaleMethod.Auction, "LJ Hooker Mosman", "Rebecca Hart", 19),
            Sale(mosmanHouse.Id, 3_600_000m, "2021-05-15", SaleMethod.Auction, "LJ Hooker Mosman", "Rebecca Hart", 24));
        props.Add(mosmanHouse);

        var newtown = P("7", "King", "St", "Newtown", AustralianState.NSW, "2042",
            -33.8960, 151.1793, PropertyType.House, 3, 2, 0, 175m, 150m);
        newtown.AddSales(
            Sale(newtown.Id, 1_680_000m, "2024-09-12", SaleMethod.Auction, "Raine & Horne Newtown", "David Lee", 21));
        props.Add(newtown);

        var bondiFlatGround = P("3", "Fletcher", "St", "Bondi Beach", AustralianState.NSW, "2026",
            -33.8922, 151.2769, PropertyType.Apartment, 2, 1, 1, null, 68m);
        bondiFlatGround.AddSales(
            Sale(bondiFlatGround.Id, 1_250_000m, "2025-04-03", SaleMethod.Auction, "Ray White Bondi", "Nina Watkins", 16));
        props.Add(bondiFlatGround);

        var chatswoodApt = P("503", "45", "Victor St", "Chatswood", AustralianState.NSW, "2067",
            -33.7970, 151.1823, PropertyType.Apartment, 2, 2, 1, null, 92m);
        chatswoodApt.AddSales(
            Sale(chatswoodApt.Id, 1_050_000m, "2024-12-05", SaleMethod.PrivateTreaty, "Laing+Simmons Chatswood", "Kevin Zhao", 28));
        props.Add(chatswoodApt);

        var manlyHouse = P("22", "Ivanhoe", "Pl", "Manly", AustralianState.NSW, "2095",
            -33.7969, 151.2855, PropertyType.House, 4, 2, 2, 510m, 280m);
        manlyHouse.AddSales(
            Sale(manlyHouse.Id, 3_900_000m, "2025-01-30", SaleMethod.Auction, "PRD Nationwide Manly", "Sophie Lawson", 12));
        props.Add(manlyHouse);

        var pyrmont = P("1201", "100", "Murray St", "Pyrmont", AustralianState.NSW, "2009",
            -33.8717, 151.1945, PropertyType.Apartment, 1, 1, 1, null, 55m);
        pyrmont.AddSales(
            Sale(pyrmont.Id, 720_000m, "2025-03-28", SaleMethod.PrivateTreaty, "McGrath City", "Jack Turner", 42));
        props.Add(pyrmont);

        // ── Sydney North Shore ────────────────────────────────────────────────

        var northSydneyApt = P("802", "77", "Berry St", "North Sydney", AustralianState.NSW, "2060",
            -33.8397, 151.2073, PropertyType.Apartment, 2, 2, 1, null, 105m);
        northSydneyApt.AddSales(
            Sale(northSydneyApt.Id, 1_180_000m, "2024-10-15", SaleMethod.PrivateTreaty, "CBRE Residential", "Linda Park", 30));
        props.Add(northSydneyApt);

        // ── Melbourne Inner Suburbs (VIC) ─────────────────────────────────────

        var fitzroyTerrace = P("45", "Smith", "St", "Fitzroy", AustralianState.VIC, "3065",
            -37.7980, 144.9780, PropertyType.House, 3, 1, 0, 196m, 165m);
        fitzroyTerrace.AddSales(
            Sale(fitzroyTerrace.Id, 1_620_000m, "2025-03-22", SaleMethod.Auction, "Hocking Stuart Fitzroy", "Anna Brennan", 20),
            Sale(fitzroyTerrace.Id, 1_190_000m, "2020-11-28", SaleMethod.Auction, "Hocking Stuart Fitzroy", "Anna Brennan", 26));
        props.Add(fitzroyTerrace);

        var richmondHouse = P("88", "Swan", "St", "Richmond", AustralianState.VIC, "3121",
            -37.8226, 144.9994, PropertyType.House, 4, 2, 2, 405m, 260m);
        richmondHouse.AddSales(
            Sale(richmondHouse.Id, 2_050_000m, "2024-11-16", SaleMethod.Auction, "Jellis Craig Richmond", "Mark Sullivan", 15));
        props.Add(richmondHouse);

        var southYarraApt = P("1404", "25", "Chapel St", "South Yarra", AustralianState.VIC, "3141",
            -37.8382, 144.9929, PropertyType.Apartment, 2, 2, 1, null, 98m);
        southYarraApt.AddSales(
            Sale(southYarraApt.Id, 885_000m, "2025-02-08", SaleMethod.PrivateTreaty, "RT Edgar South Yarra", "Claire Wong", 33));
        props.Add(southYarraApt);

        var stKildaFlat = P("5", "12", "Fitzroy St", "St Kilda", AustralianState.VIC, "3182",
            -37.8676, 144.9729, PropertyType.Apartment, 2, 1, 1, null, 72m);
        stKildaFlat.AddSales(
            Sale(stKildaFlat.Id, 750_000m, "2024-08-24", SaleMethod.Auction, "Gary Peer St Kilda", "Olivia Roberts", 28),
            Sale(stKildaFlat.Id, 590_000m, "2019-04-06", SaleMethod.PrivateTreaty, "Biggin & Scott", null, 45));
        props.Add(stKildaFlat);

        var hawthornHouse = P("12", "Auburn", "Rd", "Hawthorn", AustralianState.VIC, "3122",
            -37.8229, 145.0330, PropertyType.House, 4, 3, 2, 580m, 320m);
        hawthornHouse.AddSales(
            Sale(hawthornHouse.Id, 2_850_000m, "2025-03-01", SaleMethod.Auction, "Jellis Craig Hawthorn", "Ben Carter", 17));
        props.Add(hawthornHouse);

        var carltonTownhouse = P("8", "Lygon", "St", "Carlton", AustralianState.VIC, "3053",
            -37.7984, 144.9672, PropertyType.Townhouse, 3, 2, 1, 225m, 185m);
        carltonTownhouse.AddSales(
            Sale(carltonTownhouse.Id, 1_380_000m, "2025-01-18", SaleMethod.Auction, "Nelson Alexander Carlton", "Priya Sharma", 22));
        props.Add(carltonTownhouse);

        var collingwoodTerrace = P("67", "Hoddle", "St", "Collingwood", AustralianState.VIC, "3066",
            -37.7999, 144.9937, PropertyType.House, 2, 1, 0, 135m, 120m);
        collingwoodTerrace.AddSales(
            Sale(collingwoodTerrace.Id, 1_050_000m, "2024-09-07", SaleMethod.Auction, "Hocking Stuart Collingwood", "Ethan Wells", 19));
        props.Add(collingwoodTerrace);

        var prahranApt = P("201", "180", "High St", "Prahran", AustralianState.VIC, "3181",
            -37.8499, 144.9904, PropertyType.Apartment, 2, 2, 1, null, 88m);
        prahranApt.AddSales(
            Sale(prahranApt.Id, 810_000m, "2024-12-20", SaleMethod.PrivateTreaty, "Harcourts Prahran", "Mei Lin", 38));
        props.Add(prahranApt);

        var brunswickHouse = P("33", "Sydney", "Rd", "Brunswick", AustralianState.VIC, "3056",
            -37.7650, 144.9614, PropertyType.House, 3, 2, 1, 310m, 195m);
        brunswickHouse.AddSales(
            Sale(brunswickHouse.Id, 1_195_000m, "2025-02-15", SaleMethod.Auction, "Nelson Alexander Brunswick", "Tom Chen", 24));
        props.Add(brunswickHouse);

        var toorakHouse = P("27", "Orrong", "Rd", "Toorak", AustralianState.VIC, "3142",
            -37.8468, 145.0119, PropertyType.House, 5, 4, 3, 1120m, 480m);
        toorakHouse.AddSales(
            Sale(toorakHouse.Id, 8_200_000m, "2025-03-12", SaleMethod.PrivateTreaty, "Kay & Burton Toorak", "James Forsyth", null));
        props.Add(toorakHouse);

        // ── Brisbane Inner Suburbs (QLD) ──────────────────────────────────────

        var newFarmHouse = P("18", "Commercial", "Rd", "New Farm", AustralianState.QLD, "4005",
            -27.4670, 153.0445, PropertyType.House, 3, 2, 2, 405m, 220m);
        newFarmHouse.AddSales(
            Sale(newFarmHouse.Id, 1_480_000m, "2025-02-28", SaleMethod.Auction, "Ray White New Farm", "Jessica Campbell", 21),
            Sale(newFarmHouse.Id, 980_000m, "2021-06-18", SaleMethod.PrivateTreaty, "Place Estate Agents", "Michael Young", 35));
        props.Add(newFarmHouse);

        var westEndQld = P("7", "Jane", "St", "West End", AustralianState.QLD, "4101",
            -27.4795, 153.0111, PropertyType.House, 3, 2, 1, 385m, 185m);
        westEndQld.AddSales(
            Sale(westEndQld.Id, 1_195_000m, "2024-11-09", SaleMethod.Auction, "Harcourts Solutions West End", "Chloe Davies", 18));
        props.Add(westEndQld);

        var teneriffeApt = P("703", "28", "Commercial Rd", "Teneriffe", AustralianState.QLD, "4005",
            -27.4552, 153.0501, PropertyType.Apartment, 2, 2, 2, null, 115m);
        teneriffeApt.AddSales(
            Sale(teneriffeApt.Id, 1_050_000m, "2025-01-11", SaleMethod.PrivateTreaty, "Place Estate Teneriffe", "Aaron James", 29));
        props.Add(teneriffeApt);

        var paddingtonQld = P("44", "Given", "Tce", "Paddington", AustralianState.QLD, "4064",
            -27.4618, 152.9862, PropertyType.House, 3, 2, 2, 405m, 215m);
        paddingtonQld.AddSales(
            Sale(paddingtonQld.Id, 1_340_000m, "2024-10-05", SaleMethod.Auction, "LJ Hooker Paddington QLD", "Fiona McGrath", 25));
        props.Add(paddingtonQld);

        var fortitudeValleyApt = P("1202", "300", "Ann St", "Fortitude Valley", AustralianState.QLD, "4006",
            -27.4569, 153.0334, PropertyType.Apartment, 1, 1, 1, null, 58m);
        fortitudeValleyApt.AddSales(
            Sale(fortitudeValleyApt.Id, 490_000m, "2025-03-05", SaleMethod.PrivateTreaty, "Ray White City", "Sam Wilson", 44));
        props.Add(fortitudeValleyApt);

        var woolloongabba = P("11", "Logan", "Rd", "Woolloongabba", AustralianState.QLD, "4102",
            -27.4965, 153.0360, PropertyType.House, 3, 1, 2, 352m, 155m);
        woolloongabba.AddSales(
            Sale(woolloongabba.Id, 1_050_000m, "2024-08-22", SaleMethod.Auction, "McGrath Brisbane", "Ben Nguyen", 27));
        props.Add(woolloongabba);

        var springHill = P("4", "Leichhardt", "St", "Spring Hill", AustralianState.QLD, "4000",
            -27.4602, 153.0227, PropertyType.Townhouse, 3, 2, 2, 285m, 195m);
        springHill.AddSales(
            Sale(springHill.Id, 920_000m, "2025-02-14", SaleMethod.PrivateTreaty, "Harcourts Brisbane", "Emma Torres", 32));
        props.Add(springHill);

        var ascotQld = P("62", "Crosby", "Rd", "Ascot", AustralianState.QLD, "4007",
            -27.4327, 153.0605, PropertyType.House, 4, 3, 2, 607m, 310m);
        ascotQld.AddSales(
            Sale(ascotQld.Id, 2_250_000m, "2025-03-19", SaleMethod.Auction, "Place Estate Ascot", "Charlotte Evans", 13));
        props.Add(ascotQld);

        // ── South East Queensland – Gold Coast (QLD) ──────────────────────────

        var broadbeachApt = P("2103", "18", "Victoria Ave", "Broadbeach", AustralianState.QLD, "4218",
            -27.9989, 153.4301, PropertyType.Apartment, 3, 2, 2, null, 135m);
        broadbeachApt.AddSales(
            Sale(broadbeachApt.Id, 1_200_000m, "2025-01-25", SaleMethod.PrivateTreaty, "Ray White Broadbeach", "Daniel Moore", 36));
        props.Add(broadbeachApt);

        // ── Adelaide Inner Suburbs (SA) ───────────────────────────────────────

        var northAdelaideHouse = P("28", "Jeffcott", "St", "North Adelaide", AustralianState.SA, "5006",
            -34.9018, 138.5985, PropertyType.House, 4, 2, 2, 556m, 265m);
        northAdelaideHouse.AddSales(
            Sale(northAdelaideHouse.Id, 1_450_000m, "2025-02-07", SaleMethod.Auction, "Harris Real Estate", "Lucy Thompson", 20));
        props.Add(northAdelaideHouse);

        var unleyTownhouse = P("3", "Edmund", "Ave", "Unley", AustralianState.SA, "5061",
            -34.9400, 138.5942, PropertyType.Townhouse, 3, 2, 1, 260m, 200m);
        unleyTownhouse.AddSales(
            Sale(unleyTownhouse.Id, 980_000m, "2024-09-14", SaleMethod.PrivateTreaty, "Toop&Toop", "George Patel", 30));
        props.Add(unleyTownhouse);

        // ── Perth Inner Suburbs (WA) ──────────────────────────────────────────

        var subiacoHouse = P("15", "Hay", "St", "Subiaco", AustralianState.WA, "6008",
            -31.9480, 115.8293, PropertyType.House, 3, 2, 2, 468m, 225m);
        subiacoHouse.AddSales(
            Sale(subiacoHouse.Id, 1_650_000m, "2025-03-10", SaleMethod.Auction, "Mack Hall Subiaco", "Rachel Burns", 16));
        props.Add(subiacoHouse);

        var cottesloeApt = P("12", "Marine", "Pde", "Cottesloe", AustralianState.WA, "6011",
            -31.9994, 115.7530, PropertyType.Apartment, 2, 2, 1, null, 98m);
        cottesloeApt.AddSales(
            Sale(cottesloeApt.Id, 1_250_000m, "2025-01-16", SaleMethod.PrivateTreaty, "Abel McGrath", "Chris Palmer", 28));
        props.Add(cottesloeApt);

        // ── Properties without sales history (newly listed) ───────────────────

        var kellyvilleNewBuild = P("4", "Sanctuary", "Dr", "Kellyville", AustralianState.NSW, "2155",
            -33.7225, 150.9697, PropertyType.House, 5, 3, 2, 450m, 350m);
        props.Add(kellyvilleNewBuild);

        var dandenongApt = P("305", "10", "Mason St", "Dandenong", AustralianState.VIC, "3175",
            -37.9873, 145.2163, PropertyType.Apartment, 2, 1, 1, null, 70m);
        props.Add(dandenongApt);

        return props;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static Property P(
        string streetNo, string streetName, string streetType,
        string suburb, AustralianState state, string postcode,
        double lat, double lon, PropertyType type,
        int bed, int bath, int car,
        decimal? land, decimal? floor) =>
        Property.Create(string.Empty, streetNo, streetName, streetType,
            suburb, state, postcode, lat, lon, type, bed, bath, car, land, floor, null, null);

    private static Property P(
        string unit, string streetNo, string streetName, string streetType,
        string suburb, AustralianState state, string postcode,
        double lat, double lon, PropertyType type,
        int bed, int bath, int car,
        decimal? land, decimal? floor) =>
        Property.Create(unit, streetNo, streetName, streetType,
            suburb, state, postcode, lat, lon, type, bed, bath, car, land, floor, null, null);

    private static SalesHistory Sale(
        Guid propertyId, decimal price, string dateStr,
        SaleMethod method, string agency, string? agent, int? dom) =>
        SalesHistory.Record(propertyId, price, DateTime.Parse(dateStr),
            method, agency, agent, dom);
}

// ── Extension methods so seeder can call AddSales ───────────────────────────

internal static class PropertySeedExtensions
{
    /// Bypasses the private backing list for seeding purposes.
    internal static void AddSales(this Property property, params SalesHistory[] sales)
    {
        var field = typeof(Property)
            .GetField("_salesHistory",
                System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)!;
        var list = (List<SalesHistory>)field.GetValue(property)!;
        list.AddRange(sales);
    }
}
