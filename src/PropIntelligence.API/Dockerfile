# ── Stage 1: Runtime base ────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 8080

# ── Stage 2: Build ────────────────────────────────────────────────────────────
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["src/PropIntelligence.API/PropIntelligence.API.csproj",             "src/PropIntelligence.API/"]
COPY ["src/PropIntelligence.Application/PropIntelligence.Application.csproj", "src/PropIntelligence.Application/"]
COPY ["src/PropIntelligence.Domain/PropIntelligence.Domain.csproj",        "src/PropIntelligence.Domain/"]
COPY ["src/PropIntelligence.Infrastructure/PropIntelligence.Infrastructure.csproj", "src/PropIntelligence.Infrastructure/"]
RUN dotnet restore "src/PropIntelligence.API/PropIntelligence.API.csproj"
COPY . .
RUN dotnet build "src/PropIntelligence.API/PropIntelligence.API.csproj" -c Release -o /app/build

# ── Stage 3: Publish ─────────────────────────────────────────────────────────
FROM build AS publish
RUN dotnet publish "src/PropIntelligence.API/PropIntelligence.API.csproj" -c Release -o /app/publish

# ── Stage 4: Final runtime image ─────────────────────────────────────────────
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "PropIntelligence.API.dll"]
