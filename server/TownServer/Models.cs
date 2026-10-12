using System.Text.Json;

namespace TownServer;

/// <summary>
/// 문을 열거나 놀러 갈 때 보내는 내 정보.
/// </summary>
/// <param name="Name">이름(최대 8자).</param>
/// <param name="Look">캐릭터 모습(게임의 look 객체 그대로, 서버는 내용을 해석하지 않고 전달만 한다).</param>
/// <param name="X">마을 안 x 좌표.</param>
/// <param name="Z">마을 안 z 좌표.</param>
/// <param name="Yaw">바라보는 방향(라디안).</param>
public sealed record JoinInfo(string Name, JsonElement Look, float X, float Z, float Yaw);

/// <summary>
/// 움직임 한 번(위치 · 방향 · 몸짓 · 있는 곳).
/// </summary>
/// <param name="X">x 좌표.</param>
/// <param name="Z">z 좌표.</param>
/// <param name="Yaw">바라보는 방향(라디안).</param>
/// <param name="Anim">몸짓 이름('idle' · 'walk' · 'pull' …).</param>
/// <param name="Area">있는 곳('village' 마을 · 'away' 집 안이나 마을 밖).</param>
public sealed record MoveInfo(float X, float Z, float Yaw, string Anim, string Area);

/// <summary>
/// 마을 안 사람 한 명의 지금 모습(새로 들어온 사람에게 보내 준다).
/// </summary>
/// <param name="Id">연결 id(사람을 가리키는 이름표).</param>
/// <param name="Name">이름.</param>
/// <param name="Look">캐릭터 모습.</param>
/// <param name="Move">마지막 움직임.</param>
/// <param name="Host">마을 주인인지.</param>
public sealed record PlayerSnapshot(string Id, string Name, JsonElement Look, MoveInfo Move, bool Host);

/// <summary>
/// 문 열기 · 놀러 가기 결과.
/// </summary>
/// <param name="Ok">됐는지.</param>
/// <param name="Reason">안 된 까닭('room' 마을 코드가 이상함 · 'look' 모습이 이상함 · 'taken' 그 코드로 이미 문이 열려 있음 · 'closed' 문이 닫혀 있음 · 'full' 꽉 참).</param>
/// <param name="You">내 연결 id.</param>
/// <param name="Host">마을 주인의 연결 id.</param>
/// <param name="Players">먼저 와 있던 사람들(주인 포함, 나 빼고).</param>
public sealed record JoinResult(bool Ok, string? Reason, string? You, string? Host, IReadOnlyList<PlayerSnapshot> Players);
