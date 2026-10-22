namespace Chartwave.Client.Pages.Donut.Model
{
    /// <summary>
    /// Default slice colors: the base palette of dev-conventions/brand/tokens.css, alternating aqua, lavender and pink.
    /// </summary>
    internal static class SlicePalette
    {
        private static readonly string[] colors =
        [
            "#3FB8CF", // --aqua-deep
            "#6E59C2", // --violet
            "#E77BC0", // --pink-strong
            "#7FDBEA", // --aqua
            "#C7A3F0", // --lavender
            "#F6A6D7", // --pink
            "#9EE7F2", // --aqua-light
            "#C9B8F5", // --lavender-light
            "#F4B9DF", // --pink-light
        ];

        public static string GetColor(int index) => colors[index % colors.Length];
    }
}
