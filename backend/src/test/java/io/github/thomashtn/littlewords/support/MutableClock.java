package io.github.thomashtn.littlewords.support;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

/**
 * Clock a test moves forward by hand.
 */
public final class MutableClock extends Clock {

    /**
     * Current instant.
     */
    private Instant now;

    /**
     * Creates the clock.
     *
     * @param start initial instant
     */
    public MutableClock(Instant start) {
        this.now = start;
    }

    /**
     * Moves the clock forward.
     *
     * @param duration time to add
     */
    public void advance(Duration duration) {
        now = now.plus(duration);
    }

    /**
     * Returns the current instant.
     *
     * @return current instant
     */
    @Override
    public Instant instant() {
        return now;
    }

    /**
     * Returns UTC, the only zone tests need.
     *
     * @return UTC
     */
    @Override
    public ZoneId getZone() {
        return ZoneOffset.UTC;
    }

    /**
     * Returns this clock: the zone never matters to the tests using it.
     *
     * @param zone ignored zone
     * @return this clock
     */
    @Override
    public Clock withZone(ZoneId zone) {
        return this;
    }
}
