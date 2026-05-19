// pages/Assistant.jsx
import React, { useState, useRef, useEffect } from 'react';
import { sendChatMessage } from '../services/api.js';
import { useToast } from '../context/ToastContext.jsx';

export default function Assistant() {
  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hello! I am your AI Personal Energy Analyst. How can I help you optimize your electricity usage today?' }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isChatting, setIsChatting] = useState(false);
  const chatEndRef = useRef(null);
  const { addToast } = useToast();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isChatting]);

  const handleSendMessage = async (msg = inputMessage) => {
    const text = msg.trim();
    if (!text) return;

    setChatMessages(prev => [...prev, { role: 'user', content: text }]);
    setInputMessage('');
    setIsChatting(true);

    try {
      const response = await sendChatMessage(text);
      setChatMessages(prev => [...prev, { role: 'assistant', content: response.reply }]);
    } catch (error) {
      addToast('Failed to send message', 'error');
    } finally {
      setIsChatting(false);
    }
  };

  const parseMessageContent = (text, role) => {
    if (!text) return null;
    return text.split('\n').map((line, index) => {
      let content = line.trim();
      if (!content) return <div key={index} className="h-2" />;

      let isBullet = false;
      if (content.startsWith('•') || content.startsWith('-') || content.startsWith('*')) {
        isBullet = true;
        content = content.replace(/^[•\-*]\s*/, '');
      }

      // Check headings
      if (content.startsWith('###')) {
        return (
          <h4 key={index} className={`text-sm font-semibold mt-4 mb-2 uppercase tracking-wider ${role === 'user' ? 'text-white' : 'text-[var(--accent)]'}`}>
            {content.replace(/^###+\s*/, '')}
          </h4>
        );
      }
      if (content.startsWith('##')) {
        return (
          <h3 key={index} className={`text-base font-bold mt-4 mb-2 border-b border-[var(--border)] pb-1 ${role === 'user' ? 'text-white' : 'text-[var(--text)]'}`}>
            {content.replace(/^##+\s*/, '')}
          </h3>
        );
      }
      if (content.startsWith('#')) {
        return (
          <h2 key={index} className={`text-lg font-bold mt-5 mb-2 ${role === 'user' ? 'text-white' : 'text-[var(--text)]'}`}>
            {content.replace(/^#+\s*/, '')}
          </h2>
        );
      }

      // Parse bold text **text**
      const parts = [];
      const regex = /\*\*(.*?)\*\*/g;
      let match;
      let lastIndex = 0;
      while ((match = regex.exec(content)) !== null) {
        if (match.index > lastIndex) {
          parts.push(content.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className={`font-bold ${role === 'user' ? 'text-white' : 'text-[var(--text)]'}`}>{match[1]}</strong>);
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < content.length) {
        parts.push(content.substring(lastIndex));
      }

      const displayContent = parts.length > 0 ? parts : content;

      if (isBullet) {
        return (
          <div key={index} className="flex items-start gap-2 my-1 pl-3">
            <span className={`${role === 'user' ? 'text-white' : 'text-[var(--accent)]'} select-none mt-0.5`}>•</span>
            <span className={`text-sm flex-1 ${role === 'user' ? 'text-white' : 'text-[var(--text2)]'}`}>{displayContent}</span>
          </div>
        );
      }

      return (
        <p key={index} className={`text-sm my-1 leading-relaxed ${role === 'user' ? 'text-white' : 'text-[var(--text2)]'}`}>
          {displayContent}
        </p>
      );
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 animate-fade-in flex flex-col h-[calc(100vh-80px)]">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-[var(--text)] mb-2">Personal Energy Analyst</h1>
        <p className="text-[var(--text2)]">Ask anything about your usage, get optimization tips, or check anomalies.</p>
      </div>

      <div className="flex-1 bg-[var(--card)] border border-[var(--border)] rounded-[2rem] overflow-hidden flex flex-col shadow-xl shadow-[var(--accent)]/5">
        {/* Header */}
        <div className="p-6 border-b border-[var(--border)] flex items-center gap-4 bg-[var(--bg3)]">
          <div className="w-12 h-12 rounded-full bg-[var(--accent)] flex items-center justify-center text-white font-bold shadow-lg shadow-[var(--accent)]/20 relative">
            AI
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[var(--card)]"></span>
          </div>
          <div>
            <h3 className="font-bold text-[var(--text)] text-lg">Electricity Assistant</h3>
            <p className="text-[12px] text-[var(--text3)]">Always active &bull; Ready to help</p>
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-[var(--bg)] scroll-smooth">
          {chatMessages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] md:max-w-[70%] p-4 rounded-2xl text-sm leading-relaxed ${
                m.role === 'user' 
                  ? 'bg-[var(--accent)] text-white rounded-tr-none shadow-md shadow-[var(--accent)]/10' 
                  : 'bg-[var(--card)] border border-[var(--border)] text-[var(--text)] rounded-tl-none shadow-sm'
              }`}>
                {parseMessageContent(m.content, m.role)}
              </div>
            </div>
          ))}
          {isChatting && (
            <div className="flex justify-start">
              <div className="bg-[var(--card)] border border-[var(--border)] p-4 rounded-2xl rounded-tl-none text-xs text-[var(--text3)] flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-1.5 h-1.5 bg-[var(--accent)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                Thinking...
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-[var(--card2)] border-t border-[var(--border)]">
          <div className="flex flex-wrap gap-2 mb-4">
            {['Why is my bill so high?', 'Did anything unusual happen today?', 'Which appliance wastes the most electricity?'].map(action => (
              <button 
                key={action}
                onClick={() => handleSendMessage(action)}
                className="px-4 py-2 bg-[var(--card)] border border-[var(--border)] hover:border-[var(--accent)] hover:text-[var(--accent)] text-[var(--text2)] text-[11px] md:text-xs rounded-full transition-colors font-medium"
              >
                {action}
              </button>
            ))}
          </div>
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
            className="flex gap-3"
          >
            <input 
              type="text" 
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Ask your Personal Energy Analyst..."
              className="flex-1 bg-[var(--bg)] border border-[var(--border)] rounded-xl px-4 py-3.5 text-sm text-[var(--text)] focus:outline-none focus:border-[var(--accent)] focus:ring-1 focus:ring-[var(--accent)] transition-shadow"
            />
            <button 
              type="submit"
              disabled={isChatting || !inputMessage.trim()}
              className="px-6 py-3.5 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:opacity-50 text-white font-bold rounded-xl transition-colors shadow-lg shadow-[var(--accent)]/20"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
