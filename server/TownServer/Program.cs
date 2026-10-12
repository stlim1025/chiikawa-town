using TownServer;

// 치이카와 마을 같이 놀기 서버: 콘솔에서 ASP.NET Core 로 SignalR 허브(/town)를 띄운다.
// 게임 진행은 각자 기기에 있고, 서버는 같은 방 사람들의 위치 · 몸짓 · 말을 나눠 주기만 한다(저장 없음).
var builder = WebApplication.CreateBuilder(args);

var town = builder.Configuration.GetSection("Town").Get<TownOptions>() ?? new TownOptions();
builder.Services.AddSingleton(town);
builder.Services.AddSingleton<RoomRegistry>();
builder.Services.AddSignalR(o =>
{
    o.MaximumReceiveMessageSize = 8 * 1024; // 모습(look) 한 벌이 넉넉히 들어가는 크기
    o.EnableDetailedErrors = builder.Environment.IsDevelopment();
});
builder.Services.AddCors(o => o.AddDefaultPolicy(p =>
{
    if (town.AllowedOrigins.Contains("*")) p.SetIsOriginAllowed(_ => true);
    else p.WithOrigins(town.AllowedOrigins);
    p.AllowAnyHeader().AllowAnyMethod().AllowCredentials();
}));

var app = builder.Build();
app.UseCors();
app.MapGet("/", (RoomRegistry rooms) => Results.Text($"chiikawa-town server: {rooms.PlayerCount} players online"));
app.MapHub<TownHub>("/town");
app.Run();
