const sdk = require("microsoft-cognitiveservices-speech-sdk");
const config = require("../config");

class AzureSpeechService {
  constructor(onTranscript) {
    this.onTranscript = onTranscript;
    this.transcriber = null;
    this.pushStream = null;
    this.streamOpen = false;
  }

  start() {
    return new Promise((resolve, reject) => {
      try {
        // Setup Azure Speech Config
        const endpointUrl = new URL(config.SPEECH_ENDPOINT);
        const speechConfig = sdk.SpeechConfig.fromEndpoint(endpointUrl, config.SPEECH_KEY);
        speechConfig.speechRecognitionLanguage = "en-US";
        speechConfig.setProperty(
          sdk.PropertyId.SpeechServiceConnection_EnableSpeakerDiarization,
          "true"
        );

        // Setup audio stream
        const format = sdk.AudioStreamFormat.getWaveFormatPCM(16000, 16, 1);
        this.pushStream = sdk.AudioInputStream.createPushStream(format);
        const audioConfig = sdk.AudioConfig.fromStreamInput(this.pushStream);
        
        // Create transcriber
        this.transcriber = new sdk.ConversationTranscriber(speechConfig, audioConfig);
        this.streamOpen = true;

        // Handle transcription events
        this.transcriber.transcribed = (s, e) => {
          if (!e.result || !e.result.text) return;
          
          const transcriptData = {
            speakerId: e.result.speakerId || "Guest-1",
            text: e.result.text,
            offset: e.result.offset,
            duration: e.result.duration
          };
          
          if (this.onTranscript) {
            this.onTranscript(transcriptData);
          }
        };

        // Start transcribing
        this.transcriber.startTranscribingAsync(
          () => {
            console.log("✅ Azure Speech Service started");
            resolve();
          },
          (err) => {
            console.error("❌ Azure Speech start error:", err);
            reject(err);
          }
        );
        
      } catch (error) {
        console.error("❌ Azure Speech setup error:", error);
        reject(error);
      }
    });
  }

  processAudio(audioBuffer) {
    if (!this.streamOpen || !this.pushStream) return;
    
    try {
      this.pushStream.write(audioBuffer);
    } catch (err) {
      console.error("❌ Error writing to Azure Speech:", err);
    }
  }

  stop() {
    console.log("🛑 Stopping Azure Speech Service");
    this.streamOpen = false;
    
    if (this.pushStream) {
      this.pushStream.close();
    }
    
    if (this.transcriber) {
      this.transcriber.stopTranscribingAsync();
    }
  }
}

module.exports = AzureSpeechService;