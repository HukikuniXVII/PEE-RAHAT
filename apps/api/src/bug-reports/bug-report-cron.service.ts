import { Injectable, Logger } from "@nestjs/common";

import { BugReportsService } from "./bug-reports.service";

/**
 * Daily retention sweep for bug-report screenshots (driven by JobsService):
 * purge images from reports resolved >90 days ago, and any report past the
 * 180-day hard cap. Thin wrapper so the cron wiring matches the report
 * system's ReportCronService shape.
 */
@Injectable()
export class BugReportCronService {
  private readonly logger = new Logger(BugReportCronService.name);

  constructor(private readonly bugReports: BugReportsService) {}

  async screenshotCleanup(): Promise<{ purged: number }> {
    const result = await this.bugReports.purgeOldScreenshots();
    if (result.purged > 0) {
      this.logger.log(`Bug screenshot cleanup: purged ${result.purged} file(s)`);
    }
    return result;
  }
}
