import { useState, useRef, useEffect } from 'react';
import { useResizable } from '@/hooks/useResizable';
import { Drawer, Button } from 'antd';
import {
  Sparkle24Filled,
  Send24Filled,
  Mic24Filled,
  Document24Filled,
  Person24Filled
} from '@fluentui/react-icons';
import { generateAgentResponse } from '@/services/assistant';
import { useMutation } from '@tanstack/react-query';
import { QUICK_ACTIONS } from '@/config/assistantConfig';

interface Message {
  id: number;
  type: 'user' | 'ai';
  content: string;
  timestamp: Date;
  actions?: string[];
  responseType?: string;
}

interface AIAssistantDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function AIAssistantDrawer({ open, onClose }: AIAssistantDrawerProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { width, isResizing, startResizing } = useResizable({
    initialWidth: 500,
    minWidth: 400,
    maxWidth: 800,
    direction: 'left',
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when drawer opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: async (text: string) => {
      // Prepare history for API
      const history = messages.map(m => ({
        role: m.type === 'user' ? 'user' : 'assistant' as "user" | "assistant",
        content: m.content
      }));

      return generateAgentResponse(text, history);
    },
    onSuccess: (data) => {
      const aiResponse: Message = {
        id: Date.now(),
        type: 'ai',
        content: data.answer || "I'm sorry, I couldn't process that.",
        timestamp: new Date(),
        // Parse actions/response type if backend returns structured data 
        // For now using simple text response as verified in services/assistant
      };
      setMessages(prev => [...prev, aiResponse]);
    },
    onError: () => {
      setMessages(prev => [...prev, {
        id: Date.now(),
        type: 'ai',
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date()
      }]);
    }
  });

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMsg: Message = {
      id: Date.now(),
      type: 'user',
      content: inputText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    sendMessage(inputText);
    setInputText("");
  };

  const handleQuickAction = (action: string) => {
    setInputText(action);
    inputRef.current?.focus();
    // Optional: auto-send
    // handleSend();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Drawer
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-[#ff3b3b] to-[#cc2f2f] rounded-full flex items-center justify-center shadow-lg">
            <Sparkle24Filled className="w-4 h-4 text-white fill-white" />
          </div>
          <span className="font-bold text-base">AI Assistant</span>
        </div>
      }
      placement="right"
      onClose={onClose}
      open={open}
      styles={{
        wrapper: { width: width },
        body: { padding: 0, display: 'flex', flexDirection: 'column' },
        header: { borderBottom: '1px solid #f0f0f0' }
      }}
    >
      {/* Resize Handle */}
      <div
        className={`absolute inset-y-0 left-0 w-1.5 hover:w-2 hover:bg-[#ff3b3b]/10 cursor-col-resize z-[1001] flex items-center justify-center transition-all group ${isResizing ? 'bg-[#ff3b3b]/5 w-2' : ''}`}
        onMouseDown={startResizing}
      >
        <div className={`h-8 w-0.5 rounded-full transition-colors ${isResizing ? 'bg-[#ff3b3b]' : 'bg-[#DDDDDD] group-hover:bg-[#ff3b3b]/50'}`} />
      </div>
      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 bg-[#F9FAFB] space-y-4 flex flex-col">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 opacity-70">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-sm">
              <Sparkle24Filled className="w-6 h-6 text-[#ff3b3b]" />
            </div>
            <div>
              <h3 className="font-bold text-[#111111]">How can I help?</h3>
              <p className="text-sm text-gray-500">Ask about tasks, schedule, or team status</p>
            </div>

            {/* Quick Actions (The "3 options") */}
            <div className="flex flex-wrap gap-2 justify-center mt-4">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.label}
                  size="small"
                  shape="round"
                  onClick={() => handleQuickAction(action.prompt)}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.type === 'ai' ? 'bg-white shadow-sm border border-gray-100' : 'bg-[#111111]'}`}>
                {msg.type === 'ai' ? <Sparkle24Filled className="w-4 h-4 text-[#ff3b3b]" /> : <Person24Filled className="w-4 h-4 text-white" />}
              </div>
              <div className={`flex flex-col max-w-[80%] ${msg.type === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`px-4 py-2 rounded-2xl ${msg.type === 'user' ? 'bg-[#111111] text-white rounded-tr-sm' : 'bg-white border border-gray-100 shadow-sm text-[#111111] rounded-tl-sm'}`}>
                  <p className="text-sm font-medium whitespace-pre-wrap">{msg.content}</p>
                </div>
                <span className="text-xs text-gray-400 mt-1 px-1">{formatTime(msg.timestamp)}</span>
              </div>
            </div>
          ))
        )}
        {isPending && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-white shadow-sm border border-gray-100 flex items-center justify-center">
              <Sparkle24Filled className="w-4 h-4 text-[#ff3b3b] animate-pulse" />
            </div>
            <div className="flex items-center gap-1 bg-white px-4 py-3 rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm h-10">
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
              <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex items-center gap-2 bg-[#F7F7F7] px-3 py-2 rounded-full border border-transparent focus-within:border-[#ff3b3b]/30 focus-within:bg-white focus-within:shadow-sm transition-all">
          <Sparkle24Filled className="w-5 h-5 text-[#ff3b3b]" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm placeholder:text-gray-400 focus:outline-none"
            placeholder="Ask anything..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          />
          <div className="flex items-center gap-1">
            <button className="p-1.5 hover:bg-black/5 rounded-full text-gray-500 transition-colors">
              <Mic24Filled className="w-5 h-5" />
            </button>
            <button className="p-1.5 hover:bg-black/5 rounded-full text-gray-500 transition-colors">
              <Document24Filled className="w-5 h-5" />
            </button>
            <button
              onClick={handleSend}
              disabled={!inputText.trim()}
              className={`p-1.5 rounded-full transition-all ${inputText.trim() ? 'bg-[#ff3b3b] text-white hover:bg-[#ff1f1f] shadow-sm' : 'bg-gray-200 text-gray-400'}`}
            >
              <Send24Filled className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </Drawer>
  );
}
