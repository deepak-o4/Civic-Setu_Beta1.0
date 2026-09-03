import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Bot, User, Sparkles, Copy, Check, 
  ChevronDown, ChevronUp, AlertCircle, Compass, 
  HelpCircle, MessageSquare, Terminal, RefreshCw 
} from 'lucide-react';
import { queryRAG } from '../services/api';
import { toast } from 'react-hot-toast';

const QUICK_PROMPTS = [
  { text: "How should I deal with flooding?", label: "Flooding Guidelines" },
  { text: "What to do in a severe power outage?", label: "Power Outage" },
  { text: "First-aid for road collapse hazards", label: "Road Collapse" },
  { text: "Check status of ticket CS-2026-4839CC", label: "Check Status" }
];

const Chatbot = () => {
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      content: "Hello! I am your CivicSetu AI assistant. You can ask me any government service questions, how to deal with local emergencies, or query the status of a specific complaint by including its Ticket ID (e.g., 'status of CS-2026-4839CC'). How can I help you today?",
      timestamp: new Date(),
      sources: []
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedSources, setExpandedSources] = useState({});

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (textToSend) => {
    const queryText = textToSend || input;
    if (!queryText.trim()) return;

    if (!textToSend) {
      setInput('');
    }

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;

    // Append user message
    setMessages(prev => [
      ...prev,
      {
        id: userMessageId,
        role: 'user',
        content: queryText,
        timestamp: new Date()
      }
    ]);

    setIsLoading(true);

    try {
      const responseData = await queryRAG(queryText);
      
      setMessages(prev => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: responseData.answer || "No response received.",
          sources: responseData.sources || [],
          timestamp: new Date()
        }
      ]);
    } catch (error) {
      console.error("Chatbot query error:", error);
      toast.error(error.message || "Failed to fetch response.");
      
      setMessages(prev => [
        ...prev,
        {
          id: assistantMessageId,
          role: 'assistant',
          content: "Sorry, I encountered an error while processing your request. Please ensure the server is running and try again.",
          sources: [],
          isError: true,
          timestamp: new Date()
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSources = (id) => {
    setExpandedSources(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const formatMessageText = (text) => {
    return text.split('\n').map((line, i) => {
      // Bold markdown formatting
      let formattedLine = line;
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;

      while ((match = boldRegex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="font-semibold text-ink">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }

      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      return (
        <span key={i} className="block min-h-[1.2rem]">
          {parts.length > 0 ? parts : line}
        </span>
      );
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] max-w-5xl mx-auto bg-white rounded-2xl border border-ink/5 shadow-xl shadow-ink/5 overflow-hidden">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-ink/5 bg-background/50 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-ink flex items-center justify-center shadow-md shadow-accent/20 text-accent relative">
            <Bot className="w-5.5 h-5.5" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold text-ink flex items-center gap-1.5">
              CivicSetu Assistant
              <span className="px-2 py-0.5 text-[10px] font-medium bg-accent/15 text-primary-800 rounded-full border border-accent/30">RAG AI</span>
            </h1>
            <p className="text-[11px] text-muted">Retrieves context from historical complaint records</p>
          </div>
        </div>
        <button 
          onClick={() => {
            setMessages([
              {
                id: 'welcome',
                role: 'assistant',
                content: "Hello! I am your CivicSetu AI assistant. You can ask me any government service questions, how to deal with local emergencies, or query the status of a specific complaint by including its Ticket ID. How can I help you today?",
                timestamp: new Date(),
                sources: []
              }
            ]);
            toast.success("Chat history reset!");
          }}
          className="p-2 text-muted/70 hover:text-primary-700 hover:bg-primary-50 rounded-xl transition-all duration-200"
          title="Reset Conversation"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 bg-background/30">
        <AnimatePresence initial={false}>
          {messages.map((message) => {
            const isUser = message.role === 'user';
            return (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className={`flex gap-3 max-w-[85%] ${isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                {/* Avatar */}
                <div className={`w-8.5 h-8.5 rounded-lg flex items-center justify-center shrink-0 shadow-sm ${
                  isUser 
                    ? 'bg-ink/10 text-muted' 
                    : message.isError 
                      ? 'bg-red-50 text-red-500 border border-red-100' 
                      : 'bg-primary-50 text-primary-700 border border-primary-100'
                }`}>
                  {isUser ? <User className="w-4.5 h-4.5" /> : <Bot className="w-4.5 h-4.5" />}
                </div>

                {/* Bubble Wrapper */}
                <div className="space-y-1.5">
                  {/* Bubble Container */}
                  <div className={`relative group px-4 py-3 rounded-2xl shadow-sm border ${
                    isUser 
                      ? 'bg-ink text-accent border-transparent rounded-tr-none' 
                      : message.isError 
                        ? 'bg-red-50/50 border-red-100 text-red-700 rounded-tl-none'
                        : 'bg-white border-ink/5 text-ink rounded-tl-none'
                  }`}>
                    {/* Copy button */}
                    {!isUser && (
                      <button 
                        onClick={() => handleCopy(message.id, message.content)}
                        className="absolute right-2 top-2 p-1 text-muted/70 hover:text-primary-700 opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 hover:bg-background rounded-lg shadow-sm border border-ink/5"
                        title="Copy message"
                      >
                        {copiedId === message.id ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}

                    {/* Content */}
                    <div className="text-sm leading-relaxed space-y-1">
                      {isUser ? message.content : formatMessageText(message.content)}
                    </div>
                  </div>

                  {/* Sources Accordion */}
                  {!isUser && message.sources && message.sources.length > 0 && (
                    <div className="px-2">
                      <button 
                        onClick={() => toggleSources(message.id)}
                        className="flex items-center gap-1 text-[11px] font-medium text-muted hover:text-primary-700 transition-colors"
                      >
                        {expandedSources[message.id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        <span>Reference Contexts ({message.sources.length})</span>
                      </button>

                      <AnimatePresence>
                        {expandedSources[message.id] && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2 space-y-1.5 overflow-hidden"
                          >
                            {message.sources.map((src, index) => (
                              <div 
                                key={index} 
                                className="p-2.5 bg-ink/5 rounded-xl text-[11px] text-muted border border-ink/10 font-mono whitespace-pre-line"
                              >
                                {src}
                              </div>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

          {/* Typing Indicator */}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex gap-3 max-w-[85%] mr-auto"
            >
              <div className="w-8.5 h-8.5 rounded-lg bg-accent/15 text-primary-800 border border-accent/30 flex items-center justify-center shrink-0">
                <Bot className="w-4.5 h-4.5" />
              </div>
              <div className="px-4 py-3 bg-white border border-ink/5 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-1.5">
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-primary-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Prompts Panel */}
      {messages.length === 1 && !isLoading && (
        <div className="px-6 py-4 bg-background/30 border-t border-ink/5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-muted mb-2">
            <Compass className="w-3.5 h-3.5 text-primary-600" />
            <span>Try asking about:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {QUICK_PROMPTS.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(prompt.text)}
                className="px-3 py-1.5 text-xs text-muted bg-white hover:bg-primary-50 hover:text-primary-700 rounded-full border border-ink/10 hover:border-primary-200 transition-all duration-200 shadow-sm cursor-pointer hover:shadow"
              >
                {prompt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input panel */}
      <div className="p-4 border-t border-ink/5 bg-white">
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2 p-1.5 bg-background hover:bg-ink/5 focus-within:bg-white focus-within:ring-2 focus-within:ring-accent/50 focus-within:border-accent rounded-xl border border-ink/10 transition-all duration-200"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            placeholder="Type your message or ask about a ticket status (e.g. CS-2026-4839CC)..."
            className="flex-1 bg-transparent px-3 py-2 text-sm text-ink placeholder-muted/70 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="bg-accent hover:bg-accent-dark active:scale-95 text-ink p-2.5 rounded-full disabled:opacity-40 disabled:hover:bg-accent disabled:scale-100 transition-all duration-200 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <p className="text-[10px] text-muted/70 text-center mt-2">
          AI assistant responses are generated based on historical resolution data and emergency procedures.
        </p>
      </div>
    </div>
  );
};

export default Chatbot;
