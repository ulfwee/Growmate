
FROM mcr.microsoft.comdotnetsdk9.0 AS build

WORKDIR src

COPY backend.csproj .
RUN dotnet restore backend.csproj

COPY . .
RUN dotnet publish backend.csproj -c Release -o apppublish --no-restore

FROM mcr.microsoft.comdotnetaspnet9.0

WORKDIR app

COPY --from=build apppublish .

ENV ASPNETCORE_URLS=http0.0.0.010000
ENV ASPNETCORE_ENVIRONMENT=Production

EXPOSE 10000

ENTRYPOINT [dotnet, backend.dll]