namespace TownServer;

/// <summary>
/// 서버 설정(appsettings.json 의 "Town" 칸).
/// </summary>
public sealed class TownOptions
{
    /// <summary>방 하나에 들어올 수 있는 최대 인원.</summary>
    public int MaxPlayers { get; set; } = 8;

    /// <summary>한 사람이 1초에 보낼 수 있는 위치 수(게임은 10번 보낸다). 넘치면 버린다.</summary>
    public double MovesPerSecond { get; set; } = 20;

    /// <summary>
    /// 잠깐 몰려와도 봐주는 개수. 네트워크가 밀렸다 몇 개가 한꺼번에 와도 마지막 위치까지 버리지 않게
    /// (게임은 같은 위치를 다시 보내지 않아서, 마지막 위치가 버려지면 2초 동안 멈춰 보였다).
    /// </summary>
    public double MoveBurst { get; set; } = 5;

    /// <summary>한 사람이 1초에 보낼 수 있는 행동 수(Act: 풀 뽑기 · 열매 따기 · 몬스터 치기, Direct: 맞았다 · 깨웠다 · 주운 물건). 넘치면 버린다.</summary>
    public double ActsPerSecond { get; set; } = 10;

    /// <summary>행동이 잠깐 몰려와도 봐주는 개수.</summary>
    public double ActBurst { get; set; } = 30;

    /// <summary>접속을 허용할 게임 페이지 출처. "*" 면 어디서든 허용한다.</summary>
    public string[] AllowedOrigins { get; set; } = ["*"];
}
