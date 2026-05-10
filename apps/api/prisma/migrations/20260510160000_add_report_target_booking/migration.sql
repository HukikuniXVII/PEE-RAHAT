-- Booking is a valid report target (FR-PM-05). Pre-existing
-- bookings.service.report() was writing targetType: "post" pointing
-- at booking IDs, which silently corrupted the admin reports queue.
ALTER TYPE "ReportTargetType" ADD VALUE 'booking';
