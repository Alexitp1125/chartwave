# Build: .NET SDK. Microsoft.TypeScript.MSBuild 7 brings its own native TypeScript compiler (no Node.js).
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY . .
RUN dotnet restore Chartwave/Chartwave.csproj
RUN dotnet publish Chartwave/Chartwave.csproj -c Release -o /app/publish --no-restore

# Run: ASP.NET Core runtime only.
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
ENV ASPNETCORE_URLS=http://+:8080
EXPOSE 8080
ENTRYPOINT ["dotnet", "Chartwave.dll"]
