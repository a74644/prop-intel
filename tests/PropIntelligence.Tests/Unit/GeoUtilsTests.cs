using PropIntelligence.Application.Common;

namespace PropIntelligence.Tests.Unit;

/// <summary>
/// Validates the Haversine implementation and bounding-box helper.
/// Reference distances verified against online great-circle calculators.
/// </summary>
public class GeoUtilsTests
{
    // ── DistanceKm ────────────────────────────────────────────────────────────

    [Fact]
    public void DistanceKm_SamePoint_ReturnsZero()
    {
        var result = GeoUtils.DistanceKm(-33.8688, 151.2093, -33.8688, 151.2093);
        result.Should().BeApproximately(0.0, precision: 0.001);
    }

    [Fact]
    public void DistanceKm_SydneyCBD_ToSurreyHills_IsApproximately3km()
    {
        // Sydney CBD: -33.8688, 151.2093
        // Surry Hills: -33.8872, 151.2109
        var result = GeoUtils.DistanceKm(-33.8688, 151.2093, -33.8872, 151.2109);
        // ~2.1 km straight line; within a tolerance of 0.5 km
        result.Should().BeInRange(1.5, 2.8);
    }

    [Fact]
    public void DistanceKm_SydneyToMelbourne_IsApproximately714km()
    {
        // Sydney CBD → Melbourne CBD
        var result = GeoUtils.DistanceKm(-33.8688, 151.2093, -37.8136, 144.9631);
        // Known great-circle distance ~713–715 km
        result.Should().BeApproximately(713.5, precision: 5.0);
    }

    [Fact]
    public void DistanceKm_IsSymmetric()
    {
        double a = GeoUtils.DistanceKm(-33.8688, 151.2093, -37.8136, 144.9631);
        double b = GeoUtils.DistanceKm(-37.8136, 144.9631, -33.8688, 151.2093);
        a.Should().BeApproximately(b, precision: 0.001);
    }

    [Fact]
    public void DistanceKm_BrisbaneCBD_ToNewFarm_IsUnder5km()
    {
        // Brisbane CBD: -27.4698, 153.0251
        // New Farm:     -27.4654, 153.0464
        var result = GeoUtils.DistanceKm(-27.4698, 153.0251, -27.4654, 153.0464);
        result.Should().BeLessThan(5.0);
        result.Should().BeGreaterThan(0.5);
    }

    // ── BoundingBox ────────────────────────────────────────────────────────────

    [Fact]
    public void BoundingBox_CentreIsWithinBox()
    {
        var (minLat, maxLat, minLon, maxLon) = GeoUtils.BoundingBox(-33.8688, 151.2093, 5.0);

        (-33.8688).Should().BeInRange(minLat, maxLat);
        (151.2093).Should().BeInRange(minLon, maxLon);
    }

    [Fact]
    public void BoundingBox_1kmRadius_BoxIsNarrowerThan2Degrees()
    {
        var (minLat, maxLat, minLon, maxLon) = GeoUtils.BoundingBox(-33.8688, 151.2093, 1.0);

        (maxLat - minLat).Should().BeLessThan(0.1);  // 1 km ≈ 0.009° lat
        (maxLon - minLon).Should().BeLessThan(0.1);
    }

    [Fact]
    public void BoundingBox_PointKnownInsideRadius_FallsWithinBox()
    {
        // Surry Hills is ~2.1 km from Sydney CBD
        var (minLat, maxLat, minLon, maxLon) = GeoUtils.BoundingBox(-33.8688, 151.2093, 5.0);

        (-33.8872).Should().BeInRange(minLat, maxLat, "Surry Hills lat should be inside 5 km bounding box");
        (151.2109).Should().BeInRange(minLon, maxLon, "Surry Hills lon should be inside 5 km bounding box");
    }

    [Fact]
    public void BoundingBox_MelbourneNotInSydney5kmBox()
    {
        var (minLat, maxLat, minLon, maxLon) = GeoUtils.BoundingBox(-33.8688, 151.2093, 5.0);

        // Melbourne is ~714 km away — must be outside the bounding box
        bool melbourneInBox = -37.8136 >= minLat && -37.8136 <= maxLat
                           && 144.9631 >= minLon && 144.9631 <= maxLon;
        melbourneInBox.Should().BeFalse();
    }

    [Fact]
    public void BoundingBox_HigherLatitude_LonDeltaIsWider()
    {
        // At higher latitudes, the same km radius spans MORE longitude degrees
        // because longitude degrees shrink as you approach the poles.
        // Sydney (-33°) has narrower lon band than Hobart (-42°) for same radius.
        var (_, _, sydMinLon, sydMaxLon) = GeoUtils.BoundingBox(-33.0, 151.0, 10.0);
        var (_, _, hobMinLon, hobMaxLon) = GeoUtils.BoundingBox(-42.0, 147.0, 10.0);

        (hobMaxLon - hobMinLon).Should().BeGreaterThan(sydMaxLon - sydMinLon,
            "Higher latitude (Hobart) means more longitude degrees per km");
    }
}
