import { Module } from '@nestjs/common';
import { CandidatesModule } from '../candidates/candidates.module';
import { MailModule } from '../mail/mail.module';
import { MediaModule } from '../media/media.module';
import { StorageModule } from '../storage/storage.module';
import { AssessmentImportService } from './assessment-import.service';
import { AssessmentInvitationsController } from './assessment-invitations.controller';
import { AssessmentInvitationsService } from './assessment-invitations.service';
import { AssessmentSeedService } from './assessment-seed.service';
import { AssessmentsController } from './assessments.controller';
import { AssessmentsService } from './assessments.service';
import { AttemptsService } from './attempts.service';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';
import { TakeController } from './take.controller';
import { TakeService } from './take.service';

/** Test templates, sending them to candidates, taking and scoring. See docs/assessments.md. */
@Module({
  imports: [CandidatesModule, MailModule, MediaModule, StorageModule],
  controllers: [
    AssessmentsController,
    QuestionsController,
    AssessmentInvitationsController,
    TakeController,
  ],
  providers: [
    AssessmentsService,
    QuestionsService,
    AssessmentImportService,
    AssessmentSeedService,
    AssessmentInvitationsService,
    AttemptsService,
    TakeService,
  ],
  // The dashboard counts the same numbers as the test library and the Sent
  // list, so it reuses these two rather than repeating their rules.
  exports: [AssessmentSeedService, AssessmentsService, AttemptsService],
})
export class AssessmentsModule {}
