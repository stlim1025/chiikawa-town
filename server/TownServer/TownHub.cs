using System.Text.Json;
using Microsoft.AspNetCore.SignalR;

namespace TownServer;

/// <summary>
/// 같이 놀기 허브(/town): 동물의 숲처럼 주인이 마을 문을 열면(내 마을 코드) 친구가 그 코드로 놀러 온다.
/// 서버는 같은 마을 사람들에게 받은 것을 나눠 주기만 한다(게임 진행은 각자 기기에, 마을 상태는 주인이 보낸다).
/// 클라이언트 → 서버: OpenGate · Visit · Move · Look · Say · Emote · World(주인만) · Act(손님만) · Direct(한 사람에게) · Leave.
/// 서버 → 클라이언트: playerJoined · playerMoved · playerLook · playerSaid · playerEmote · playerLeft · world · guestAct(주인만) · direct · gateClosed.
/// </summary>
public sealed class TownHub(RoomRegistry rooms, TownOptions options, ILogger<TownHub> log) : Hub
{
    private const int MaxName = 8, MaxLook = 2048, MaxWord = 16, MaxHeld = 48, MaxSay = 30, MaxWorld = 48 * 1024, MaxAct = 512, MaxDirect = 8 * 1024;

    /// <summary>
    /// 내 마을 문을 연다(이 연결이 그 마을 코드의 주인이 된다). 그 코드로 이미 열려 있으면 'taken'.
    /// </summary>
    public async Task<JoinResult> OpenGate(string code, JoinInfo info)
    {
        var room = RoomRegistry.NormalizeRoom(code);
        if (room is null) return new(false, "room", null, null, []);
        if (!ValidLook(info.Look)) return new(false, "look", null, null, []);
        await LeaveCurrent();

        var me = NewPlayer(room, info, host: true);
        if (!rooms.TryOpen(me)) return new(false, "taken", null, null, []);
        await Groups.AddToGroupAsync(Context.ConnectionId, room);
        log.LogInformation("{Name} opened gate {Room}", me.Name, room);
        return new(true, null, me.Id, me.Id, []);
    }

    /// <summary>
    /// 친구 마을에 놀러 간다. 문이 닫혀 있으면 'closed', 꽉 찼으면 'full'. 먼저 와 있던 사람들(주인 포함)의 모습을 돌려준다.
    /// </summary>
    public async Task<JoinResult> Visit(string code, JoinInfo info)
    {
        var room = RoomRegistry.NormalizeRoom(code);
        if (room is null) return new(false, "room", null, null, []);
        if (!ValidLook(info.Look)) return new(false, "look", null, null, []);
        await LeaveCurrent();

        var me = NewPlayer(room, info, host: false);
        if (!rooms.TryVisit(me, options.MaxPlayers, out var others, out var hostId, out var reason)) return new(false, reason, null, null, []);
        await Groups.AddToGroupAsync(Context.ConnectionId, room);
        await Clients.OthersInGroup(room).SendAsync("playerJoined", me.Snapshot());
        log.LogInformation("{Name} visited {Room} ({Count} in village)", me.Name, room, others.Count + 1);
        return new(true, null, me.Id, hostId, others);
    }

    /// <summary>
    /// 내 위치 · 방향 · 몸짓을 같은 마을 사람들에게 보낸다(너무 자주 오면 버린다).
    /// </summary>
    public async Task Move(MoveInfo move)
    {
        var me = rooms.Get(Context.ConnectionId);
        if (me is null) return;
        if (!me.Moves.Take(Environment.TickCount64, options.MovesPerSecond, options.MoveBurst)) return;
        me.Move = new MoveInfo(Finite(move.X), Finite(move.Z), Finite(move.Yaw), Clip(move.Anim, MaxWord) ?? "idle", Clip(move.Area, MaxWord) ?? "village", Clip(move.H, MaxHeld));
        await Clients.OthersInGroup(me.Room).SendAsync("playerMoved", me.Id, me.Move);
    }

    /// <summary>
    /// 내 모습이 바뀌었다(옷 · 변신 · 포셰트): 같은 마을 사람들에게 알리고, 나중에 들어올 사람에게 줄 모습도 바꿔 둔다.
    /// </summary>
    public async Task Look(JsonElement look)
    {
        var me = rooms.Get(Context.ConnectionId);
        if (me is null || !ValidLook(look)) return;
        if (!me.Acts.Take(Environment.TickCount64, options.ActsPerSecond, options.ActBurst)) return;
        me.Look = look.Clone();
        await Clients.OthersInGroup(me.Room).SendAsync("playerLook", me.Id, me.Look);
    }

    /// <summary>
    /// 마을 상태(시간 · 마을 친구들 · 풀)를 손님들에게 보낸다. 주인만 보낼 수 있다. 서버는 내용을 해석하지 않는다.
    /// </summary>
    public async Task World(JsonElement world)
    {
        var me = rooms.Get(Context.ConnectionId);
        if (me is null || !me.Host || world.ValueKind != JsonValueKind.Object || world.GetRawText().Length > MaxWorld) return;
        await Clients.OthersInGroup(me.Room).SendAsync("world", world);
    }

