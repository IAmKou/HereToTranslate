import { Controller, Post, Body } from '@nestjs/common';
import { AiChatService } from '../service/ai-manager.service';

@Controller('ai')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}


  @Post('ask')
  async ask(@Body('question') question: string) {
    const answer = await this.aiChatService.ask(question);
    return { answer };
  }


  @Post('ingest')
  async ingest() {
    const result = await this.aiChatService.ingestDocs();
    return result;
  }
}
