package io.github.thomashtn.abcome.shared.time;

import io.github.thomashtn.abcome.shared.exception.InvalidRequestException;
import java.time.Clock;
import java.time.LocalDate;

/**
 * Date rules shared by words, stages and sentences, judged in the family's zone.
 */
public final class FamilyDates {

    /**
     * Not instantiable: static helpers only.
     */
    private FamilyDates() {
    }

    /**
     * Refuses a date after today: nobody notes a word Côme has not said yet.
     *
     * @param date  date sent by the caller
     * @param clock application clock, in the family's zone
     * @throws InvalidRequestException when the date is in the future
     */
    public static void assertNotInFuture(LocalDate date, Clock clock) {
        if (date.isAfter(LocalDate.now(clock))) {
            throw new InvalidRequestException("The date cannot be in the future.");
        }
    }
}
