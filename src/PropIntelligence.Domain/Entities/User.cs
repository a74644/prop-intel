using PropIntelligence.Domain.Enums;

namespace PropIntelligence.Domain.Entities;

/// <summary>
/// API user. BCrypt hash stored in Infrastructure — the domain only holds the string fields.
/// Role-based access: Consumer (read-only), Agent (create/update listings), Admin (full).
/// </summary>
public class User
{
    public Guid   Id           { get; private set; }
    public string Email        { get; private set; } = string.Empty;
    public string PasswordHash { get; private set; } = string.Empty;
    public string FirstName    { get; private set; } = string.Empty;
    public string LastName     { get; private set; } = string.Empty;
    public UserRole Role       { get; private set; }
    public bool   IsActive     { get; private set; }
    public DateTime CreatedAt  { get; private set; }
    public DateTime? LastLogin { get; private set; }

    public string FullName => $"{FirstName} {LastName}".Trim();

    private User() { }

    public static User Create(
        string email,
        string passwordHash,
        string firstName,
        string lastName,
        UserRole role = UserRole.Consumer)
    {
        if (string.IsNullOrWhiteSpace(email))     throw new ArgumentException("Email is required.", nameof(email));
        if (string.IsNullOrWhiteSpace(passwordHash)) throw new ArgumentException("Password hash is required.", nameof(passwordHash));

        return new User
        {
            Id           = Guid.NewGuid(),
            Email        = email.ToLowerInvariant().Trim(),
            PasswordHash = passwordHash,
            FirstName    = firstName.Trim(),
            LastName     = lastName.Trim(),
            Role         = role,
            IsActive     = true,
            CreatedAt    = DateTime.UtcNow
        };
    }

    public void RecordLogin() => LastLogin = DateTime.UtcNow;
    public void Deactivate()  => IsActive  = false;
}
