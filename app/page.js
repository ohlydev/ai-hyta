'use client';

import { useState, useRef, useEffect, useMemo } from "react";
import Image from 'next/image';

export default function Chatbot() {
  const messagesEndRef = useRef(null);
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'a quanto tempo eu nao te vejo, como posso te ajudar?',
    }
  ]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Online'); // Default status

  // Messages to display randomly, using useMemo to ensure consistency
  const randomMessages = useMemo(() => [
    "Eu estou te observando a muito tempo...",
    "para de me olhar sem vergonha :)",
    "eu to com fome..."
  ], []);

  useEffect(() => {
    let randomMessageTimeout;

    // Only show random messages if the bot is not currently generating a response
    if (!isLoading) {
      // Set a timeout to show a random message occasionally
      randomMessageTimeout = setTimeout(() => {
        const randomIndex = Math.floor(Math.random() * randomMessages.length);
        setStatusMessage(randomMessages[randomIndex]);

        // Hide the random message after 2 seconds
        setTimeout(() => {
          setStatusMessage('Online');
        }, 2000);
      }, Math.random() * 10000 + 1000); // Randomly show a message every 5-15 seconds
    }

    return () => {
      clearTimeout(randomMessageTimeout);
    };
  }, [isLoading, randomMessages]); // Dependency on isLoading and randomMessages

  // Function to send a message to the chatbot API
  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    // Clear the input immediately after sending
    setMessage('');
    setIsLoading(true);
    setStatusMessage('digitando...'); // Show "typing..." when bot is generating a response

    // Add user message to the chat
    const userMessage = { role: 'user', content: message };
    setMessages((prevMessages) => [...prevMessages, userMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: [...messages, userMessage] }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = { role: 'assistant', content: '' };

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const text = decoder.decode(value, { stream: true });

        // Append new text to the assistant's message content
        assistantMessage.content += text;

        // Update the messages state only with the last message added
        setMessages((prevMessages) => {
          const updatedMessages = [...prevMessages];
          // Check if the last message is from the assistant and not complete
          if (
            updatedMessages[updatedMessages.length - 1]?.role === 'assistant'
          ) {
            updatedMessages[updatedMessages.length - 1].content = assistantMessage.content;
          } else {
            updatedMessages.push(assistantMessage);
          }
          return updatedMessages;
        });
      }
    } catch (error) {
      console.error('Error:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { role: 'assistant', content: "There was an error. Please try again later." },
      ]);
    }

    setIsLoading(false);
    setStatusMessage('Online'); // Reset status to 'Online' after response is generated
  };

  const handleKeyPress = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-black ">
      <div className="flex flex-col w-full max-w-lg h-screen bg-gray-900 rounded-lg shadow-lg">
        {/* Header with Image, Name, and Status Message */}
        <div className="flex items-center p-3 bg-gray-800">
          <Image
            src="/profile.jpg" // Correct path to the image in the public folder
            alt="Chatbot"
            width={40}
            height={40}
            className="rounded-full mr-2"
          />
          <div className="flex flex-col">
            <span className="text-white text-lg font-bold">Hytallo</span>
            <span className="text-sm text-gray-400">{statusMessage}</span>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-grow p-2 sm:p-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900">
          <div className="flex flex-col space-y-2">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${
                  message.role === 'assistant' ? 'justify-start' : 'justify-end'
                }`}
              >
                <div
                  className={`max-w-xs p-2 sm:p-3 rounded-lg transition-transform transform ${
                    message.role === 'assistant'
                      ? 'bg-gray-800 text-white' // Bot message
                      : 'bg-gray-600 text-white' // User message
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input and Send Button */}
        <div className="flex items-center p-2 sm:p-4 border-t border-gray-700 bg-gray-900">
          <input
            type="text"
            className="flex-grow p-2 border rounded-l focus:outline-none focus:ring-2 focus:ring-gray-500 text-white bg-gray-800 border-gray-700"
            placeholder="me pergunte alguma coisa..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
          />
          <button
            className="p-2 bg-gray-700 text-white rounded-r hover:bg-gray-600 disabled:opacity-50"
            onClick={sendMessage}
            disabled={isLoading}
          >
            {isLoading ? '...' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  );
}
