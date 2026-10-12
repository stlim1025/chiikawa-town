using System.Collections.Concurrent;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace TownServer;

/// <summary>
/// 너무 자주 오는 메시지를 버리는 양동이: 1초에 perSecond 개씩 차고, 잠깐 몰려오면 burst 개까지 봐준다.
/// </summary>
public sealed class TokenBucket
{
    private double _tokens = double.MaxValue;
    private long _refillAt;

    /// <summary>하나를 받아 들여도 되는지(되면 하나 쓴다). now 는 Environment.TickCount64.</summary>
    public bool Take(long now, double perSecond, double burst)
    {
        var refill = (now - _refillAt) / 1000.0 * perSecond;
        _tokens = Math.Min(burst, _tokens == double.MaxValue ? burst : _tokens + refill);
        _refillAt = now;
        if (_tokens < 1) return false;
        _tokens -= 1;
        return true;
    }
}

/// <summary>
/// 마을에 들어와 있는 사람 한 명(서버 메모리에만 있다. 저장하지 않는다).
/// </summary>
public sealed class Player(string id, string room, string name, JsonElement look, MoveInfo move, bool host)
{
    /// <summary>연결 id.</summary>
    public string Id { get; } = id;

    /// <summary>들어와 있는 마을 코드.</summary>
    public string Room { get; } = room;

    /// <summary>이름.</summary>
    public string Name { get; } = name;

    /// <summary>캐릭터 모습.</summary>
    public JsonElement Look { get; } = look;

    /// <summary>마지막 움직임.</summary>
    public MoveInfo Move { get; set; } = move;

    /// <summary>마을 주인인지(주인만 마을 상태를 보낼 수 있고, 주인이 나가면 문이 닫힌다).</summary>
    public bool Host { get; } = host;

    /// <summary>위치를 너무 자주 보내면 버리는 양동이.</summary>
    public TokenBucket Moves { get; } = new();

    /// <summary>행동(손님 → 주인)을 너무 자주 보내면 버리는 양동이.</summary>
    public TokenBucket Acts { get; } = new();

    /// <summary>새로 들어온 사람에게 보낼 모습.</summary>
    public PlayerSnapshot Snapshot() => new(Id, Name, Look, Move, Host);
}

/// <summary>
/// 문이 열린 마을들(마을 코드 → 주인과 손님들). 여러 연결이 동시에 들어오고 나가므로 마을마다 잠근다.
/// </summary>
public sealed partial class RoomRegistry
{
    private sealed class Room
    {
        public string? HostId;
        public readonly Dictionary<string, Player> Members = [];
    }

    private readonly ConcurrentDictionary<string, Room> _rooms = new();
    private readonly ConcurrentDictionary<string, Player> _players = new();

    /// <summary>지금 접속해 있는 사람 수(모든 마을).</summary>
    public int PlayerCount => _players.Count;

    /// <summary>
    /// 마을 코드를 정리한다: 앞뒤 공백을 빼고 1~16자, 한글 · 영문 · 숫자 · '-' 만. 영문은 소문자로. 맞지 않으면 null.
    /// </summary>
    public static string? NormalizeRoom(string? room)
    {
        var code = (room ?? "").Trim().ToLowerInvariant();
        return RoomPattern().IsMatch(code) ? code : null;
    }

    /// <summary>연결 id 로 사람을 찾는다(마을에 없으면 null).</summary>
    public Player? Get(string id) => _players.GetValueOrDefault(id);

    /// <summary>그 마을 주인의 연결 id(문이 닫혀 있으면 null).</summary>
    public string? HostOf(string room)
    {
        if (!_rooms.TryGetValue(room, out var r)) return null;
        lock (r) return r.HostId;
    }

    /// <summary>
    /// 문을 연다(주인으로 들어간다). 그 코드로 이미 문이 열려 있으면 false.
    /// </summary>
    public bool TryOpen(Player host)
    {
        while (true)
        {
            var room = _rooms.GetOrAdd(host.Room, _ => new Room());
            lock (room)
            {
                // 잠그기 직전에 마지막 사람이 나가 지워진 마을이면 새로 만든다
                if (!_rooms.TryGetValue(host.Room, out var live) || live != room) continue;
                if (room.HostId is not null) return false;
                room.HostId = host.Id;
                room.Members[host.Id] = host;
                _players[host.Id] = host;
                return true;
            }
        }
    }

    /// <summary>
    /// 놀러 간다(손님으로 들어간다). 문이 닫혀 있으면 reason 'closed', 꽉 찼으면 'full'.
    /// 들어가면 먼저 와 있던 사람들(주인 포함)의 모습과 주인 id 를 준다.
    /// </summary>
    public bool TryVisit(Player guest, int maxPlayers, out IReadOnlyList<PlayerSnapshot> others, out string? hostId, out string? reason)
    {
        others = [];
        hostId = null;
        if (!_rooms.TryGetValue(guest.Room, out var room)) { reason = "closed"; return false; }
        lock (room)
        {
            if (room.HostId is null) { reason = "closed"; return false; }
            if (room.Members.Count >= maxPlayers) { reason = "full"; return false; }
            others = room.Members.Values.Select(p => p.Snapshot()).ToList();
            hostId = room.HostId;
            room.Members[guest.Id] = guest;
            _players[guest.Id] = guest;
            reason = null;
            return true;
        }
    }

    /// <summary>
    /// 마을에서 뺀다. 주인이 나가면 문이 닫혀 손님들도 모두 빠진다(evicted 에 그 손님 id 들).
    /// 빠진 사람(없었으면 null)을 돌려준다. 빈 마을은 지운다.
    /// </summary>
    public Player? Leave(string id, out IReadOnlyList<string> evicted)
    {
        evicted = [];
        if (!_players.TryRemove(id, out var player)) return null;
        if (!_rooms.TryGetValue(player.Room, out var room)) return player;
        lock (room)
        {
            room.Members.Remove(id);
            if (player.Host)
            {
                evicted = room.Members.Keys.ToList();
                foreach (var guestId in evicted) _players.TryRemove(guestId, out _);
                room.Members.Clear();
                room.HostId = null;
            }
            if (room.Members.Count == 0) _rooms.TryRemove(new KeyValuePair<string, Room>(player.Room, room));
        }
        return player;
    }

    [GeneratedRegex(@"^[0-9a-z가-힣\-]{1,16}$")]
    private static partial Regex RoomPattern();
}
