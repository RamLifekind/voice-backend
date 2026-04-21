/**
 * TTS Service - Azure Text-to-Speech
 * Reusable service for generating speech audio
 * Uses SSML for natural, professional medical speech
 */

const sdk = require("microsoft-cognitiveservices-speech-sdk");
const config = require("../config");

// Medical terms pronunciation dictionary using IPA phonemes
// Azure Neural voices support IPA via <phoneme alphabet="ipa"> SSML tags
// This gives exact phonetic control — no guessing by the TTS engine
const MEDICAL_IPA = {
  // Conditions - musculoskeletal / pain
  "fibromyalgia":    "ˌfaɪbroʊmaɪˈældʒə",
  "scoliosis":       "ˌskoʊliˈoʊsɪs",
  "kyphosis":        "kaɪˈfoʊsɪs",
  "lordosis":        "lɔːrˈdoʊsɪs",
  "sciatica":        "saɪˈætɪkə",
  "radiculopathy":   "rəˌdɪkjʊˈlɑːpəθi",
  "subluxation":     "ˌsʌblʌkˈseɪʃən",
  "osteoporosis":    "ˌɑːstioʊpəˈroʊsɪs",
  "osteoarthritis":  "ˌɑːstioʊɑːrˈθraɪtɪs",
  "myofascial":      "ˌmaɪoʊˈfæʃəl",
  "cervicalgia":     "ˌsɜːrvɪˈkældʒə",
  "lumbago":         "lʌmˈbeɪɡoʊ",
  "tendinopathy":    "ˌtɛndɪˈnɑːpəθi",
  "enthesopathy":    "ˌɛnθɪˈsɑːpəθi",

  // Conditions - cardiovascular
  "hypertension":    "ˌhaɪpərˈtɛnʃən",
  "hypotension":     "ˌhaɪpoʊˈtɛnʃən",
  "tachycardia":     "ˌtækɪˈkɑːrdiə",
  "bradycardia":     "ˌbrædɪˈkɑːrdiə",
  "arrhythmia":      "əˈrɪðmiə",
  "fibrillation":    "ˌfɪbrɪˈleɪʃən",
  "infarction":      "ɪnˈfɑːrkʃən",
  "thrombosis":      "θrɑːmˈboʊsɪs",
  "embolism":        "ˈɛmbəlɪzəm",
  "stenosis":        "stəˈnoʊsɪs",
  "ischemia":        "ɪˈskimiə",
  "cardiomyopathy":  "ˌkɑːrdioʊmaɪˈɑːpəθi",

  // Conditions - neuro / general
  "neuropathy":      "nʊˈrɑːpəθi",
  "myopathy":        "maɪˈɑːpəθi",
  "encephalopathy":  "ɛnˌsɛfəˈlɑːpəθi",
  "nephropathy":     "nɛˈfrɑːpəθi",
  "retinopathy":     "ˌrɛtɪˈnɑːpəθi",
  "dyspnea":         "ˈdɪspniə",
  "edema":           "ɪˈdimə",
  "anemia":          "əˈnimiə",
  "sepsis":          "ˈsɛpsɪs",

  // Treatment types
  "chiropractic":    "ˌkaɪroʊˈpræktɪk",
  "acupuncture":     "ˈækjʊˌpʌŋktʃər",
  "psychotherapy":   "ˌsaɪkoʊˈθɛrəpi",
  "physiotherapy":   "ˌfɪzioʊˈθɛrəpi",
  "analgesic":       "ˌænəlˈdʒizɪk",
  "prophylaxis":     "ˌproʊfɪˈlæksɪs",
  "comorbidity":     "ˌkoʊmɔːrˈbɪdɪti",
  "comorbidities":   "ˌkoʊmɔːrˈbɪdɪtiz",

  // Drug classes / meds
  "gabapentin":      "ˌɡæbəˈpɛntɪn",
  "pregabalin":      "prɪˈɡæbəlɪn",
  "duloxetine":      "dəˈlɑːksəˌtin",
  "amitriptyline":   "ˌæmɪˈtrɪptəˌlin",
  "cyclobenzaprine": "ˌsaɪkloʊˈbɛnzəˌprin",
  "naproxen":        "nəˈprɑːksən",
  "ibuprofen":       "ˌaɪbjuːˈproʊfən",
  "acetaminophen":   "əˌsiːtəˈmɪnəfən",
  "hydrocodone":     "ˌhaɪdroʊˈkoʊdoʊn",
  "oxycodone":       "ˌɑːksɪˈkoʊdoʊn",
  "buprenorphine":   "ˌbjuprəˈnɔːrˌfin",
  "naloxone":        "ˈnæləkˌsoʊn",
  "naltrexone":      "ˈnælˌtrɛkˌsoʊn",
  "suboxone":        "sʊˈbɑːksoʊn",
  "methadone":       "ˈmɛθəˌdoʊn",
  "clonidine":       "ˈklɑːnɪˌdin",
  "tizanidine":      "taɪˈzænɪˌdin",
  "meloxicam":       "mɛˈlɑːksɪˌkæm",
  "diclofenac":      "daɪˈkloʊfənæk",
  "tramadol":        "ˈtræməˌdɔːl",
  "celecoxib":       "ˌsɛlɪˈkɑːksɪb",
  "corticosteroid":  "ˌkɔːrtɪkoʊˈstɛrɔɪd",
  "corticosteroids": "ˌkɔːrtɪkoʊˈstɛrɔɪdz",

  // Assessments / scores
  "PHQ":             "piː eɪtʃ kjuː",
  "GAD":             "dʒiː eɪ diː",
  "UDS":             "juː diː ɛs",
};

