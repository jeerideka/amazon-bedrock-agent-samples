declare module 'elevenlabs-api' {
  export class ElevenLabs {
    constructor(options: { apiKey: string });
    
    textToSpeech(params: {
      text: string;
      voice_id: string;
      model_id: string;
    }): Promise<ArrayBuffer>;
  }
}
