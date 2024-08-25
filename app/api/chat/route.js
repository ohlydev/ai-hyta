// app/api/chat/route.js

import { NextResponse } from "next/server";
import ChatbotService from "../../../utils/ChatbotService"; // Ensure this path is correct

export async function POST(req) {
  console.log("Received POST request at /api/chat");

  const chatbotService = new ChatbotService(process.env.GROQ_API_KEY);

  try {
    const data = await req.json();
    console.log("Request JSON parsed successfully:", data);

    const userMessages = data.messages || [];
    console.log("User messages:", userMessages);

    const completionStream = await chatbotService.generateResponse(userMessages);
    console.log("Received completion stream from Groq");

    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of completionStream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              console.log("Received content chunk:", content); // Log each chunk of content
              const text = encoder.encode(content);
              controller.enqueue(text);
            }
          }
        } catch (error) {
          console.error("Error streaming chatbot response:", error);
          controller.error(error);
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream);
  } catch (error) {
    console.error("Error generating response from Groq:", error);
    return new NextResponse("Error generating response from Groq", { status: 500 });
  }
}
