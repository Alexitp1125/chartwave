# Chartwave

A 3D chart generator, part of [alexitp1125.com](https://alexitp1125.com).

The first chart is an interactive **3D donut**: add options with a name, value and color, switch between
percentage and absolute values, adjust depth, tilt and rotation, hover the slices, and export the chart as a
high-resolution PNG or JPG. Light and dark themes, English and Spanish.

**Status:** v1 (3D donut). Site: [chartwave.alexitp1125.com](https://chartwave.alexitp1125.com).

## Stack

- Blazor Web App on .NET 10. The generator page runs on WebAssembly; the layout and error pages are server-rendered.
- The form and its state live in C# (a ViewModel). The canvas drawing and the image export are a TypeScript
  module called through JS interop.
- Bootstrap with per-component CSS isolation. Docker image listening on port 8080.

## Run locally

Requires the .NET 10 SDK.

```
dotnet run --project Chartwave
```

## License

Code: see the repository license. The Rako character and the other brand assets are original designs by
Alexi Torres, all rights reserved.
