namespace Chartwave.Client.Interop
{
    /// <summary>
    /// Data sent to donut-chart.ts. Same shape as its DonutChartOptions interface (camelCase in JSON).
    /// </summary>
    internal sealed record DonutChartOptions(
        string Title,
        int Depth,
        int Tilt,
        int Rotation,
        IReadOnlyList<DonutSliceOptions> Slices);

    /// <summary>
    /// One slice for donut-chart.ts. ValueText and PercentText are drawn as they come.
    /// </summary>
    internal sealed record DonutSliceOptions(
        string Label,
        string Color,
        double Value,
        string ValueText,
        string PercentText);
}
