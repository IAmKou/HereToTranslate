import { Injectable } from '@nestjs/common';
import { OpenAI } from 'openai';

@Injectable()
export class AiChatService {
  private openai: OpenAI;
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async ask(question: string) {
    const completion = await this.openai.chat.completions.create({
      model: 'gpt-4o-mini', 
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful support assistant for our website. Answer clearly and step by step.',
        },
        { role: 'user', content: question },
      ],
    });

    return completion.choices[0].message.content;
  }
}
