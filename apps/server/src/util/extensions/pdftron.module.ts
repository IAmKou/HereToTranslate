import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PDFTronBridge } from './pdftron-bridge';

@Module({
  imports: [ConfigModule],
  providers: [PDFTronBridge],
  exports: [PDFTronBridge],
})
export class PDFTronModule {}
