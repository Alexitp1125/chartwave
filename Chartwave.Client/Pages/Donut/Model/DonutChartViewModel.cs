using System.Globalization;
using Chartwave.Client.Interop;

namespace Chartwave.Client.Pages.Donut.Model
{
    /// <summary>
    /// State of the donut generator: chart settings and slices.
    /// </summary>
    internal sealed class DonutChartViewModel
    {
        public const int TitleMaxLength = 80;
        public const int SuffixMaxLength = 12;
        public const int MinDepth = 8;
        public const int MaxDepth = 70;
        public const int MinTilt = 25;
        public const int MaxTilt = 70;
        public const int MaxRotation = 360;

        private const double PercentageTarget = 100;

        // The total bar is full at 150, so going over 100 is still visible.
        private const double TotalBarLimit = 150;

        public string Title { get; set; } = string.Empty;

        public string Suffix { get; set; } = "%";

        public ValueMode Mode { get; set; } = ValueMode.Percentage;

        /// <summary>Height of the 3D walls, in pixels of the 800 x 540 chart.</summary>
        public int Depth { get; set; } = 36;

        /// <summary>Vertical squash of the donut: 25 is almost flat, 70 is almost seen from above.</summary>
        public int Tilt { get; set; } = 50;

        /// <summary>Rotation in degrees.</summary>
        public int Rotation { get; set; }

        public List<DonutSliceViewModel> Slices { get; } = [];

        /// <summary>Slices with a name; only these are drawn.</summary>
        public IEnumerable<DonutSliceViewModel> VisibleSlices => Slices.Where(x => x.IsValid);

        public bool HasData => VisibleSlices.Any(x => x.Value > 0);

        /// <summary>Sum of all values, for the total bar of the percentage mode.</summary>
        public double Total => Slices.Sum(x => x.Value);

        public bool IsOverTarget => Total > PercentageTarget;

        public bool IsOnTarget => Math.Abs(Total - PercentageTarget) < 0.001;

        public string TotalText => Total.ToString("0.#", CultureInfo.CurrentCulture) + "%";

        /// <summary>CSS width of the total bar. Always with a dot: "66,7%" is not valid CSS.</summary>
        public string TotalBarWidth =>
            (Math.Min(Total, TotalBarLimit) / TotalBarLimit * 100).ToString("0.##", CultureInfo.InvariantCulture) + "%";

        public void AddSlice(string name, double value = 0)
        {
            Slices.Add(new DonutSliceViewModel
            {
                Name = name,
                Value = value,
                Color = SlicePalette.GetColor(Slices.Count),
            });
        }

        public void RemoveSlice(DonutSliceViewModel slice) => Slices.Remove(slice);

        public void Clear() => Slices.Clear();

        public void LoadExample(string title)
        {
            Title = title;
            Suffix = "%";
            Mode = ValueMode.Percentage;
            Slices.Clear();
            AddSlice("City pop", 45);
            AddSlice("Vaporwave", 25);
            AddSlice("Synthwave", 20);
            AddSlice("Lo-fi", 10);
        }

        /// <summary>
        /// What the canvas draws: visible slices, with their texts already formatted in the current language.
        /// </summary>
        public static implicit operator DonutChartOptions(DonutChartViewModel model)
        {
            List<DonutSliceViewModel> slices = model.VisibleSlices.ToList();
            double total = slices.Sum(x => x.Value);
            string suffix = model.Suffix.Trim();

            return new DonutChartOptions(
                model.Title.Trim(),
                model.Depth,
                model.Tilt,
                model.Rotation,
                slices
                    .Select(x => new DonutSliceOptions(
                        x.Name.Trim(),
                        x.Color,
                        x.Value,
                        x.Value.ToString("0.##", CultureInfo.CurrentCulture) + suffix,
                        (total > 0 ? x.Value / total * 100 : 0).ToString("0.0", CultureInfo.CurrentCulture) + "%"))
                    .ToList());
        }
    }
}
