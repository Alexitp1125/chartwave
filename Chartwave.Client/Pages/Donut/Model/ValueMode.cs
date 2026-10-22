namespace Chartwave.Client.Pages.Donut.Model
{
    /// <summary>
    /// How the slice values are read.
    /// </summary>
    internal enum ValueMode
    {
        /// <summary>Percentages that should add up to 100.</summary>
        Percentage,

        /// <summary>Any amount; the chart shows each slice's share of the total.</summary>
        Absolute,
    }
}
