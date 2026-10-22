using Microsoft.AspNetCore.Components;
using Microsoft.JSInterop;

namespace Chartwave.Client.Interop
{
    /// <summary>
    /// C# side of donut-chart.ts: attaches the chart to a canvas, redraws it and exports it as an image.
    /// </summary>
    internal sealed class DonutChartInterop : IAsyncDisposable
    {
        // Output of Interop/donut-chart.ts. The wwwroot of the .Client project is served from the site root.
        private const string ModulePath = "./js/donut-chart.js";

        private readonly IJSRuntime jsRuntime;
        private IJSObjectReference? module;
        private IJSObjectReference? chart;

        public DonutChartInterop(IJSRuntime jsRuntime)
        {
            this.jsRuntime = jsRuntime;
        }

        public async Task AttachAsync(ElementReference canvas, ElementReference tooltip)
        {
            module = await jsRuntime.InvokeAsync<IJSObjectReference>("import", ModulePath);
            chart = await module.InvokeAsync<IJSObjectReference>("createDonutChart", canvas, tooltip);
        }

        public async Task RenderAsync(DonutChartOptions options)
        {
            if (chart is not null)
            {
                await chart.InvokeVoidAsync("render", options);
            }
        }

        /// <summary>Downloads the chart at 4x resolution. Format: "png" or "jpg".</summary>
        public async Task ExportAsync(string format)
        {
            if (chart is not null)
            {
                await chart.InvokeVoidAsync("exportImage", format);
            }
        }

        public async ValueTask DisposeAsync()
        {
            if (chart is not null)
            {
                await chart.InvokeVoidAsync("dispose");
                await chart.DisposeAsync();
            }

            if (module is not null)
            {
                await module.DisposeAsync();
            }
        }
    }
}
