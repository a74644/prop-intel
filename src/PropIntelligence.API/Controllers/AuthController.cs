using MediatR;
using Microsoft.AspNetCore.Mvc;
using PropIntelligence.Application.Commands.Auth;
using PropIntelligence.Application.DTOs;

namespace PropIntelligence.API.Controllers;

/// <summary>Authentication — register and log in to obtain a JWT.</summary>
[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;
    public AuthController(IMediator mediator) => _mediator = mediator;

    /// <summary>Register a new consumer account.</summary>
    [HttpPost("register")]
    [ProducesResponseType(typeof(AuthResultDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Register([FromBody] RegisterRequest body, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(body.Email))    return BadRequest(new { error = "Email is required." });
        if (string.IsNullOrWhiteSpace(body.Password)) return BadRequest(new { error = "Password is required." });
        if (body.Password.Length < 8)                 return BadRequest(new { error = "Password must be at least 8 characters." });

        var result = await _mediator.Send(
            new RegisterUserCommand(body.Email, body.Password, body.FirstName, body.LastName), ct);
        return StatusCode(StatusCodes.Status201Created, result);
    }

    /// <summary>Log in and receive a JWT bearer token.</summary>
    [HttpPost("login")]
    [ProducesResponseType(typeof(AuthResultDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Login([FromBody] LoginRequest body, CancellationToken ct)
    {
        var result = await _mediator.Send(new LoginCommand(body.Email, body.Password), ct);
        return Ok(result);
    }
}
