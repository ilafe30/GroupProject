
import { MessageCircle, X, Send } from "lucide-react";
import { useState, FormEvent } from "react";
import { motion, AnimatePresence } from "motion/react";

export default function FloatingChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { text: "Hello! How can I help you with your research today?", isBot: true }
  ]);
  const [input, setInput] = useState("");

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setMessages([...messages, { text: input, isBot: false }]);
    const userMsg = input;
    setInput("");

    // Mock bot response
    setTimeout(() => {
      setMessages(prev => [...prev, { 
        text: `I'm an AI research assistant. Regarding "${userMsg}", you should check the MLDL Lab for similar projects.`, 
        isBot: true 
      }]);
    }, 1000);
  };

  return (
    <div className="fixed bottom-8 right-8 z-[100]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="mb-4 w-80 md:w-96 h-[500px] bg-white rounded-[32px] shadow-2xl border border-[#0e4971]/10 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="p-6 bg-[#0e4971] text-white flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                  <MessageCircle size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Research Assistant</h3>
                  <p className="text-[10px] text-white/60">Online • AI Powered</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-white/10 p-1 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-grow p-6 overflow-y-auto space-y-4 bg-[#f8f7f4]/50">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.isBot ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm ${
                    m.isBot 
                      ? 'bg-white text-[#0e4971] rounded-tl-none shadow-sm' 
                      : 'bg-[#f37e22] text-white rounded-tr-none shadow-md'
                  }`}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="p-4 bg-white border-t border-[#0e4971]/5 flex gap-2">
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about labs, papers..." 
                className="flex-grow bg-[#f8f7f4] border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-[#f37e22] outline-none"
              />
              <button type="submit" className="bg-[#0e4971] text-white p-2 rounded-full hover:bg-[#0a3a5c] transition-colors">
                <Send size={18} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-[#0e4971] text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 active:scale-95 transition-all group"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <motion.div key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X size={28} />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }}>
              <MessageCircle size={28} />
            </motion.div>
          )}
        </AnimatePresence>
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#f37e22] rounded-full border-2 border-[#f8f7f4] flex items-center justify-center text-[10px] font-bold">1</span>
      </button>
    </div>
  );
}
