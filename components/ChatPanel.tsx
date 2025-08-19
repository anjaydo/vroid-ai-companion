import Message from "@/interfaces/Message";
import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { IoSend } from "react-icons/io5";

const ChatPanel = ({
  messages,
  onNewMessage,
  isThinking,
}: {
  messages: Message[];
  onNewMessage: (text: string) => void;
  isThinking: boolean;
}) => {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isThinking) return;
    onNewMessage(input);
    setInput("");
  };

  return (
    <div className="w-full h-full bg-gray-900/80 backdrop-blur-sm rounded-lg shadow-lg flex flex-col p-4">
      <div className="flex-1 overflow-y-auto pr-2">
        {messages?.map((msg, index) => (
          <div
            key={`msg-${index}-${msg.role}-${msg?.id || ""}`}
            className={`flex ${
              msg.role === "user" ? "justify-end" : "justify-start"
            } mb-3`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-2xl text-sm ${
                msg.role === "user"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-700 text-gray-200"
              }`}
            >
              <ReactMarkdown
                components={{
                  img: ({ node, ...props }) => (
                    <img {...props} className="w-full h-auto" />
                  ),
                }}
              >
                {msg.parts[0].text}
              </ReactMarkdown>
            </div>
          </div>
        ))}
        {isThinking && (
          <div className="flex justify-start mb-3">
            <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-2xl bg-gray-700 text-gray-200">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="mt-4 flex items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập tin nhắn..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-full py-2 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          disabled={isThinking || !input.trim()}
          className="ml-3 bg-blue-600 text-white rounded-full p-3 hover:bg-blue-700 disabled:text-gray-200 disabled:bg-gray-500 disabled:opacity-80 disabled:cursor-not-allowed transition-colors duration-300"
        >
          <span className="sr-only">Send</span>
          <IoSend className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
};

export default ChatPanel;
