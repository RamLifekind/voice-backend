/**
 * TTS Service - Azure Text-to-Speech
 * Reusable service for generating speech audio
 */

const sdk = require("microsoft-cognitiveservices-speech-sdk");
const config = require("../config");

class TTSService {
  constructor() {
    this.speechConfig = null;
    this.initTTS();
  }

  initTTS() {
    try {
      const endpointUrl = new URL(config.SPEECH_ENDPOINT);
      this.speechConfig = sdk.SpeechConfig.fromEndpoint(endpointUrl, config.SPEECH_KEY);
      this.speechConfig.speechSynthesisVoiceName = "en-US-JennyNeural";
      console.log("🔊 Azure TTS initialized");
    } catch (err) {
      console.error("❌ TTS init error:", err.message);
    }
  }

  /**
   * Generate speech from text
   * @param {string} text - Text to convert to speech
   * @param {Function} callback - Callback with audio buffer
   * @param {string} voiceName - Optional voice name override
   */
  generateSpeech(text, callback, voiceName = null) {
    if (!this.speechConfig) {
      console.error("❌ TTS not initialized");
      return;
    }

    try {
      // Override voice if specified
      if (voiceName) {
        this.speechConfig.speechSynthesisVoiceName = voiceName;
      }
      
      const synthesizer = new sdk.SpeechSynthesizer(this.speechConfig, null);
      
      console.log(`🔊 Generating TTS for: "${text.substring(0, 50)}..."`);
      
      synthesizer.speakTextAsync(
        text,
        (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            console.log(`✅ TTS generated (${result.audioData.byteLength} bytes)`);
            
            const audioBuffer = Buffer.from(result.audioData);
            
            if (callback) {
              callback(audioBuffer);
            }
          } else {
            console.error("❌ TTS synthesis failed:", result.errorDetails);
          }
          
          synthesizer.close();
        },
        (error) => {
          console.error("❌ TTS error:", error);
          synthesizer.close();
        }
      );
      
    } catch (error) {
      console.error(`❌ TTS generation error:`, error.message);
    }
  }

  /**
   * Generate speech with SSML (advanced formatting)
   * @param {string} ssml - SSML markup
   * @param {Function} callback - Callback with audio buffer
   */
  generateSpeechWithSSML(ssml, callback) {
    if (!this.speechConfig) {
      console.error("❌ TTS not initialized");
      return;
    }

    try {
      const synthesizer = new sdk.SpeechSynthesizer(this.speechConfig, null);
      
      synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
            console.log(`✅ SSML TTS generated`);
            const audioBuffer = Buffer.from(result.audioData);
            if (callback) callback(audioBuffer);
          }
          synthesizer.close();
        },
        (error) => {
          console.error("❌ SSML TTS error:", error);
          synthesizer.close();
        }
      );
      
    } catch (error) {
      console.error(`❌ SSML generation error:`, error.message);
    }
  }
}

module.exports = TTSService;