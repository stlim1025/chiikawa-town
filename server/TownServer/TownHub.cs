using System.Text.Json;
using Microsoft.AspNetCore.SignalR;

namespace TownServer;

/// <summary>
/// 같이 놀기 허브(/town). 서버는 같은 방 사람들에게 받은 것을 나눠 주기만 한다(게임 진행은 각자 기기에 있다).
/// 클라이언트 → 서버: Join · Move · Say · Emote · Leave.
/// 서버 → 클라이언트: playerJoined · playerMoved · playerSaid · playerEmote · playerLeft.
/// </summary>
public sealed class TownHub(RoomRegistry rooms, TownOptions options, ILogger<TownHub> log) : Hub
{
    private const int MaxName = 8, MaxLook = 2048, MaxWord = 16, MaxSay = 30;

    /// <summary>
    /// 방에 들어간다(이미 다른 방에 있으면 먼저 나온다). 먼저 와 있던 사람들의 모습을 돌려준다.
    /// </summary>
    public async Task<JoinResult> Join(string room, JoinInfo info)
    {
        var code = RoomRegistry.NormalizeRoom(room);
        if (code is null) return new(false, "room", null, []);
        if (info.Look.ValueKind != JsonValueKind.Object || info.Look.GetRawText().Length > MaxLook) return new(false, "look", null, []);
        await LeaveCurrent();

        var name = Clip(info.Name, MaxName) ?? "손님";
        var move = new MoveInfo(Finite(info.X), Finite(info.Z), Finite(info.Yaw), "idle", "village");
        var me = new Player(Context.ConnectionId, code, name, info.Look.Clone(), move);
        if (!rooms.TryJoin(me, options.MaxPlayers, out var others)) return new(false, "full", null, []);

        await Groups.AddToGroupAsync(Context.ConnectionId, code);
        await Clients.OthersInGroup(code).SendAsync("playerJoined", me.Snapshot());
        log.LogInformation("{Name} joined room {Room} ({Count} players)", name, code, others.Count + 1);
        return new(true, null, me.Id, others);
    }

    /// <summary>
    /// 내 위치 · 방향 · 몸짓을 같은 방 사람들에게 보낸다(너무 자주 오면 버린다).
    /// </summary>
    public async Task Move(MoveInfo move)
    {
        var me = rooms.Get(Context.ConnectionId);
        if (me is null) return;
        if (!me.TakeMove(Environment.TickCount64, options.MovesPerSecond, options.MoveBurst)) return;
        me.Move = new MoveInfo(Finite(move.X), Finite(move.Z), Finite(move.Yaw), Clip(move.Anim, MaxWord) ?? "idle", Clip(move.Area, MaxWord) ?? "village");
        await Clients.OthersInGroup(me.Room).SendAsync("playerMoved", me.Id, me.Move);
    }

    /// <summary>
    /// 짧은 말 한마디(정해진 말)를 같은 방 사람들에게 보낸다.
    /// </summary>
    public async Task Say(string text)
    {
        var me = rooms.Get(Context.ConnectionId);
        var line = Clip(text, MaxSay);
        if (me is null || line is null) return;
        await Clients.OthersInGroup(me.Room).SendAsync("playerSaid", me.Id, line);
    }

    /// <summary>
    /// 이모트(몸짓 이름)를 같은 방 사람들에게 보낸다.
    /// </summary>
    public async Task Emote(string emote)
    {
        var me = rooms.Get(Context.ConnectionId);
        var name = Clip(emote, MaxWord);
        if (me is null || name is null) return;
        await Clients.OthersInGroup(me.Room).SendAsync("playerEmote", me.Id, name);
    }

    /// <summary>방에서 나온다.</summary>
    public Task Leave() => LeaveCurrent();

    /// <summary>연결이 끊기면 방에서 뺀다.</summary>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await LeaveCurrent();
        await base.OnDisconnectedAsync(exception);
    }

    private async Task LeaveCurrent()
    {
        var me = rooms.Leave(Context.ConnectionId);
        if (me is null) return;
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, me.Room);
        await Clients.Group(me.Room).SendAsync("playerLeft", me.Id);
        log.LogInformation("{Name} left room {Room}", me.Name, me.Room);
    }

    /// <summary>앞뒤 공백을 빼고 max 자까지 자른다. 비면 null.</summary>
    private static string? Clip(string? text, int max)
    {
        var t = (text ?? "").Trim();
        return t.Length == 0 ? null : t.Length > max ? t[..max] : t;
    }

    /// <summary>NaN · 무한대를 0 으로.</summary>
    private static float Finite(float v) => float.IsFinite(v) ? v : 0;
}
