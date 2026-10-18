package io.github.thomashtn.abcome.shared.time;

import io.github.thomashtn.abcome.shared.exception.InvalidRequestException;
import java.time.Clock;
import java.time.LocalDate;

/**
 * Date rules shared by words, stages and sentences, judged in the family's zone.
 */
public final class FamilyDates {

    /**
     * Earliest date the notebook accepts, well before Côme's first word: catches a mistyped year (0202).
     */
    public static final LocalDate FIRST_DAY = LocalDate.of(2020, 1, 1);

    /**
     * Not instantiable: static helpers only.
     */
    private FamilyDates() {
    }

    /**
     * Refuses a date after today, since nobody notes a word Côme has not said yet, or before
     * {@link #FIRST_DAY}, a mistyped year.
     *
     * @param date  date sent by the caller
     * @param clock application clock, in the family's zone
     * @throws InvalidRequestException when the date is in the future or before the first day
     */
    public static void assertPlausible(LocalDate date, Clock clock) {
        if (date.isAfter(LocalDate.now(clock))) {
            throw new InvalidRequestException("The date cannot be in the future.");
        }
        if (date.isBefore(FIRST_DAY)) {
            throw new InvalidRequestException("The date cannot be before " + FIRST_DAY + ".");
        }
    }
}
