using Chartwave.Localization;
using Microsoft.AspNetCore.Localization;

namespace Chartwave.Api
{
    /// <summary>
    /// Changes the UI language: saves it in the culture cookie and goes back to the page.
    /// </summary>
    public static class CultureEndpoints
    {
        public static IEndpointRouteBuilder MapCultureEndpoints(this IEndpointRouteBuilder endpoints)
        {
            endpoints.MapGet("/api/culture/{culture}", SetCulture);
            return endpoints;
        }

        private static IResult SetCulture(string culture, string? redirectUri, HttpContext httpContext)
        {
            if (SupportedCultures.All.Contains(culture))
            {
                httpContext.Response.Cookies.Append(
                    CookieRequestCultureProvider.DefaultCookieName,
                    CookieRequestCultureProvider.MakeCookieValue(new RequestCulture(culture)),
                    new CookieOptions
                    {
                        MaxAge = TimeSpan.FromDays(365),
                        IsEssential = true,
                        SameSite = SameSiteMode.Lax,
                    });
            }

            return Results.LocalRedirect(IsLocalPath(redirectUri) ? redirectUri! : "/");
        }

        // A path of this app ("/donut"), not another site ("//evil.com", "https://...").
        private static bool IsLocalPath(string? url) =>
            !string.IsNullOrEmpty(url)
            && url[0] == '/'
            && (url.Length == 1 || (url[1] != '/' && url[1] != '\\'));
    }
}
