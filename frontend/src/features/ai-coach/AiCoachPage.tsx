import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Loader2, Sparkles, User } from 'lucide-react';
import { aiApi } from '../../api/endpoints';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

const welcomeMessage: Message = {
  id: '0',
  role: 'assistant',
  content: `Hi! I'm your **AI Money Coach** 🤖💰\n\nI can help you with:\n• Monthly budget planning\n• Savings recommendations\n• Expense analysis\n• Beginner investment tips\n• Overspending alerts\n\nTell me about your monthly income and spending, or ask me anything about managing your finances!`,
  timestamp: new Date().toISOString(),
};

export default function AiCoachPage() {
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const textToSend = input.trim();
    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await aiApi.chat(textToSend);
      const reply = res.data.data?.reply || 'I processed your query, but received an empty response.';
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: reply,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiResponse]);
    } catch (err) {
      console.error('AI chat failed:', err);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I am having trouble connecting to my servers. Please try again in a few moments.',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      {/* Header */}
      <div className="glass-card p-4 mb-4 flex items-center gap-3 page-section">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-primary-500 flex items-center justify-center">
          <Bot className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="font-display font-semibold text-white">AI Money Coach</h2>
          <p className="text-xs text-surface-400">Powered by AI • 10 free queries/day</p>
        </div>
        <div className="ml-auto badge-accent">
          <Sparkles className="w-3 h-3 mr-1" /> AI
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center ${msg.role === 'assistant' ? 'bg-purple-500/20' : 'bg-primary-500/20'}`}>
              {msg.role === 'assistant' ? <Bot className="w-4 h-4 text-purple-400" /> : <User className="w-4 h-4 text-primary-400" />}
            </div>
            <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${msg.role === 'assistant' ? 'glass-card text-surface-200' : 'bg-primary-600 text-white rounded-tr-sm'}`}>
              {msg.content.split('\n').map((line, i) => (
                <p key={i} className={i > 0 ? 'mt-1' : ''}>
                  {line.replace(/\*\*(.*?)\*\*/g, '$1')}
                </p>
              ))}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-purple-400" />
            </div>
            <div className="glass-card p-4 rounded-2xl">
              <div className="flex items-center gap-2 text-surface-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Thinking...
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4 glass-card p-3 flex items-center gap-3 page-section">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Ask about budgeting, saving, investing..."
          className="flex-1 bg-transparent text-white placeholder-surface-500 text-sm focus:outline-none px-2"
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          className="p-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white transition-colors disabled:opacity-50"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
