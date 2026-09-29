import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getOverview() {
    return {
      name: 'EchoGPT Backend REST API',
      version: '1.0.0',
      description:
        'Production-ready Multi-AI Backend API powering the EchoGPT Chrome Extension with Google Gemini, OpenAI GPT, and Anthropic Claude orchestration.',
      documentation: '/api/docs',
      health: '/health',
      testedProvider: 'Google Gemini (gemini-3.5-flash / gemini-flash-latest)',
      modules: [
        {
          name: 'Authentication',
          prefix: '/api/auth',
          description:
            'Registration, dual-token JWT login, refresh token rotation with replay detection, logout, and password change.',
        },
        {
          name: 'Users',
          prefix: '/api/users',
          description:
            'User profile management, role verification (USER / ADMIN), and password management.',
        },
        {
          name: 'AI Providers',
          prefix: '/api/providers',
          description:
            'Manage AI providers (Gemini, OpenAI, Claude), configure encrypted API keys, toggle enabled status, set defaults, delete providers, and probe health.',
        },
        {
          name: 'Chat & AI Inference',
          prefix: '/api/chat',
          description:
            'Execute AI prompts, manage multi-turn conversation threads, and stream tokens via Server-Sent Events (SSE).',
        },
        {
          name: 'Web Search',
          prefix: '/api/search',
          description:
            'DuckDuckGo instant search integration with 300-second TTL in-memory caching.',
        },
        {
          name: 'Subscriptions & Quotas',
          prefix: '/api/subscriptions',
          description:
            'Tiered quotas (FREE 20 req/day, PREMIUM 500 req/day), tier upgrades/downgrades, and UTC midnight automatic resets.',
        },
        {
          name: 'Admin Panel',
          prefix: '/api/admin',
          description:
            'Administrative dashboard metrics, user listing & deactivation, chronological API audit logs, and PostgreSQL latency diagnostics.',
        },
      ],
    };
  }

  getHello(): string {
    return 'Hello World!';
  }
}
