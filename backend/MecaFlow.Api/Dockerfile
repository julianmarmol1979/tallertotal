FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src
COPY backend/TallerTotal.Api/ .
RUN dotnet restore TallerTotal.Api.csproj
RUN dotnet publish TallerTotal.Api.csproj -c Release -o /app --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:9.0
WORKDIR /app
COPY --from=build /app .
ENTRYPOINT ["dotnet", "TallerTotal.Api.dll"]
