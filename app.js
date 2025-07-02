const { createBot, createProvider, createFlow, addKeyword, EVENTS } = require('@bot-whatsapp/bot')
require("dotenv").config

const QRPortalWeb = require('@bot-whatsapp/portal')
const BaileysProvider = require('@bot-whatsapp/provider/baileys')
//const MockAdapter = require('@bot-whatsapp/database/mock')
const MongoAdapter = require('@bot-whatsapp/database/mongo')
const path = require("path")
const fs = require("fs")
const chat = require("./chatGPT")

const { OpenAI } = require("openai");
const { delay } = require('@whiskeysockets/baileys')

// Variables para almacenar los datos del análisis PESTEL
let descripcionProyecto;
let ubicacion;
let modeloVentas;
let caracteristicasProducto;
let alcanceProyecto;
let alianzasClave;

let history1 = [];
let answer = ""
const pestelFlow = addKeyword(['PESTEL']).addAnswer( "Procesando información, por favor espera...",
    { delay: 200}, 
    async (ctx, { flowDynamic, state, fallBack, gotoFlow }) => {
      const userInput = "";
     if (history1.length < 0) {
        userInput = JSON.stringify({
          descripcionProyecto: descripcionProyecto,
          ubicacion: ubicacion,
          modelo: modeloVentas,
          carcateristicas: caracteristicasProducto,
          alcance: alcanceProyecto,
          alianzas: alianzasClave,
      });
    } else {
      userInput = ctx.body;  // Capturamos el mensaje del usuario
    }
      const userId = ctx.from;                  // identificador del usuario (teléfono)
      
      // Inicializar el estado para este usuario (historial vacío y fase 1 activa)
      await state.update({ history1: [], history2: [], phase: 1 });
      
      // Preparar mensajes para la solicitud inicial a GPT-4 (modelo1)
      const messages = [{ role: 'user', content: userInput },
        {role: "system", content: process.env.PESTEL_AGENT_DESC}
      ];

      let reply;
      try {
        reply = await callGPT(messages);
      } catch (error) {
        console.error('Error llamando a GPT-4:', error);
        reply = "Lo siento, hubo un error al consultar el modelo.";
      }
      
      // Guardar el intercambio en el historial de la conversación 1
      await state.update({ 
        history1: [
          { role: 'user', content: userInput }, 
          { role: 'assistant', content: reply }
        ] 
      });

      // Enviar la respuesta del modelo 1 al usuario
      await flowDynamic(reply);
      
      // **IMPORTANTE**: No terminamos el flujo aquí, queremos seguir en fase 1 hasta que usuario diga "fin".
      // Por lo tanto, continuamos esperando más mensajes del usuario en este mismo flujo (ver siguiente .addAnswer).
    }
  ).addAnswer('¿Tienes otra pregunta de tu analisis? Si deseas pasar al segundo modelo, escribe Fin.',
    {delay: 200},
    async (ctx, { flowDynamic, state, gotoFlow, fallBack }) => {
      capture = true
      const userMsg = ctx.body;
      console.log("hola") 
      console.log(ctx.body) 
      console.log(state.getMyState())
      // Verificar si el usuario quiere terminar la fase 1
      if (userMsg.toLowerCase() === 'fin') {
        
        // Cambiar a fase 2: iniciar flujo del segundo modelo
        return gotoFlow(ConeFlow);  // saltar al flujo del modelo 2:contentReference[oaicite:7]{index=7}
      }
      // Si no es "fin", entonces es otro mensaje para el modelo 1.
      // Recuperar historial actual y agregar el nuevo mensaje de usuario
      const currState = state.getMyState();
      history1 = currState.history1;
      if (userMsg.toLowerCase() !== 'fin' || userMsg.toLowerCase !== 'cancelar' || userMsg.toLowerCase !== 'no') {
        history1.push({ role: 'user', content: userMsg });
        
        // Llamar a GPT-4 nuevamente con el historial actualizado
        let reply;
        try {
            reply = await callGPT(history1);
        } catch (error) {
            console.error('Error en llamada GPT-4:', error);
            reply = "Error consultando el modelo en fase 1.";
        }
        // Agregar respuesta del asistente al historial
        history1.push({ role: 'assistant', content: reply });
        await state.update({ history1 });  // actualizar historial en el estado
        
        // Enviar respuesta al usuario
        await flowDynamic(reply);
        await state.update({ 
            history1: [
              { role: 'user', content: userMsg

               },
              { role: 'assistant', content: reply }
            ] 
          });
          return fallBack( '¿Tienes otra pregunta o mensaje para Modelo 1? Si deseas pasar al segundo modelo, escribe *Modelo 2*.')
    } else {
      return gotoFlow(ConeFlow)
    }
      // Volver a esperar la siguiente entrada del usuario en el mismo flujo (recursivamente).
      // Al no llamar endFlow ni cambiar de flujo aquí, seguimos en flowModelo1, 
      // por lo que el usuario puede enviar otro mensaje y volverá a ejecutar este mismo callback.
    }

  );

  const ConeFlow = addKeyword(['CONO']).addAnswer( "Haz tu consulta",
    { delay: 200}, 
    async (ctx, { flowDynamic, state, fallBack, gotoFlow }) => {
      history1 = [];
      const userInput = "";
      if (alianzasClave === undefined || ubicacion === undefined || descripcionProyecto === undefined || modeloVentas === undefined || caracteristicasProducto === undefined || alcanceProyecto === undefined){
          userInput = ctx.body;
      }
      else{
          userInput = JSON.stringify({
          descripcionProyecto: descripcionProyecto,
          ubicacion: ubicacion,
          modelo: modeloVentas,
          carcateristicas: caracteristicasProducto,
          alcance: alcanceProyecto,
          alianzas: alianzasClave,
          pestel: history1.toString(),
      });
    }
      const userId = ctx.from;                  // identificador del usuario (teléfono)
      
      // Inicializar el estado para este usuario (historial vacío y fase 1 activa)
      await state.update({ history1: [], history2: [], phase: 1 });
      
      // Preparar mensajes para la solicitud inicial a GPT-4 (modelo1)
      const messages = [{ role: 'user', content: userInput },
        {role: "system", content: process.env.CONE_AGENT_DESC}
      ];

      let reply;
      try {
        reply = await callGPT(messages);
      } catch (error) {
        console.error('Error llamando a GPT-4:', error);
        reply = "Lo siento, hubo un error al consultar el modelo.";
      }
      
      // Guardar el intercambio en el historial de la conversación 1
      await state.update({ 
        history1: [
          { role: 'user', content: userInput }, 
          { role: 'assistant', content: reply }
        ] 
      });

      // Enviar la respuesta del modelo 1 al usuario
      await flowDynamic(reply);
      
      // **IMPORTANTE**: No terminamos el flujo aquí, queremos seguir en fase 1 hasta que usuario diga "fin".
      // Por lo tanto, continuamos esperando más mensajes del usuario en este mismo flujo (ver siguiente .addAnswer).
    }
  ).addAnswer('¿Tienes otra pregunta de tu analisis? Si deseas pasar al segundo modelo, escribe Fin.',
    {delay: 200, capture:true}, 
    async (ctx, { flowDynamic, state, gotoFlow, fallBack }) => {
      const userMsg = ctx.body;
      console.log("hola") 
      console.log(ctx.body) 
      console.log(state.getMyState())
      // Verificar si el usuario quiere terminar la fase 1
      if (userMsg.toLowerCase() === 'fin') {
        
        // Cambiar a fase 2: iniciar flujo del segundo modelo
        return gotoFlow(flowConsultas);  // saltar al flujo del modelo 2:contentReference[oaicite:7]{index=7}
      }
      // Si no es "fin", entonces es otro mensaje para el modelo 1.
      // Recuperar historial actual y agregar el nuevo mensaje de usuario
      const currState = state.getMyState();
      if (userMsg){
        history1.push({ role: 'user', content: userMsg });
        
        // Llamar a GPT-4 nuevamente con el historial actualizado
        let reply;
        try {
            reply = await callGPT(history1);
        } catch (error) {
            console.error('Error en llamada GPT-4:', error);
            reply = "Error consultando el modelo en fase 1.";
        }
        // Agregar respuesta del asistente al historial
        history1.push({ role: 'assistant', content: reply });
        await state.update({ history1 });  // actualizar historial en el estado
        
        // Enviar respuesta al usuario
        await flowDynamic(reply);
        await state.update({ 
            history1: [
              { role: 'user', content: userMsg
               }, 
              { role: 'assistant', content: reply }
            ] 
          });
          return fallBack( '¿Tienes otra pregunta o mensaje para Modelo 1? Si deseas pasar al segundo modelo, escribe *Modelo 2*.')
    } else {
      return gotoFlow(ruedaFlow)
    }


      // Volver a esperar la siguiente entrada del usuario en el mismo flujo (recursivamente).
      // Al no llamar endFlow ni cambiar de flujo aquí, seguimos en flowModelo1, 
      // por lo que el usuario puede enviar otro mensaje y volverá a ejecutar este mismo callback.
    }

  );
  const ruedaFlow = addKeyword(['RUEDA']).addAnswer( "Haz tu consulta",
    { delay: 200}, 
    async (ctx, { flowDynamic, state, fallBack, gotoFlow }) => {
      const userInput = "";
     if (history1.length < 0) {
        userInput = JSON.stringify({
          descripcionProyecto: descripcionProyecto,
          ubicacion: ubicacion,
          modelo: modeloVentas,
          carcateristicas: caracteristicasProducto,
          alcance: alcanceProyecto,
          alianzas: alianzasClave,
      });
    } else {
      userInput = ctx.body;  // Capturamos el mensaje del usuario
    }
      const userId = ctx.from;                  // identificador del usuario (teléfono)
      
      // Inicializar el estado para este usuario (historial vacío y fase 1 activa)
      await state.update({ history1: [], history2: [], phase: 1 });
      
      // Preparar mensajes para la solicitud inicial a GPT-4 (modelo1)
      const messages = [
        { role: 'user', content: userInput },
        {role: "system", content: process.env.RUEDA_AGENT_DESC}
      ];

      let reply;
      try {
        reply = await callGPT(messages);
      } catch (error) {
        console.error('Error llamando a GPT-4:', error);
        reply = "Lo siento, hubo un error al consultar el modelo.";
      }
      
      // Guardar el intercambio en el historial de la conversación 1
      await state.update({ 
        history1: [
          { role: 'user', content: userInput }, 
          { role: 'assistant', content: reply }
        ] 
      });

      // Enviar la respuesta del modelo 1 al usuario
      await flowDynamic(reply);
      
      // **IMPORTANTE**: No terminamos el flujo aquí, queremos seguir en fase 1 hasta que usuario diga "fin".
      // Por lo tanto, continuamos esperando más mensajes del usuario en este mismo flujo (ver siguiente .addAnswer).
    }
  ).addAnswer('¿Tienes otra pregunta de tu analisis? Si deseas pasar al segundo modelo, escribe Fin.',
    {delay: 200},
    async (ctx, { flowDynamic, state, gotoFlow, fallBack }) => {
      capture = true
      const userMsg = ctx.body;
      console.log("hola") 
      console.log(ctx.body) 
      console.log(state.getMyState())
      // Verificar si el usuario quiere terminar la fase 1
      if (userMsg.toLowerCase() === 'fin') {
        
        // Cambiar a fase 2: iniciar flujo del segundo modelo
        return gotoFlow(menuFlow);  // saltar al flujo del modelo 2:contentReference[oaicite:7]{index=7}
      }
      // Si no es "fin", entonces es otro mensaje para el modelo 1.
      // Recuperar historial actual y agregar el nuevo mensaje de usuario
      const currState = state.getMyState();
      history1 = currState.history1;
      if (userMsg.toLowerCase() !== 'fin' || userMsg.toLowerCase !== 'cancelar' || userMsg.toLowerCase !== 'no') {
        history1.push({ role: 'user', content: userMsg });
        
        // Llamar a GPT-4 nuevamente con el historial actualizado
        let reply;
        try {
            reply = await callGPT(history1);
        } catch (error) {
            console.error('Error en llamada GPT-4:', error);
            reply = "Error consultando el modelo en fase 1.";
        }
        // Agregar respuesta del asistente al historial
        history1.push({ role: 'assistant', content: reply });
        await state.update({ history1 });  // actualizar historial en el estado
        
        // Enviar respuesta al usuario
        await flowDynamic(reply);
        await state.update({ 
            history1: [
              { role: 'user', content: userMsg},
              { role: 'assistant', content: reply }
            ] 
          });
          return fallBack( '¿Tienes otra pregunta o mensaje para Modelo 1? Si deseas pasar al segundo modelo, escribe *Modelo 2*.')
    }
    else {
      return gotoFlow(backcastingFlow)
    }
      // Volver a esperar la siguiente entrada del usuario en el mismo flujo (recursivamente).
      // Al no llamar endFlow ni cambiar de flujo aquí, seguimos en flowModelo1, 
      // por lo que el usuario puede enviar otro mensaje y volverá a ejecutar este mismo callback.
    }

  );

  const backcastingFlow = addKeyword(['PESTEL']).addAnswer( "Haz tu consulta",
    { delay: 200}, 
    async (ctx, { flowDynamic, state, fallBack, gotoFlow }) => {
      const userInput = "";
     if (history1.length < 0) {
        userInput = JSON.stringify({
          descripcionProyecto: descripcionProyecto,
          ubicacion: ubicacion,
          modelo: modeloVentas,
          carcateristicas: caracteristicasProducto,
          alcance: alcanceProyecto,
          alianzas: alianzasClave,
      });
    } else {
      userInput = ctx.body;  // Capturamos el mensaje del usuario
    }
      const userId = ctx.from;                  // identificador del usuario (teléfono)
      
      // Inicializar el estado para este usuario (historial vacío y fase 1 activa)
      await state.update({ history1: [], history2: [], phase: 1 });
      
      // Preparar mensajes para la solicitud inicial a GPT-4 (modelo1)
      const messages = [{ role: 'user', content: userInput },
        {role: "system", content: process.env.BACKCASTING_AGENT_DESC}
      ];

      let reply;
      try {
        reply = await callGPT(messages);
      } catch (error) {
        console.error('Error llamando a GPT-4:', error);
        reply = "Lo siento, hubo un error al consultar el modelo.";
      }
      
      // Guardar el intercambio en el historial de la conversación 1
      await state.update({ 
        history1: [
          { role: 'user', content: userInput }, 
          { role: 'assistant', content: reply }
        ] 
      });

      // Enviar la respuesta del modelo 1 al usuario
      await flowDynamic(reply);
      
      // **IMPORTANTE**: No terminamos el flujo aquí, queremos seguir en fase 1 hasta que usuario diga "fin".
      // Por lo tanto, continuamos esperando más mensajes del usuario en este mismo flujo (ver siguiente .addAnswer).
    }
  ).addAnswer('¿Tienes otra pregunta de tu analisis? Si deseas pasar al segundo modelo, escribe Fin.',
    {delay: 200},
    async (ctx, { flowDynamic, state, gotoFlow, fallBack }) => {
      capture = true
      const userMsg = ctx.body;
      console.log("hola") 
      console.log(ctx.body) 
      console.log(state.getMyState())
      // Verificar si el usuario quiere terminar la fase 1
      if (userMsg.toLowerCase() === 'fin') {
        
        // Cambiar a fase 2: iniciar flujo del segundo modelo
        return gotoFlow(flowModelo2);  // saltar al flujo del modelo 2:contentReference[oaicite:7]{index=7}
      }
      // Si no es "fin", entonces es otro mensaje para el modelo 1.
      // Recuperar historial actual y agregar el nuevo mensaje de usuario
      const currState = state.getMyState();
      history1 = currState.history1;
      if (userMsg.toLowerCase() !== 'fin' || userMsg.toLowerCase !== 'cancelar' || userMsg.toLowerCase !== 'no') {
        history1.push({ role: 'user', content: userMsg });
        
        // Llamar a GPT-4 nuevamente con el historial actualizado
        let reply;
        try {
            reply = await callGPT(history1);
        } catch (error) {
            console.error('Error en llamada GPT-4:', error);
            reply = "Error consultando el modelo en fase 1.";
        }
        // Agregar respuesta del asistente al historial
        history1.push({ role: 'assistant', content: reply });
        await state.update({ history1 });  // actualizar historial en el estado
        
        // Enviar respuesta al usuario
        await flowDynamic(reply);
        await state.update({ 
            history1: [
              { role: 'user', content: userMsg

               },
              { role: 'assistant', content: reply }
            ] 
          });
          return fallBack( '¿Tienes otra pregunta o mensaje para Modelo 1? Si deseas pasar al segundo modelo, escribe *Modelo 2*.')
    }
      // Volver a esperar la siguiente entrada del usuario en el mismo flujo (recursivamente).
      // Al no llamar endFlow ni cambiar de flujo aquí, seguimos en flowModelo1, 
      // por lo que el usuario puede enviar otro mensaje y volverá a ejecutar este mismo callback.
    }

  );  

