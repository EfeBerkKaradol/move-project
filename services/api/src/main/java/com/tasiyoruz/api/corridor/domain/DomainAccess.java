package com.tasiyoruz.api.corridor.domain;

import com.tasiyoruz.api.corridor.api.MatchOutcome;
import java.time.Instant;

/**
 * Durum geçişlerini yalnızca servis katmanına açar; controller bir koridoru doğrudan
 * EXPIRED yapamaz (ordering modülündeki aynı desen).
 */
public final class DomainAccess {
    private DomainAccess() {}

    public static void pause(Corridor c) { c.pause(); }
    public static void resume(Corridor c) { c.resume(); }
    public static void expire(Corridor c) { c.expire(); }
    public static void resolve(CorridorMatch m, MatchOutcome outcome, Instant now) { m.resolve(outcome, now); }
}