    /// <summary>
    /// 손님의 행동(풀 뽑기 · 열매 따기)을 주인에게만 보낸다. 주인이 자기 마을에 반영하고 다음 마을 모습(World)으로 모두에게 퍼진다.
    /// 서버는 내용을 해석하지 않는다(512자까지, 너무 자주 오면 버린다).
    /// </summary>
    public async Task Act(JsonElement act)
    {
        var me = rooms.Get(Context.ConnectionId);
        if (me is null || me.Host || act.ValueKind != JsonValueKind.Object || act.GetRawText().Length > MaxAct) return;
        if (!me.Acts.Take(Environment.TickCount64, options.ActsPerSecond, options.ActBurst)) return;
        var hostId = rooms.HostOf(me.Room);
        if (hostId is null) return;
        await Clients.Client(hostId).SendAsync("guestAct", me.Id, act);
    }

    /// <summary>
    /// 같은 마을의 한 사람에게만 보낸다(맞았다 · 쓰러뜨렸다 · 깨웠다 · 주운 물건처럼 그 사람만 알면 되는 일,
    /// 핸드폰끼리 바로 연결(WebRTC)할 때 서로 건네는 연결 정보). 서버는 내용을 해석하지 않는다(8KB까지, 너무 자주 오면 버린다).
    /// </summary>
    public async Task Direct(string to, JsonElement payload)
    {
        var me = rooms.Get(Context.ConnectionId);
        var target = rooms.Get(to ?? "");
        if (me is null || target is null || target.Id == me.Id || target.Room != me.Room) return;
        if (payload.ValueKind != JsonValueKind.Object || payload.GetRawText().Length > MaxDirect) return;
        if (!me.Acts.Take(Environment.TickCount64, options.ActsPerSecond, options.ActBurst)) return;
        await Clients.Client(target.Id).SendAsync("direct", me.Id, payload);
    }

    /// <summary>
    /// 짧은 말 한마디(정해진 말)를 같은 마을 사람들에게 보낸다.
    /// </summary>
    public async Task Say(string text)
    {
        var me = rooms.Get(Context.ConnectionId);
        var line = Clip(text, MaxSay);
        if (me is null || line is null) return;
        await Clients.OthersInGroup(me.Room).SendAsync("playerSaid", me.Id, line);
    }

    /// <summary>
    /// 이모트(몸짓 이름)를 같은 마을 사람들에게 보낸다.
    /// </summary>
    public async Task Emote(string emote)
    {
        var me = rooms.Get(Context.ConnectionId);
        var name = Clip(emote, MaxWord);
        if (me is null || name is null) return;
        await Clients.OthersInGroup(me.Room).SendAsync("playerEmote", me.Id, name);
    }

    /// <summary>마을에서 나온다(주인이면 문을 닫는다).</summary>
    public Task Leave() => LeaveCurrent();

    /// <summary>연결이 끊기면 마을에서 뺀다(주인이면 문이 닫힌다).</summary>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await LeaveCurrent();
        await base.OnDisconnectedAsync(exception);
    }

    private async Task LeaveCurrent()
    {
        var me = rooms.Leave(Context.ConnectionId, out var evicted);
        if (me is null) return;
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, me.Room);
        if (me.Host)
        {
            // 주인이 나갔다: 문이 닫혀 손님들은 집으로 돌아간다
            if (evicted.Count > 0) await Clients.Clients(evicted).SendAsync("gateClosed", me.Name);
            foreach (var id in evicted) await Groups.RemoveFromGroupAsync(id, me.Room);
            log.LogInformation("{Name} closed gate {Room} ({Count} guests sent home)", me.Name, me.Room, evicted.Count);
        }
        else
        {
            await Clients.Group(me.Room).SendAsync("playerLeft", me.Id);
            log.LogInformation("{Name} left {Room}", me.Name, me.Room);
        }
    }

    private Player NewPlayer(string room, JoinInfo info, bool host)
    {
        var name = Clip(info.Name, MaxName) ?? "손님";
        var move = new MoveInfo(Finite(info.X), Finite(info.Z), Finite(info.Yaw), "idle", "village");
        return new Player(Context.ConnectionId, room, name, info.Look.Clone(), move, host);
    }

    private static bool ValidLook(JsonElement look) => look.ValueKind == JsonValueKind.Object && look.GetRawText().Length <= MaxLook;

    /// <summary>앞뒤 공백을 빼고 max 자까지 자른다. 비면 null.</summary>
    private static string? Clip(string? text, int max)
    {
        var t = (text ?? "").Trim();
        return t.Length == 0 ? null : t.Length > max ? t[..max] : t;
    }

    /// <summary>NaN · 무한대를 0 으로.</summary>
    private static float Finite(float v) => float.IsFinite(v) ? v : 0;
}