// Flow para capturar los datos del análisis PESTEL
const dataFlow = addKeyword(['PESTEL', 'análisis PESTEL']).addAnswer(['¡Hola! Para realizar el análisis PESTEL, necesito la siguiente información de tu proyecto:','1. Descripción del proyecto'],{ capture: true},
    async (ctx, { flowDynamic, endFlow }) => {
      if (ctx.body === '❌ Cancelar') {
        return endFlow({
          body: '❌ Solicitud cancelada.'
        });
      }
      descripcionProyecto = ctx.body;
      return await flowDynamic(`Descripción recibida ✅\nAhora, por favor indica la *Ubicación* de tu proyecto:`);
    }
  )
  .addAnswer(
    ['Ubicación:'],
    { capture: true},
    async (ctx, { flowDynamic, endFlow }) => {
      if (ctx.body === '❌ Cancelar') {
        return endFlow({
          body: '❌ Solicitud cancelada.'
        });
      }
      ubicacion = ctx.body;
      return await flowDynamic(`Ubicación recibida ✅\nAhora, por favor indica tu *Modelo de ventas*:`);
    }
  )
  .addAnswer(
    ['Modelo de ventas:'],
    { capture: true },
    async (ctx, { flowDynamic, endFlow }) => {
      if (ctx.body === '❌ Cancelar') {
        return endFlow({
          body: '❌ Solicitud cancelada.'
        });
      }
      modeloVentas = ctx.body;
      return await flowDynamic(`Modelo de ventas recibido ✅\nAhora, por favor describe las *Características del producto*:`);
    }
  )
  .addAnswer(
    ['Características del producto:'],
    { capture: true },
    async (ctx, { flowDynamic, endFlow }) => {
      if (ctx.body === '❌ Cancelar') {
        return endFlow({
          body: '❌ Solicitud cancelada.'
        });
      }
      caracteristicasProducto = ctx.body;
      return await flowDynamic(`Características recibidas ✅\nAhora, por favor indica el *Alcance del proyecto*:`);
    }
  )
  .addAnswer(
    ['Alcance del proyecto:'],
    { capture: true},
    async (ctx, { flowDynamic, endFlow }) => {
      if (ctx.body === '❌ Cancelar') {
        return endFlow({
          body: '❌ Solicitud cancelada.'
        });
      }
      alcanceProyecto = ctx.body;
      return await flowDynamic(`Alcance recibido ✅\nPor último, indica las *Alianzas clave* de tu proyecto:`);
    }
  )
  .addAnswer(
    ['Alianzas clave:'],
    { capture: true},
    async (ctx, { flowDynamic, endFlow, gotoFlow, state }) => {
        if (ctx.body === '❌ Cancelar') {
            return endFlow({
              body: '❌ Solicitud cancelada.'
            });
          }
      alianzasClave = ctx.body;
      return await flowDynamic(`Alcalianzas recibidas ✅`);
      }
    )
