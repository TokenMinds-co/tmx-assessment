import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../config/env.validation';
import { FILE_STORAGE } from './file-storage';
import { LocalDiskStorage } from './local-disk.storage';

/** Provides FILE_STORAGE: local disk under STORAGE_DIR. */
@Module({
  providers: [
    {
      provide: FILE_STORAGE,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        new LocalDiskStorage(config.get('STORAGE_DIR', { infer: true })),
    },
  ],
  exports: [FILE_STORAGE],
})
export class StorageModule {}
