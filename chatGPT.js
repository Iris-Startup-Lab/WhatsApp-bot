// Cargar configuración y SDK de OpenAI
require('dotenv').config();
const { Configuration, OpenAI } = require("openai");
const chat = async (promt, text) =>{
    // Inicializar OpenAI API con la clave
    try{
        
        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY  }); // Asegúrate de tener esta variable en .env
 
        console.log("llego")
        // Función auxiliar para llamar al modelo GPT-4 con un array de mensajes (historial + nuevo mensaje)
        
        const response =  await openai.chat.completions.create({
            model: "gpt-4",       // Usamos GPT-4 como solicitado
            messages: [
                {role:"system", content: promt},
                {role:"user", content: text}
            ]    // Array de {role, content} incluyendo historial y pregunta actual
            // Puedes ajustar otros parámetros como max_tokens, temperature, etc., si es necesario
        });
        // Devolver el contenido de la respuesta del asistente

        return response.choices[0].message;
        } catch(err){
            console.error("ha habido un error", err)
            return "ERRROR"
        }

}
module.exports = chat;