.addAnswer("datos recibidos",null, 
  async (ctx, {flowDynamic, state})=> {
      // Guardar todos los datos en el estado para usarlo en otro flow
       
       await state.update({
        pestelData: {
          descripcionProyecto,
          ubicacion,
          modeloVentas,
          caracteristicasProducto,
          alcanceProyecto,
          alianzasClave,
        }
      })
      

      // Confirmación al usuario
      
      return await flowDynamic(["¡Perfecto! He registrado toda la información:"]);
        // Esperar 1 segundo antes de enviar la confirmación
  }
) // Redirigir al flujo del modelo 1 después de capturar los datos
.addAnswer("los datos correctos?", {capture: true},
   async (ctx, { flowDynamic, gotoFlow, state }) => {
    // si no son correctos cancela el flujo
    
    if (ctx.body.toLowerCase() === 'no' || ctx.body.toLowerCase() === 'cancelar') {
      console.log("ctx.body", ctx.body)
      return gotoFlow(menuFlow); // Volver al flujo de captura de datos
    }
    else 
      console.log("ctx.body", ctx.body)
      return(gotoFlow(pestelFlow))
  });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY  });
// Función auxiliar para llamar al modelo GPT-4 con un array de mensajes (historial + nuevo mensaje)
async function callGPT(messages) {
  //console.log("Llamando a GPT-4 con mensajes:", messages);
  const response = await openai.chat.completions.create({
    model: "gpt-4",       // Usamos GPT-4 como solicitado
    messages: messages    // Array de {role, content} incluyendo historial y pregunta actual
    // Puedes ajustar otros parámetros como max_tokens, temperature, etc., si es necesario
  });
  // Devolver el contenido de la respuesta del asistente
  return response.choices[0].message.content;
}


