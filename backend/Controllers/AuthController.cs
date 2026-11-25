using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using backend.Data;
using backend.DTOs.Auth;
using backend.Models;
using backend.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using Google.Apis.Auth;

namespace backend.Controllers;
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly AppDBContext _context;
    private readonly IConfiguration _configuration;
    private readonly IWebHostEnvironment _environment;
    public AuthController(AppDBContext context, IConfiguration configuration, IWebHostEnvironment environment)
    {
        _context = context;
        _configuration = configuration;
        _environment = environment;
    }

    #region Methods

    private string GenerateJwtToken(User user)
    {
        var jwtSettings = _configuration.GetSection("Jwt");
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings["Key"]!));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var expiresAt = DateTime.UtcNow.AddHours(double.Parse(jwtSettings["ExpirationHours"]!));

        var claims = new[]
        {
                new Claim(ClaimTypes.NameIdentifier, user.Id.ToString()),
                new Claim(ClaimTypes.Name, user.Username),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role)
            };

        var token = new JwtSecurityToken(
            issuer: jwtSettings["Issuer"],
            audience: jwtSettings["Audience"],
            claims: claims,
            expires: expiresAt,
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private static UserProfileDto MapUserToDto(User user, UserProfile? profile)
    {
        return new UserProfileDto
        {
            Id = user.Id,
            Username = user.Username,
            Email = user.Email,
            Role = user.Role,

            FirstName = profile?.FirstName,
            LastName = profile?.LastName,
            AvatarUrl = profile?.AvatarUrl,
            Bio = profile?.Bio,
            BirthDate = profile?.BirthDate,

            TotalXp = profile?.TotalXp ?? 0,
            CurrentStreak = GamificationService.GetActualStreak(
                profile?.CurrentStreak ?? 0,
                profile?.LastActivityDate
            ),
            LongestStreak = profile?.LongestStreak ?? 0,

            CreatedAt = user.CreatedAt
        };
    }

    #endregion

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        var username = dto.Username.Trim();
        var email = dto.Email.Trim();

        var usernameExists = await _context.Users.AnyAsync(u => u.Username.ToLower() == username.ToLower());
        if (usernameExists)
            return BadRequest(new { message = "Username already exists" });

        var emailExists = await _context.Users.AnyAsync(u => u.Email.ToLower() == email.ToLower());
        if (emailExists)
            return BadRequest(new { message = "Email already exists" });

        var user = new User
        {
            Username = username,
            Email = email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role = "user",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var profile = new UserProfile
        {
            User = user,
            TotalXp = 0,
            CurrentStreak = 0,
            LongestStreak = 0
        };

        _context.Users.Add(user);
        _context.UserProfiles.Add(profile);

        await _context.SaveChangesAsync();

        var token = GenerateJwtToken(user);

        var response = new AuthResponseDto
        {
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddHours(double.Parse(_configuration["Jwt:ExpirationHours"]!)),
            User = MapUserToDto(user, profile)
        };

        return Ok(response);
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(LoginDto dto)
    {
        var email = dto.Email.Trim().ToLowerInvariant();
        var user = await _context.Users.Include(u => u.Profile).FirstOrDefaultAsync(u => u.Email.ToLower() == email);
        if (user == null || user.PasswordHash == null)
            return Unauthorized(new { message = "Invalid username or password" });

        bool passwordValid = BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash);
        if (!passwordValid)
            return Unauthorized(new { message = "Invalid username or password" });

        var token = GenerateJwtToken(user);
        var response = new AuthResponseDto
        {
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddHours(double.Parse(_configuration["Jwt:ExpirationHours"]!)),
            User = MapUserToDto(user, user.Profile)
        };
        return Ok(response);
    }

    [HttpPost("google")]
    public async Task<IActionResult> GoogleLogin(
        [FromBody] GoogleLoginDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.Credential))
        {
            return BadRequest(new { message = "Google credential обов'язковий." });
        }

        var clientId = _configuration["GoogleAuth:ClientId"];

        if (string.IsNullOrWhiteSpace(clientId))
        {
            return StatusCode(500, new { message = "Google авторизацію не налаштовано." });
        }

        GoogleJsonWebSignature.Payload payload;

        try
        {
            payload = await GoogleJsonWebSignature.ValidateAsync(
                dto.Credential,
                new GoogleJsonWebSignature.ValidationSettings { Audience = new[] { clientId } }
            );
        }
        catch (InvalidJwtException)
        {
            return Unauthorized(new { message = "Недійсний або прострочений Google токен." });
        }

        if (string.IsNullOrWhiteSpace(payload.Subject) || string.IsNullOrWhiteSpace(payload.Email) || !payload.EmailVerified)
        {
            return Unauthorized(new { message = "Google не підтвердив електронну адресу." });
        }

        var googleId = payload.Subject;
        var email = payload.Email.Trim().ToLowerInvariant();

        var isNewUser = false;

        var user = await _context.Users.Include(u => u.Profile).FirstOrDefaultAsync(u => u.GoogleId == googleId);

        if (user == null)
        {
            var emailExists = await _context.Users.AnyAsync(u => u.Email.ToLower() == email);

            if (emailExists)
            {
                return Conflict(new { message = "Акаунт із цією електронною адресою вже існує. Увійди за допомогою пароля." });
            }

            var emailPrefix = email.Split('@')[0];

            var baseUsername = new string( emailPrefix.Where(c => char.IsAsciiLetterOrDigit(c) || c == '_' || c == '.').Take(35).ToArray());

            if (string.IsNullOrWhiteSpace(baseUsername))
                baseUsername = "user";

            var username = baseUsername;

            while (await _context.Users.AnyAsync(u => u.Username.ToLower() == username.ToLower()))
            {
                var suffix = Guid.NewGuid().ToString("N")[..8];
                username = $"{baseUsername}_{suffix}";
            }

            user = new User
            {
                Username = username,
                Email = email,
                GoogleId = googleId,
                PasswordHash = null,
                Role = "user",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var profile = new UserProfile
            {
                User = user,
                FirstName = payload.GivenName,
                LastName = payload.FamilyName,
                AvatarUrl = payload.Picture,
                TotalXp = 0,
                CurrentStreak = 0,
                LongestStreak = 0
            };

            _context.Users.Add(user);
            _context.UserProfiles.Add(profile);

            try
            {
                await _context.SaveChangesAsync();
            }
            catch (DbUpdateException)
            {
                return Conflict(new { message = "Не вдалося створити акаунт. Можливо, користувач уже зареєстрований. Спробуй ще раз." });
            }

            user.Profile = profile;
            isNewUser = true;
        }

        var token = GenerateJwtToken(user);

        var response = new AuthResponseDto
        {
            Token = token,
            ExpiresAt = DateTime.UtcNow.AddHours(double.Parse( _configuration["Jwt:ExpirationHours"] ?? "24")),
            User = MapUserToDto(user, user.Profile)
        };

        return Ok(new
        {
            response.Token,
            response.ExpiresAt,
            response.User,
            IsNewUser = isNewUser
        });
    }

    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetMe()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (!long.TryParse(userIdClaim?.Value, out var userId))
            return Unauthorized(new { message = "Invalid token" });

        var user = await _context.Users.Include(u => u.Profile).FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null)
            return NotFound(new { message = "User not found" });

        return Ok(MapUserToDto(user, user.Profile));
    }

    [Authorize]
    [HttpPut("me")]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();

        var userId = long.Parse(userIdClaim.Value);
        var user = await _context.Users.Include(u => u.Profile).FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return NotFound(new { message = "Користувача не знайдено." });

        if (string.IsNullOrWhiteSpace(dto.Username))
            return BadRequest(new { message = "Ім'я користувача не може бути порожнім." });

        var username = dto.Username.Trim();

        var userNameExists = await _context.Users.AnyAsync(u => u.Username.ToLower() == username.ToLower() && u.Id != userId);
        if (userNameExists)
            return BadRequest(new { message = "Це ім'я користувача вже зайняте." });

        user.Username = username;

        if (user.Profile == null)
            return NotFound(new { message = "Профіль користувача не знайдено." });

        user.Profile.FirstName = dto.FirstName?.Trim();
        user.Profile.LastName = dto.LastName?.Trim();
        user.Profile.AvatarUrl = dto.AvatarUrl?.Trim();
        user.Profile.Bio = dto.Bio?.Trim();
        user.Profile.BirthDate = dto.BirthDate;

        await _context.SaveChangesAsync();

        return Ok(new
        {
            message = "Профіль успішно оновлено.",
            user = MapUserToDto(user, user.Profile)
        });
    }

    [Authorize]
    [HttpDelete("me")]
    public async Task<IActionResult> DeleteAccount()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
        if (userIdClaim == null) return Unauthorized();

        var userId = long.Parse(userIdClaim.Value);
        var user = await _context.Users.Include(u => u.Profile).FirstOrDefaultAsync(u => u.Id == userId);
        if (user == null) return NotFound(new { message = "Користувача не знайдено." });

        if (user == null)
            return NotFound(new { message = "Користувача не знайдено." });

        _context.Users.Remove(user);

        await _context.SaveChangesAsync();

        return Ok(new { message = "Акаунт успішно видалено." });
    }

    [Authorize]
    [HttpPut("me-with-avatar")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> UpdateMeWithAvatar(
        [FromForm] UpdateProfileWithAvatarDto dto)
    {
        var userIdValue = User.FindFirstValue(
            ClaimTypes.NameIdentifier);

        if (!long.TryParse(userIdValue, out var userId))
            return Unauthorized();

        var user = await _context.Users.Include(u => u.Profile).FirstOrDefaultAsync(u => u.Id == userId);

        if (user == null || user.Profile == null)
            return NotFound(new { message = "Користувача не знайдено." });

        var username = dto.Username?.Trim();

        if (string.IsNullOrWhiteSpace(username))
            return BadRequest(new { message = "Username не може бути порожнім." });

        if (username.Length > 100)
            return BadRequest(new { message = "Username занадто довгий." });

        var usernameExists = await _context.Users.AnyAsync(u => u.Username == username && u.Id != userId);

        if (usernameExists)
            return Conflict(new { message = "Цей username вже зайнятий." });

        if (dto.Avatar != null && dto.Avatar.Length > 5 * 1024 * 1024)
        {
            return BadRequest(new { message = "Максимальний розмір фото — 5 МБ." });
        }

        string? newFilePath = null;
        string? newAvatarUrl = null;

        if (dto.Avatar != null)
        {
            if (dto.Avatar.Length == 0)
                return BadRequest(new { message = "Файл фотографії порожній." });

            var extension = Path.GetExtension(dto.Avatar.FileName).ToLowerInvariant();

            var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };

            if (!allowedExtensions.Contains(extension))
                return BadRequest(new { message = "Дозволені формати: JPG, PNG, WEBP." });

            var signature = new byte[12];

            await using (var input = dto.Avatar.OpenReadStream())
            {
                var totalRead = 0;

                while (totalRead < signature.Length)
                {
                    var read = await input.ReadAsync(signature.AsMemory(totalRead));

                    if (read == 0)
                        break;

                    totalRead += read;
                }

                if (totalRead < signature.Length)
                    return BadRequest(new { message = "Некоректний файл фотографії." });
            }

            var jpeg =
                signature[0] == 0xFF &&
                signature[1] == 0xD8 &&
                signature[2] == 0xFF;

            var png =
                signature[0] == 0x89 &&
                signature[1] == 0x50 &&
                signature[2] == 0x4E &&
                signature[3] == 0x47;

            var webp = System.Text.Encoding.ASCII.GetString(signature, 0, 4) == "RIFF" 
                && System.Text.Encoding.ASCII.GetString(signature, 8, 4) == "WEBP";

            var validImage = extension switch
            {
                ".jpg" or ".jpeg" => jpeg,
                ".png" => png,
                ".webp" => webp,
                _ => false
            };

            if (!validImage)
                return BadRequest(new { message = "Файл не відповідає формату зображення." });
        }

        var previousAvatarUrl = user.Profile.AvatarUrl;

        try
        {
            if (dto.Avatar != null)
            {
                var root = _environment.WebRootPath ?? Path.Combine( _environment.ContentRootPath, "wwwroot");

                var folder = Path.Combine(root, "uploads", "avatars");

                Directory.CreateDirectory(folder);

                var extension = Path.GetExtension(dto.Avatar.FileName).ToLowerInvariant();

                var fileName = $"{Guid.NewGuid():N}{extension}";

                newFilePath = Path.Combine(folder, fileName);

                await using (var stream = System.IO.File.Create(newFilePath))
                {
                    await dto.Avatar.CopyToAsync(stream);
                }

                newAvatarUrl = $"https://{Request.Host}" 
                    + $"/uploads/avatars/{fileName}";
            }

            user.Username = username;
            user.Profile.FirstName = string.IsNullOrWhiteSpace(dto.FirstName) ? null : dto.FirstName.Trim();
            user.Profile.LastName = string.IsNullOrWhiteSpace(dto.LastName) ? null : dto.LastName.Trim();
            user.Profile.Bio = string.IsNullOrWhiteSpace(dto.Bio) ? null : dto.Bio.Trim();
            user.Profile.BirthDate = dto.BirthDate;

            if (newAvatarUrl != null)
                user.Profile.AvatarUrl = newAvatarUrl;

            await _context.SaveChangesAsync();
        }
        catch
        {
            if (newFilePath != null && System.IO.File.Exists(newFilePath))
            {
                try
                {
                    System.IO.File.Delete(newFilePath);
                }
                catch (IOException)
                {
                }
            }

            return StatusCode(500, new { message = "Не вдалося зберегти профіль." });
        }

        if (newFilePath != null && !string.IsNullOrWhiteSpace(previousAvatarUrl))
        {
            var previousPath = new Uri(previousAvatarUrl, UriKind.RelativeOrAbsolute);

            var relativePath = previousPath.IsAbsoluteUri ? previousPath.AbsolutePath : previousAvatarUrl;

            const string prefix = "/uploads/avatars/";

            if (relativePath.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            {
                var oldFileName = Path.GetFileName(relativePath);

                var oldPath = Path.Combine( _environment.WebRootPath ?? Path.Combine(_environment.ContentRootPath, "wwwroot"),
                    "uploads",
                    "avatars",
                    oldFileName);

                try
                {
                    if (System.IO.File.Exists(oldPath))
                        System.IO.File.Delete(oldPath);
                }
                catch (IOException)
                {
                }
            }
        }

        return Ok(new
        {
            message = "Профіль успішно оновлено.",
            avatarUrl = user.Profile.AvatarUrl
        });
    }

}
