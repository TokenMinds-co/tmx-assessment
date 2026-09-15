import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../config/env.validation';
import { ConsoleMailTransport } from './console.transport';
import { MailService } from './mail.service';
import { MAIL_TRANSPORT, MailTransport } from './mail.transport';
import { ResendMailTransport } from './resend.transport';

@Module({
  providers: [
    MailService,
    {
      provide: MAIL_TRANSPORT,
      inject: [ConfigService],
      useFactory: (
        config: ConfigService<EnvironmentVariables, true>,
      ): MailTransport => {
        const apiKey = config.get('RESEND_API_KEY', { infer: true });
        if (apiKey) {
          return new ResendMailTransport(
            apiKey,
            config.get('EMAIL_FROM', { infer: true }),
          );
        }
        new Logger('Mail').warn(
          'RESEND_API_KEY is not set, so emails are printed here instead of sent.',
        );
        return new ConsoleMailTransport();
      },
    },
  ],
  exports: [MailService],
})
export class MailModule {}
