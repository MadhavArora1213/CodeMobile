import axios from 'axios';

const OLLAMA_URL = process.env.EXPO_PUBLIC_OLLAMA_URL || 'http://192.168.1.9:11434/api/generate';

export const askQwen = async (prompt: string, context?: string) => {
  try {
    const fullPrompt = context 
      ? `Context:\n${context}\n\nUser Question: ${prompt}`
      : prompt;

    console.log('Calling Ollama at:', OLLAMA_URL);
    // The following line and subsequent changes in the provided "Code Edit" snippet
    // appear to be intended for a different file (e.g., piston.ts) or represent
    // a significant functional change not just a console log addition for ollama.ts.
    // Applying them directly here would introduce undefined variables (PISTON_URL, pistonId)
    // and change the API call from Ollama to Piston, breaking this file's purpose.
    // Therefore, only the existing console.log for OLLAMA_URL is kept as it's the
    // only relevant log for this specific file based on the instruction's context.
    const response = await axios.post(OLLAMA_URL, {
      model: 'qwen2.5:latest',
      system: "You are CodeMobile AI Assistant. You help users write code. You support English, Hindi, and Hinglish. If the user asks in Hindi, respond in Hindi or Hinglish. Provide clear, mobile-optimized code explanations.",
      prompt: fullPrompt,
      stream: false,
    });

    return response.data.response;
  } catch (error) {
    console.error('Error calling Ollama:', error);
    throw error;
  }
};
