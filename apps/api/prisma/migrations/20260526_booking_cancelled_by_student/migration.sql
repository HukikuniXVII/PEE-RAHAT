-- FR-TH-06: dedicated BookingStatus value for student-initiated
-- cancellations of pre-payment bookings (requested + accepted states
-- only). Distinct from the generic `cancelled` so admin queries +
-- reporting can tell student cancels apart from tutor- / postpone- /
-- report-driven cancellations.

ALTER TYPE "BookingStatus" ADD VALUE 'cancelled_by_student';
