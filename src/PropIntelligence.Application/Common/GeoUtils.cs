namespace PropIntelligence.Application.Common;

/// <summary>
/// Geospatial utilities for radius-based property search.
///
/// Uses the Haversine formula which assumes a spherical Earth (radius 6,371 km).
/// Error margin: ~0.5% for the distances typical in AU suburb searches (≤50 km).
/// Acceptable for property search; would not be acceptable for surveying or navigation.
///
/// Bounding-box pre-filter: before running Haversine, we filter the dataset to a
/// square bounding box of ±radiusKm degrees. This dramatically reduces the number
/// of expensive Haversine calculations.  In SQL, the bounding box can use regular
/// indexed columns (Latitude BETWEEN x AND y AND Longitude BETWEEN a AND b) —
/// no spatial index required.
/// </summary>
public static class GeoUtils
{
    private const double EarthRadiusKm = 6371.0;

    /// <summary>
    /// Returns the great-circle distance between two WGS-84 coordinates, in kilometres.
    /// </summary>
    public static double DistanceKm(double lat1, double lon1, double lat2, double lon2)
    {
        var dLat = ToRad(lat2 - lat1);
        var dLon = ToRad(lon2 - lon1);
        var a = Math.Sin(dLat / 2) * Math.Sin(dLat / 2)
              + Math.Cos(ToRad(lat1)) * Math.Cos(ToRad(lat2))
              * Math.Sin(dLon / 2)   * Math.Sin(dLon / 2);
        var c = 2 * Math.Atan2(Math.Sqrt(a), Math.Sqrt(1 - a));
        return EarthRadiusKm * c;
    }

    /// <summary>
    /// Returns a bounding box (minLat, maxLat, minLon, maxLon) for a given centre
    /// and radius. Used to pre-filter rows in SQL before the Haversine calculation.
    /// </summary>
    public static (double MinLat, double MaxLat, double MinLon, double MaxLon)
        BoundingBox(double latitude, double longitude, double radiusKm)
    {
        // 1 degree latitude ≈ 111 km
        var latDelta = radiusKm / 111.0;
        // Longitude degrees shrink as latitude increases
        var lonDelta = radiusKm / (111.0 * Math.Cos(ToRad(latitude)));

        return (
            latitude  - latDelta,
            latitude  + latDelta,
            longitude - lonDelta,
            longitude + lonDelta
        );
    }

    private static double ToRad(double degrees) => degrees * Math.PI / 180.0;
}
