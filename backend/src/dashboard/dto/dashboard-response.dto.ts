import { ApiProperty } from '@nestjs/swagger';
import { PersonRefDto } from '../../assessments/dto/invitation.dto';

/** How many sent links sit at each stage. Revoked links are left out. */
export class LinkProgressDto {
  @ApiProperty({ description: 'Links where no test has been opened yet.' })
  notStarted!: number;

  @ApiProperty({ description: 'Links where at least one test was started.' })
  inProgress!: number;

  @ApiProperty({ description: 'Links where every test is finished.' })
  completed!: number;
}

/** One test that has been sent at least once, for the dashboard's table. */
export class DashboardTestDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Communication' })
  name!: string;

  @ApiProperty({ example: 8 })
  durationMinutes!: number;

  @ApiProperty({
    description: 'Attempts submitted or closed by the time limit.',
  })
  completed!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Mean score of the completed attempts, from 0 to 1.',
  })
  averageScore!: number | null;
}

/** A candidate who has finished at least one test in a link. */
export class RecentResultDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Open the results page at /assessment-invitations/:id.',
  })
  invitationId!: string;

  @ApiProperty({ type: PersonRefDto })
  candidate!: PersonRefDto;

  @ApiProperty({ description: 'Tests in the link that are finished.' })
  testsFinished!: number;

  @ApiProperty({ description: 'Tests in the link altogether.' })
  testsTotal!: number;

  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Mean score of the finished tests, from 0 to 1.',
  })
  averageScore!: number | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'When the most recent of those tests finished.',
  })
  finishedAt!: Date;
}

/** Everything the staff home page shows, in one answer. */
export class DashboardDto {
  @ApiProperty({ type: LinkProgressDto })
  progress!: LinkProgressDto;

  @ApiProperty({
    description: 'Links that ran out of time with a test left unfinished.',
  })
  expiredInvitations!: number;

  @ApiProperty({ type: [DashboardTestDto], description: 'By name.' })
  tests!: DashboardTestDto[];

  @ApiProperty({ type: [RecentResultDto], description: 'Newest first.' })
  recentResults!: RecentResultDto[];
}
