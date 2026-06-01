using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using PropIntelligence.Application.DTOs;
using PropIntelligence.Application.Interfaces;

namespace PropIntelligence.Infrastructure.AI;

public sealed class NaturalLanguageService : INaturalLanguageService
{
    private const string SystemPrompt = """
        You are a property search parameter extractor for PropIntelligence, an Australian real estate analytics platform.

        Given a natural language query, extract structured search parameters and return ONLY a valid JSON object.

        Response format — all fields optional, use null if not mentioned:
        {
          "suburb": string or null,
          "state": "NSW"|"VIC"|"QLD"|"WA"|"SA"|"TAS"|"ACT"|"NT" or null,
          "propertyType": "House"|"Apartment"|"Townhouse"|"Villa"|"Land"|"Studio" or null,
          "minPrice": number or null,
          "maxPrice": number or null,
          "minBedrooms": number or null,
          "maxBedrooms": number or null
        }

        Rules:
        - "$1.5M", "1.5 million" → 1500000; "$800k" → 800000
        - "under $2M" → maxPrice: 2000000, minPrice: null
        - "over $1M" → minPrice: 1000000, maxPrice: null
        - "around $1.5M" → minPrice: 1250000, maxPrice: 1750000
        - "3 bed", "3BR", "3 bedroom" → minBedrooms: 3
        - "3-4 bedrooms" → minBedrooms: 3, maxBedrooms: 4
        - City → state mapping: Sydney→NSW, Melbourne→VIC, Brisbane→QLD, Perth→WA, Adelaide→SA
        - Known suburbs: Bondi, Paddington, Surry Hills, Newtown → NSW; Fitzroy, St Kilda, Richmond, Prahran → VIC; Fortitude Valley → QLD
        - Return ONLY the JSON object — no explanation, no markdown, no code fences
        """;

    private readonly IHttpClientFactory          _factory;
    private readonly ILogger<NaturalLanguageService> _logger;
    private readonly string                      _apiKey;
    private readonly string                      _model;

    private static readonly JsonSerializerOptions _jsonOpts =
        new() { PropertyNameCaseInsensitive = true };

    public NaturalLanguageService(
        IHttpClientFactory factory,
        IConfiguration config,
        ILogger<NaturalLanguageService> logger)
    {
        _factory = factory;
        _logger  = logger;
        _apiKey  = config["OpenRouter:ApiKey"] ?? string.Empty;
        _model   = config["OpenRouter:Model"]  ?? "openrouter/free";
    }

    public async Task<ParsedSearchParams> ParseSearchQueryAsync(
        string query, CancellationToken ct = default)
    {
        var empty = new ParsedSearchParams(null, null, null, null, null, null, null);

        if (string.IsNullOrWhiteSpace(_apiKey) || string.IsNullOrWhiteSpace(query))
            return empty;

        try
        {
            var client = _factory.CreateClient();
            client.DefaultRequestHeaders.Clear();
            client.DefaultRequestHeaders.Add("Authorization", $"Bearer {_apiKey}");
            client.DefaultRequestHeaders.Add("HTTP-Referer", "https://propintelligence.app");
            client.DefaultRequestHeaders.Add("X-Title", "PropIntelligence");

            var requestBody = new
            {
                model    = _model,
                messages = new[]
                {
                    new { role = "system", content = SystemPrompt },
                    new { role = "user",   content = query        },
                },
                max_tokens  = 600,
                temperature = 0,
            };

            using var response = await client.PostAsJsonAsync(
                "https://openrouter.ai/api/v1/chat/completions", requestBody, ct);

            if (!response.IsSuccessStatusCode)
            {
                var errorBody = await response.Content.ReadAsStringAsync(ct);
                _logger.LogWarning("[OpenRouter] HTTP {Status} — {Body}", (int)response.StatusCode, errorBody);
                return empty;
            }

            var rawJson = await response.Content.ReadAsStringAsync(ct);
            _logger.LogInformation("[OpenRouter] Raw response: {Raw}", rawJson);

            var resp    = JsonSerializer.Deserialize<OpenRouterResponse>(rawJson, _jsonOpts);
            var content = resp?.Choices?.FirstOrDefault()?.Message?.Content;

            _logger.LogInformation("[OpenRouter] Extracted content: {Content}", content ?? "(null)");

            if (string.IsNullOrWhiteSpace(content)) return empty;

            content = ExtractJson(content.Trim());

            var ai = JsonSerializer.Deserialize<AiParsedParams>(content, _jsonOpts);
            return ai is null
                ? empty
                : new ParsedSearchParams(
                    ai.Suburb, ai.State, ai.PropertyType,
                    ai.MinPrice, ai.MaxPrice,
                    ai.MinBedrooms, ai.MaxBedrooms);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[OpenRouter] Request failed for query: {Query}", query);
            return empty;
        }
    }

    // Extract the first complete JSON object from the content, stripping any
    // markdown fences or surrounding text the model may have added.
    private static string ExtractJson(string content)
    {
        var start = content.IndexOf('{');
        var end   = content.LastIndexOf('}');
        return (start >= 0 && end > start)
            ? content[start..(end + 1)]
            : content;
    }

    // ── Private deserialization types ─────────────────────────────────────────

    private sealed record AiParsedParams(
        [property: JsonPropertyName("suburb")]       string?  Suburb,
        [property: JsonPropertyName("state")]        string?  State,
        [property: JsonPropertyName("propertyType")] string?  PropertyType,
        [property: JsonPropertyName("minPrice")]     decimal? MinPrice,
        [property: JsonPropertyName("maxPrice")]     decimal? MaxPrice,
        [property: JsonPropertyName("minBedrooms")]  int?     MinBedrooms,
        [property: JsonPropertyName("maxBedrooms")]  int?     MaxBedrooms);

    private sealed record OpenRouterResponse(
        [property: JsonPropertyName("choices")] IReadOnlyList<Choice>? Choices);

    private sealed record Choice(
        [property: JsonPropertyName("message")] MessageContent? Message);

    private sealed record MessageContent(
        [property: JsonPropertyName("content")] string? Content);
}
