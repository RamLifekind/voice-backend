/**
 * TTS Service - Azure Text-to-Speech
 * Reusable service for generating speech audio
 * Uses SSML for natural, professional medical speech
 */

const sdk = require("microsoft-cognitiveservices-speech-sdk");
const config = require("../config");

// Medical terms pronunciation dictionary (word -> phonetic)
const MEDICAL_PRONUNCIATIONS = {
  // Common medical terms
  "hypertension": "high-per-TEN-shun",
  "hypotension": "high-po-TEN-shun",
  "tachycardia": "tak-ih-KAR-dee-uh",
  "bradycardia": "brad-ih-KAR-dee-uh",
  "arrhythmia": "uh-RITH-mee-uh",
  "dyspnea": "DISP-nee-uh",
  "edema": "ih-DEE-muh",
  "ischemia": "ih-SKEE-mee-uh",
  "anemia": "uh-NEE-mee-uh",
  "sepsis": "SEP-sis",
  "embolism": "EM-buh-liz-um",
  "thrombosis": "throm-BOH-sis",
  "stenosis": "steh-NOH-sis",
  "fibrillation": "fib-rih-LAY-shun",
  "infarction": "in-FARK-shun",
  "neuropathy": "noo-ROP-uh-thee",
  "myopathy": "my-OP-uh-thee",
  "cardiomyopathy": "kar-dee-oh-my-OP-uh-thee",
  "encephalopathy": "en-sef-uh-LOP-uh-thee",
  "nephropathy": "neh-FROP-uh-thee",
  "retinopathy": "ret-in-OP-uh-thee",
  "osteoporosis": "os-tee-oh-puh-ROH-sis",
  "osteoarthritis": "os-tee-oh-ar-THRY-tis",
  "fibromyalgia": "fy-broh-my-AL-juh",
  "scoliosis": "skoh-lee-OH-sis",
  "kyphosis": "ky-FOH-sis",
  "lordosis": "lor-DOH-sis",
  "sciatica": "sy-AT-ih-kuh",
  "radiculopathy": "rad-ik-yoo-LOP-uh-thee",
  "subluxation": "sub-luk-SAY-shun",
  // Abbreviations
  "GHS": "G H S",
  "UTC": "U T C",
  "CPT": "C P T",
  "MRI": "M R I",
  "CT": "C T",
  "EKG": "E K G",
  "ECG": "E C G",
  "BMI": "B M I",
  "BP": "blood pressure",
  "HR": "heart rate",
  "RR": "respiratory rate",
  "SpO2": "oxygen saturation",
  "A1C": "A 1 C",
  "HbA1c": "hemoglobin A 1 C",
  // Drug classes
  "NSAID": "N said",
  "SSRI": "S S R I",
  "SNRI": "S N R I",
  "ACE": "ace",
  "ARB": "A R B",
  // Treatment types
  "chiropractic": "ky-roh-PRAK-tik",
  "acupuncture": "AK-yoo-punk-cher",
  "psychotherapy": "sy-koh-THER-uh-pee",
  "telemed": "TEL-eh-med",
  "telehealth": "TEL-eh-health"
};

class TTSService {
  constructor() {
    this.speechConfig = null;
    // Default voice: Aria is more natural and supports styles
    this.defaultVoice = "en-US-AriaNeural";
    // Speaking style for medical context
    this.speakingStyle = "professional";
    // Rate: slightly faster for efficiency (1.0 = normal, 1.1 = 10% faster)
    this.speakingRate = "1.05";
    this.initTTS();
  }

  initTTS() {
    try {
      const endpointUrl = new URL(config.SPEECH_ENDPOINT);
      this.speechConfig = sdk.SpeechConfig.fromEndpoint(endpointUrl, config.SPEECH_KEY);
      this.speechConfig.speechSynthesisVoiceName = this.defaultVoice;
      console.log(`🔊 Azure TTS initialized with ${this.defaultVoice} (${this.speakingStyle} style)`);
    } catch (err) {
      console.error("❌ TTS init error:", err.message);
    }
  }

  /**
   * Apply medical pronunciations using SSML <sub> tags
   * This tells TTS to speak the alias instead of the written text
   */
  applyMedicalPronunciations(text) {
    let processedText = text;

    // Replace medical terms with SSML <sub> tags for proper pronunciation
    // <sub alias="spoken form">written form</sub>
    for (const [term, pronunciation] of Object.entries(MEDICAL_PRONUNCIATIONS)) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      processedText = processedText.replace(regex, (match) => {
        return `<sub alias="${pronunciation}">${match}</sub>`;
      });
    }

    return processedText;
  }

  /**
   * Build SSML for natural speech
   */
  buildSSML(text, options = {}) {
    const voice = options.voice || this.defaultVoice;
    const style = options.style || this.speakingStyle;
    const rate = options.rate || this.speakingRate;

    // First escape XML special characters in the original text
    // (but not < > which we'll add for SSML tags)
    let escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');

    // Now apply medical pronunciations (adds <sub> tags)
    const processedText = this.applyMedicalPronunciations(escapedText);

    // Build SSML with style and prosody
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="en-US">
  <voice name="${voice}">
    <mstts:express-as style="${style}">
      <prosody rate="${rate}">
        ${processedText}
      </prosody>
    </mstts:express-as>
  </voice>
</speak>`;

    return ssml;
  }

  /**
   * Generate speech from text (uses SSML for natural speech)
   * @param {string} text - Text to convert to speech
   * @param {Function} callback - Callback with audio buffer
   * @param {object} options - Optional: { voice, style, rate }
   */
  generateSpeech(text, callback, options = {}) {
    if (!this.speechConfig) {
      console.error("❌ TTS not initialized");
      return;
    }

    try {
      const ssml = this.buildSSML(text, options);
      const synthesizer = new sdk.SpeechSynthesizer(this.speechConfig, null);

      console.log(`🔊 Generating TTS for: "${text.substring(0, 50)}..."`);

      synthesizer.speakSsmlAsync(
        ssml,
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