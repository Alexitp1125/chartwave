namespace Chartwave.Client.Pages.Donut.Model
{
    /// <summary>
    /// One slice of the donut: name, value and color.
    /// </summary>
    internal sealed class DonutSliceViewModel
    {
        public const int NameMaxLength = 40;

        /// <summary>Identifies the row in the list (@key), so removing a slice doesn't mix up the inputs.</summary>
        public Guid Key { get; } = Guid.NewGuid();

        public string Name { get; set; } = string.Empty;

        /// <summary>Slice value; negative or invalid numbers become 0.</summary>
        public double Value
        {
            get;
            set => field = double.IsFinite(value) ? Math.Max(0, value) : 0;
        }

        /// <summary>Hex color, as the color input gives it (#rrggbb).</summary>
        public string Color { get; set; } = null!;

        /// <summary>A slice needs a name to be drawn.</summary>
        public bool IsValid => !string.IsNullOrWhiteSpace(Name);
    }
}
