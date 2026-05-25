using MediatR;
using Microsoft.Extensions.Logging;
using PropIntelligence.Application.DTOs;
using PropIntelligence.Application.Interfaces;
using PropIntelligence.Domain.Entities;
using PropIntelligence.Domain.Enums;

namespace PropIntelligence.Application.Commands.Auth;

// ── Register ──────────────────────────────────────────────────────────────────

public record RegisterUserCommand(
    string Email,
    string Password,
    string FirstName,
    string LastName) : IRequest<AuthResultDto>;

public class RegisterUserCommandHandler : IRequestHandler<RegisterUserCommand, AuthResultDto>
{
    private readonly IUserRepository  _users;
    private readonly IPasswordService _passwords;
    private readonly ITokenService    _tokens;
    private readonly IUnitOfWork      _uow;
    private readonly ILogger<RegisterUserCommandHandler> _logger;

    public RegisterUserCommandHandler(
        IUserRepository users,
        IPasswordService passwords,
        ITokenService tokens,
        IUnitOfWork uow,
        ILogger<RegisterUserCommandHandler> logger)
    {
        _users     = users;
        _passwords = passwords;
        _tokens    = tokens;
        _uow       = uow;
        _logger    = logger;
    }

    public async Task<AuthResultDto> Handle(RegisterUserCommand request, CancellationToken ct)
    {
        var existing = await _users.GetByEmailAsync(request.Email, ct);
        if (existing is not null)
            throw new InvalidOperationException($"Email '{request.Email}' is already registered.");

        var hash = _passwords.Hash(request.Password);
        var user = User.Create(request.Email, hash, request.FirstName, request.LastName, UserRole.Consumer);

        await _users.AddAsync(user, ct);
        await _uow.SaveChangesAsync(ct);

        _logger.LogInformation("New user registered: {Email}", user.Email);
        return BuildResult(user);
    }

    private AuthResultDto BuildResult(User user) => new(
        _tokens.GenerateToken(user),
        _tokens.TokenExpiresAt(),
        user.Email,
        user.FullName,
        user.Role.ToString());
}

// ── Login ─────────────────────────────────────────────────────────────────────

public record LoginCommand(string Email, string Password) : IRequest<AuthResultDto>;

public class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResultDto>
{
    private readonly IUserRepository  _users;
    private readonly IPasswordService _passwords;
    private readonly ITokenService    _tokens;
    private readonly IUnitOfWork      _uow;

    public LoginCommandHandler(
        IUserRepository users,
        IPasswordService passwords,
        ITokenService tokens,
        IUnitOfWork uow)
    {
        _users     = users;
        _passwords = passwords;
        _tokens    = tokens;
        _uow       = uow;
    }

    public async Task<AuthResultDto> Handle(LoginCommand request, CancellationToken ct)
    {
        var user = await _users.GetByEmailAsync(request.Email, ct);

        // Uniform error message — don't reveal whether email exists
        const string invalidMsg = "Invalid email or password.";
        if (user is null || !user.IsActive) throw new UnauthorizedAccessException(invalidMsg);
        if (!_passwords.Verify(request.Password, user.PasswordHash)) throw new UnauthorizedAccessException(invalidMsg);

        user.RecordLogin();
        await _uow.SaveChangesAsync(ct);

        return new AuthResultDto(
            _tokens.GenerateToken(user),
            _tokens.TokenExpiresAt(),
            user.Email,
            user.FullName,
            user.Role.ToString());
    }
}
