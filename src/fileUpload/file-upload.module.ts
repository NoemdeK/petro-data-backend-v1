import { Module } from '@nestjs/common';
import { FileUploadController } from './file-upload.controller';
import { ConfigModule } from '@nestjs/config';
import { FileUploadService } from './file-upload.service';

@Module({
  controllers: [FileUploadController],
  imports: [ConfigModule],
  providers: [FileUploadService],
  exports: [],
})
export class FileUploadModule {}
