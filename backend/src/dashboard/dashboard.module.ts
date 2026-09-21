import { Module } from '@nestjs/common';
import { AssessmentsModule } from '../assessments/assessments.module';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';

/**
 * The staff home page's numbers. It has its own module because the page will
 * grow past assessments once the recruitment pipeline lands, and because it
 * only ever reads: every rule it shows belongs to the area it came from.
 * See docs/dashboard.md.
 */
@Module({
  imports: [AssessmentsModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
