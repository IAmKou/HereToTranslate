import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { AiChatService } from '../service/ai-manager.service';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';

@Controller('ai')
export class AiChatController {
  constructor(private readonly aiChatService: AiChatService) {}


  @Post('ask')
  async ask(@Body('question') question: string) {
    const answer = await this.aiChatService.ask(question);
    return { answer };
  }

  @UseGuards(JwtAuthGuard)
  @Post('chat')
  async chat(@Body('message') message: string) {
    try {
      const response = await this.aiChatService.ask(message);
      return { response };
    } catch (error) {
      // Fallback response if AI service fails
      return {
        response: `I received your message: "${message}". I'm currently in a simple mode. Please check your environment variables for OpenAI and Pinecone configuration.`
      };
    }
  }


  @Post('ingest')
  async ingest() {
    const result = await this.aiChatService.ingestDocs();
    return result;
  }

  @Post('test')
  async test() {
    return { message: 'AI Chat endpoint is working!' };
  }
}
