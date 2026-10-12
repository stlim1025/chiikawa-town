using System.Collections.Concurrent;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace TownServer;

/// <summary>
/// 방에 들어와 있는 플레이어 한 명(서버 메모리에만 있다. 저장하지 않는다).
/// </summary>
public sealed class Player(string id, string room, string name, JsonElement look, MoveInfo move)
{
    /// <summary>연결 id.</summary>
    public string Id { get; } = id;

    /// <summary>들어와 있는 방 코드.</summary>
    public string Room { get; } = room;

    /// <summary>이름.</summary>
    public string Name { get; } = name;

    /// <summary>캐릭터 모습.</summary>
    public JsonElement Look { get; } = look;

    /// <summary>마지막 움직임.</summary>
    public MoveInfo Move { get; set; } = move;

    /// <summary>위치를 더 받을 수 있는 남은 개수(시간이 지나면 다시 찬다).</summary>
    public double MoveTokens { get; set; } = double.MaxValue;

    /// <summary>MoveTokens 를 마지막으로 채운 시각(Environment.TickCount64).</summary>
    public long MoveRefillAt { get; set; }

    /// <summary>
    /// 위치 한 번을 받아 들여도 되는지(1초에 perSecond 개, 잠깐 몰려오면 burst 개까지). 되면 하나 쓴다.
    /// </summary>
    public bool TakeMove(long now, double perSecond, double burst)
    {
        var refill = (now - MoveRefillAt) / 1000.0 * perSecond;
        MoveTokens = Math.Min(burst, MoveTokens == double.MaxValue ? burst : MoveTokens + refill);
        MoveRefillAt = now;
        if (MoveTokens < 1) return false;
        MoveTokens -= 1;
        return true;
    }

    /// <summary>새로 들어온 사람에게 보낼 모습.</summary>
    public PlayerSnapshot Snapshot() => new(Id, Name, Look, Move);
}

/// <summary>
/// 방과 그 안의 플레이어들. 여러 연결이 동시에 들어오고 나가므로 방마다 잠근다.
/// </summary>
public sealed partial class RoomRegistry
{
    private readonly ConcurrentDictionary<string, Dictionary<string, Player>> _rooms = new();
    private readonly ConcurrentDictionary<string, Player> _players = new();

    /// <summary>지금 접속해 있는 플레이어 수(모든 방).</summary>
    public int PlayerCount => _players.Count;

    /// <summary>
    /// 방 코드를 정리한다: 앞뒤 공백을 빼고 1~16자, 한글 · 영문 · 숫자 · '-' 만. 영문은 소문자로. 맞지 않으면 null.
    /// </summary>
    public static string? NormalizeRoom(string? room)
    {
        var code = (room ?? "").Trim().ToLowerInvariant();
        return RoomPattern().IsMatch(code) ? code : null;
    }

    /// <summary>연결 id 로 플레이어를 찾는다(방에 없으면 null).</summary>
    public Player? Get(string id) => _players.GetValueOrDefault(id);

    /// <summary>
    /// 방에 넣는다. 꽉 찼으면 false. 들어가면 먼저 와 있던 사람들의 모습을 others 로 준다.
    /// </summary>
    public bool TryJoin(Player player, int maxPlayers, out IReadOnlyList<PlayerSnapshot> others)
    {
        var members = _rooms.GetOrAdd(player.Room, _ => []);
        lock (members)
        {
            if (members.Count >= maxPlayers)
            {
                others = [];
                return false;
            }
            others = members.Values.Select(p => p.Snapshot()).ToList();
            members[player.Id] = player;
            _players[player.Id] = player;
            return true;
        }
    }

    /// <summary>방에서 뺀다. 빠진 플레이어(없었으면 null)를 돌려준다. 빈 방은 지운다.</summary>
    public Player? Leave(string id)
    {
        if (!_players.TryRemove(id, out var player)) return null;
        if (_rooms.TryGetValue(player.Room, out var members))
        {
            lock (members)
            {
                members.Remove(id);
                if (members.Count == 0) _rooms.TryRemove(new KeyValuePair<string, Dictionary<string, Player>>(player.Room, members));
            }
        }
        return player;
    }

    [GeneratedRegex(@"^[0-9a-z가-힣\-]{1,16}$")]
    private static partial Regex RoomPattern();
}