const menuPath = path.join(__dirname, "mensajes", "menu.txt")
const menu = fs.readFileSync(menuPath, "utf8")

const pathConsultas = path.join(__dirname, "mensajes", "promptConsultas.txt")
const promptConsultas = fs.readFileSync(pathConsultas, "utf8")


const flowConsultas = addKeyword(EVENTS.ACTION).addAnswer('Este es el flow consultas').addAnswer("Hace tu consulta", {delay: 4000}, async (ctx, ctxFn) => {
        const prompt = promptConsultas
        const consulta = ctx.body
        const answer = await chat(prompt, consulta)
        console.log(answer)
        await ctxFn.flowDynamic(answer.content)
    })


const menuFlow = addKeyword(EVENTS.WELCOME).addAnswer(
    menu,
    { capture: true },
    async (ctx, { gotoFlow, fallBack, flowDynamic }) => {
        if (!["1", "2", "3", "4", "0"].includes(ctx.body)) {
            return fallBack(
                "Respuesta no válida, por favor selecciona una de las opciones."
            );
        }
        switch (ctx.body) {
            case "1":
                return gotoFlow(dataFlow);
            case "2":
                return gotoFlow(ConeFlow);
            case "3":
                return gotoFlow(ruedaFlow);
            case "4":
                return gotoFlow(backcastingFlow);
            case "0":
                return await flowDynamic(
                    "Saliendo... Puedes volver a acceder a este menú escribiendo '*Menu*'"
                );
        }
    }
);

const main = async () => {
    const adapterDB = new MongoAdapter({
        dbUri: process.env.MONGO_DB_URI,
        dbName: "YoutubeTest"
    })
    const adapterFlow = createFlow([ menuFlow, , ConeFlow, dataFlow, pestelFlow, ruedaFlow, backcastingFlow, flowConsultas])
    const adapterProvider = createProvider(BaileysProvider)

    createBot({
        flow: adapterFlow,
        provider: adapterProvider,
        database: adapterDB,

    })

    QRPortalWeb()
}

main()

