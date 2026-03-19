import axios from 'axios';

// Backend Proxy URL (M12)
const API_URL = (process.env.EXPO_PUBLIC_BACKEND_URL || 'http://192.168.1.9:3000') + '/api/ai/chat'; 

export const askAiProxy = async (
    prompt: string, 
    context: string, 
    onToken?: (token: string) => void
) => {
  try {
    if (onToken) {
        // Use Fetch for streaming support (SSE)
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt, context, stream: true })
        });

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
            let done = false;
            while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                const chunk = decoder.decode(value, { stream: true });
                
                const lines = chunk.split('\n');
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const dataStr = line.replace('data: ', '').trim();
                        if (dataStr === '[DONE]') {
                            done = true;
                            break;
                        }
                        try {
                            const parsed = JSON.parse(dataStr);
                            if (parsed.text) onToken(parsed.text);
                        } catch (e) {}
                    }
                }
            }
        }
    } else {
        const response = await axios.post(API_URL, { prompt, context, stream: false });
        return response.data.response;
    }
  } catch (error) {
    console.error('AI Proxy request failed:', error);
    throw error;
  }
};
