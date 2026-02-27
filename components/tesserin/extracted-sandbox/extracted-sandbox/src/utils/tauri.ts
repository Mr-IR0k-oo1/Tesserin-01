import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';

export const isTauri = typeof window !== 'undefined' && !!(window as any).__TAURI_INTERNALS__;

export async function tauriFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const body = JSON.parse(init?.body as string);
  const { messages, apiKeys } = body;

  // Get provider details
  const providerName = messages[0]?.content.match(/\[Provider: (.*?)\]/)?.[1] || 'OpenAI';
  const modelName = messages[0]?.content.match(/\[Model: (.*?)\]/)?.[1] || 'gpt-4o';

  const stream = new ReadableStream({
    async start(controller) {
      const unlisten = await listen('chat-delta', (event: any) => {
        const payload = event.payload as { content: string; done: boolean };

        if (payload.done) {
          controller.close();
          unlisten();
        } else {
          controller.enqueue(new TextEncoder().encode(`0:${JSON.stringify(payload.content)}\n`));
        }
      });

      try {
        await invoke('chat', {
          request: {
            model: modelName,
            messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
            api_key: apiKeys?.[providerName] || '',
            base_url: 'https://api.openai.com/v1', // Hardcoded for now, should be dynamic
          },
        });
      } catch (error: any) {
        controller.error(error);
        unlisten();
      }
    },
  });

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
