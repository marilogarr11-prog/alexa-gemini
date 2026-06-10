const express = require('express');
const Alexa = require('ask-sdk-core');
const { ExpressAdapter } = require('ask-sdk-express-adapter');

const app = express();
const GEMINI_API_KEY = 'AQ.Ab8RN6KTR4SBV2GprlvNa1z7vPa6LaDA_YSf0KkbwhBKlWAxEA';

async function preguntarGemini(texto) {
  const https = require('https');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  const body = JSON.stringify({
    contents: [{ parts: [{ text: texto }] }]
  });

  return new Promise((resolve) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        console.log('Respuesta de Gemini:', data);
        try {
          const json = JSON.parse(data);
          const respuesta = json.candidates[0].content.parts[0].text;
          resolve(respuesta.substring(0, 8000));
        } catch (e) {
          console.error('Error parseando Gemini:', e, 'Data:', data);
          resolve('Lo siento, no pude obtener respuesta de Gemini.');
        }
      });
    });

    req.on('error', (e) => {
      console.error('Error de conexión:', e);
      resolve('Error de conexión con Gemini.');
    });
    req.write(body);
    req.end();
  });
}

const InicioHandler = {
  canHandle(input) {
    return Alexa.getRequestType(input.requestEnvelope) === 'LaunchRequest';
  },
  handle(input) {
    console.log('LaunchRequest recibido');
    return input.responseBuilder
      .speak('Hola, soy tu asistente con Gemini. ¿En qué te puedo ayudar?')
      .reprompt('¿En qué te puedo ayudar?')
      .getResponse();
  }
};

const PreguntaIntentHandler = {
  canHandle(input) {
    return Alexa.getRequestType(input.requestEnvelope) === 'IntentRequest' &&
           Alexa.getIntentName(input.requestEnvelope) === 'PreguntarIntent';
  },
  async handle(input) {
    const pregunta = Alexa.getSlotValue(input.requestEnvelope, 'pregunta');
    console.log('Pregunta recibida:', pregunta);
    if (!pregunta) {
      return input.responseBuilder
        .speak('No entendí tu pregunta, intenta de nuevo.')
        .reprompt('¿Cuál es tu pregunta?')
        .getResponse();
    }
    const respuesta = await preguntarGemini(pregunta);
    console.log('Respuesta enviada a Alexa:', respuesta);
    return input.responseBuilder
      .speak(respuesta)
      .reprompt('¿Tienes otra pregunta?')
      .getResponse();
  }
};

const CancelStopHandler = {
  canHandle(input) {
    return Alexa.getRequestType(input.requestEnvelope) === 'IntentRequest' &&
           (Alexa.getIntentName(input.requestEnvelope) === 'AMAZON.CancelIntent' ||
            Alexa.getIntentName(input.requestEnvelope) === 'AMAZON.StopIntent');
  },
  handle(input) {
    return input.responseBuilder.speak('Hasta luego.').getResponse();
  }
};

const ErrorHandler = {
  canHandle() { return true; },
  handle(input, error) {
    console.error('Error en Alexa handler:', error);
    return input.responseBuilder
      .speak('Ocurrió un error, intenta de nuevo.')
      .getResponse();
  }
};

const skillBuilder = Alexa.SkillBuilders.custom()
  .addRequestHandlers(InicioHandler, PreguntaIntentHandler, CancelStopHandler)
  .addErrorHandlers(ErrorHandler)
  .create();

const adapter = new ExpressAdapter(skillBuilder, true, true);

app.post('/alexa', adapter.getRequestHandlers());
app.get('/', (req, res) => res.send('Servidor Alexa-Gemini activo ✅'));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