// Abbreviations — use <sub alias> (simpler, read as words)
const ABBREVIATION_SUBS = {
  "GHS": "G H S",
  "UTC": "U T C",
  "CPT": "C P T",
  "MRI": "M R I",
  "CT": "C T scan",
  "EKG": "E K G",
  "ECG": "E C G",
  "BMI": "B M I",
  "BP": "blood pressure",
  "HR": "heart rate",
  "RR": "respiratory rate",
  "SpO2": "oxygen saturation",
  "A1C": "A one C",
  "HbA1c": "hemoglobin A one C",
  "NSAID": "N said",
  "NSAIDs": "N saids",
  "SSRI": "S S R I",
  "SNRI": "S N R I",
  "ACE": "ace",
  "ARB": "A R B",
  "ROM": "range of motion",
  "ADL": "A D L",
  "PRN": "as needed",
  "BID": "twice daily",
  "TID": "three times daily",
  "QID": "four times daily",
  "IM": "intramuscular",
  "IV": "intravenous",
  "PO": "by mouth",
  "SQ": "subcutaneous",
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
   * Apply medical pronunciations using SSML tags:
   *  - <phoneme alphabet="ipa" ph="..."> for medical terms (exact pronunciation)
   *  - <sub alias="..."> for abbreviations (read as expanded text)
   */
  applyMedicalPronunciations(text) {
    let processedText = text;

    // Apply IPA phonemes for medical terms
    for (const [term, ipa] of Object.entries(MEDICAL_IPA)) {
      const regex = new RegExp(`\\b${term}\\b`, 'gi');
      processedText = processedText.replace(regex, (match) => {
        return `<phoneme alphabet="ipa" ph="${ipa}">${match}</phoneme>`;
      });
    }

    // Apply substitutions for abbreviations
    for (const [abbr, expanded] of Object.entries(ABBREVIATION_SUBS)) {
      const regex = new RegExp(`\\b${abbr}\\b`, 'g');
      processedText = processedText.replace(regex, (match) => {
        return `<sub alias="${expanded}">${match}</sub>`;
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