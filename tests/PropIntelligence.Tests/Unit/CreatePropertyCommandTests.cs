using Microsoft.Extensions.Logging.Abstractions;
using PropIntelligence.Application.Commands.Properties;
using PropIntelligence.Application.Interfaces;
using PropIntelligence.Domain.Entities;
using PropIntelligence.Domain.Enums;

namespace PropIntelligence.Tests.Unit;

public class CreatePropertyCommandTests
{
    private readonly Mock<IPropertyRepository> _propertyRepo = new();
    private readonly Mock<IUnitOfWork> _uow = new();
    private readonly CreatePropertyCommandHandler _handler;

    public CreatePropertyCommandTests()
    {
        _handler = new CreatePropertyCommandHandler(
            _propertyRepo.Object,
            _uow.Object,
            NullLogger<CreatePropertyCommandHandler>.Instance);
    }

    private static CreatePropertyCommand ValidCommand() => new(
        UnitNumber:   "",
        StreetNumber: "42",
        StreetName:   "Crown",
        StreetType:   "Street",
        Suburb:       "Surry Hills",
        State:        AustralianState.NSW,
        Postcode:     "2010",
        Latitude:     -33.8872,
        Longitude:    151.2109,
        PropertyType: PropertyType.House,
        Bedrooms:     3,
        Bathrooms:    2,
        CarSpaces:    1,
        LandAreaSqm:  250m,
        FloorAreaSqm: 180m,
        LotNumber:    null,
        PlanNumber:   null);

    [Fact]
    public async Task Handle_ValidCommand_ReturnsPropertyDetailDto()
    {
        _propertyRepo
            .Setup(r => r.AddAsync(It.IsAny<Property>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _uow.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        var result = await _handler.Handle(ValidCommand(), CancellationToken.None);

        result.Should().NotBeNull();
        result.Suburb.Should().Be("Surry Hills");
        result.State.Should().Be("NSW");
        result.PropertyType.Should().Be("House");
        result.Bedrooms.Should().Be(3);
    }

    [Fact]
    public async Task Handle_ValidCommand_PersistsToRepository()
    {
        _propertyRepo
            .Setup(r => r.AddAsync(It.IsAny<Property>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _uow.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        await _handler.Handle(ValidCommand(), CancellationToken.None);

        _propertyRepo.Verify(
            r => r.AddAsync(It.IsAny<Property>(), It.IsAny<CancellationToken>()),
            Times.Once);
        _uow.Verify(u => u.SaveChangesAsync(It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task Handle_ValidCommand_FullAddressContainsSuburbAndState()
    {
        _propertyRepo
            .Setup(r => r.AddAsync(It.IsAny<Property>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _uow.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        var result = await _handler.Handle(ValidCommand(), CancellationToken.None);

        result.FullAddress.Should().Contain("Surry Hills");
        result.FullAddress.Should().Contain("NSW");
    }

    [Fact]
    public async Task Handle_ValidCommand_GeoJsonLocationIsCorrect()
    {
        _propertyRepo
            .Setup(r => r.AddAsync(It.IsAny<Property>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _uow.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        var result = await _handler.Handle(ValidCommand(), CancellationToken.None);

        // GeoJSON uses [longitude, latitude] ordering per RFC 7946
        result.Location.Type.Should().Be("Point");
        result.Location.Coordinates[0].Should().BeApproximately(151.2109, 0.0001); // lon
        result.Location.Coordinates[1].Should().BeApproximately(-33.8872, 0.0001); // lat
    }

    [Fact]
    public async Task Handle_UnitProperty_FullAddressIncludesUnitPrefix()
    {
        _propertyRepo
            .Setup(r => r.AddAsync(It.IsAny<Property>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);
        _uow.Setup(u => u.SaveChangesAsync(It.IsAny<CancellationToken>())).ReturnsAsync(1);

        var cmd = ValidCommand() with { UnitNumber = "5", PropertyType = PropertyType.Apartment };
        var result = await _handler.Handle(cmd, CancellationToken.None);

        result.FullAddress.Should().StartWith("5/");
        result.PropertyType.Should().Be("Apartment");
    }

    [Fact]
    public async Task Handle_RepositoryThrows_PropagatesException()
    {
        _propertyRepo
            .Setup(r => r.AddAsync(It.IsAny<Property>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new InvalidOperationException("DB error"));

        var act = () => _handler.Handle(ValidCommand(), CancellationToken.None);
        await act.Should().ThrowAsync<InvalidOperationException>();
    }
}
