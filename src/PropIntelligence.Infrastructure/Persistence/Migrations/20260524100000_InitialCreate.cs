using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace PropIntelligence.Infrastructure.Persistence.Migrations
{
    [Migration("20260524100000_InitialCreate")]
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Properties",
                columns: table => new
                {
                    Id           = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    UnitNumber   = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: ""),
                    StreetNumber = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    StreetName   = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    StreetType   = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    FullAddress  = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    Suburb       = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    State        = table.Column<int>(type: "int", nullable: false),
                    Postcode     = table.Column<string>(type: "nvarchar(4)", maxLength: 4, nullable: false),
                    Latitude     = table.Column<double>(type: "float", nullable: false),
                    Longitude    = table.Column<double>(type: "float", nullable: false),
                    PropertyType = table.Column<int>(type: "int", nullable: false),
                    Bedrooms     = table.Column<int>(type: "int", nullable: false),
                    Bathrooms    = table.Column<int>(type: "int", nullable: false),
                    CarSpaces    = table.Column<int>(type: "int", nullable: false),
                    LandAreaSqm  = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    FloorAreaSqm = table.Column<decimal>(type: "decimal(10,2)", nullable: true),
                    LotNumber    = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    PlanNumber   = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    CreatedAt    = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt    = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Properties", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Users",
                columns: table => new
                {
                    Id           = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Email        = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    PasswordHash = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: false),
                    FirstName    = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    LastName     = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Role         = table.Column<int>(type: "int", nullable: false),
                    IsActive     = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt    = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastLogin    = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "PropertyListings",
                columns: table => new
                {
                    Id              = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PropertyId      = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ListingType     = table.Column<int>(type: "int", nullable: false),
                    AdvertisedPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                    PriceText       = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    Status          = table.Column<int>(type: "int", nullable: false),
                    AgencyName      = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    AgentName       = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description     = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ListedAt        = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SoldAt          = table.Column<DateTime>(type: "datetime2", nullable: true),
                    DaysOnMarket    = table.Column<int>(type: "int", nullable: true),
                    CreatedAt       = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt       = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_PropertyListings", x => x.Id);
                    table.ForeignKey(
                        name: "FK_PropertyListings_Properties_PropertyId",
                        column: x => x.PropertyId,
                        principalTable: "Properties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "SalesHistory",
                columns: table => new
                {
                    Id           = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    PropertyId   = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Price        = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    SaleDate     = table.Column<DateTime>(type: "datetime2", nullable: false),
                    SaleMethod   = table.Column<int>(type: "int", nullable: false),
                    AgencyName   = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    AgentName    = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    DaysOnMarket = table.Column<int>(type: "int", nullable: true),
                    CreatedAt    = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_SalesHistory", x => x.Id);
                    table.ForeignKey(
                        name: "FK_SalesHistory_Properties_PropertyId",
                        column: x => x.PropertyId,
                        principalTable: "Properties",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            // ── Indexes ─────────────────────────────────────────────────────────

            migrationBuilder.CreateIndex("IX_Properties_Suburb",       "Properties", "Suburb");
            migrationBuilder.CreateIndex("IX_Properties_State",        "Properties", "State");
            migrationBuilder.CreateIndex("IX_Properties_Postcode",     "Properties", "Postcode");
            migrationBuilder.CreateIndex("IX_Properties_Suburb_State", "Properties", new[] { "Suburb", "State" });
            migrationBuilder.CreateIndex("IX_Properties_LatLon",       "Properties", new[] { "Latitude", "Longitude" });

            migrationBuilder.CreateIndex("IX_SalesHistory_PropertyId", "SalesHistory", "PropertyId");
            migrationBuilder.CreateIndex("IX_SalesHistory_SaleDate",   "SalesHistory", "SaleDate");

            migrationBuilder.CreateIndex("IX_PropertyListings_PropertyId", "PropertyListings", "PropertyId");
            migrationBuilder.CreateIndex("IX_PropertyListings_Status",     "PropertyListings", "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Users_Email",
                table: "Users",
                column: "Email",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(name: "PropertyListings");
            migrationBuilder.DropTable(name: "SalesHistory");
            migrationBuilder.DropTable(name: "Properties");
            migrationBuilder.DropTable(name: "Users");
        }
    }
}
