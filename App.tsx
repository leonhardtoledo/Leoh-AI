
import React, { useState, useEffect, useRef } from 'react';
import { GeminiService } from './services/gemini';
import { PersonalityMode, ChatMessage, Persona } from './types';
import Logo from './components/Logo';
import Avatar from './components/Avatar';

interface Attachment {
  name: string;
  type: string;
  base64: string;
  text?: string;
}

type ViewMode = 'chat' | 'memory' | 'create-persona';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [personality, setPersonality] = useState<PersonalityMode>('Amigão');
  const [currentPersona, setCurrentPersona] = useState<Persona | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [avatarMood, setAvatarMood] = useState<'idle' | 'thinking' | 'happy' | 'dancing'>('idle');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('chat');
  
  // Custom Persona State
  const [newPersonaName, setNewPersonaName] = useState('');
  const [newPersonaChars, setNewPersonaChars] = useState('');
  const [newPersonaCmds, setNewPersonaCmds] = useState('');
  const [customPersonas, setCustomPersonas] = useState<Persona[]>([]);
  
  // Memory
  const [longTermMemory, setLongTermMemory] = useState<string[]>([]);

  // Login State
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gemini = useRef(new GeminiService());

  useEffect(() => {
    const auth = localStorage.getItem('leoh_auth');
    if (auth === 'true') setIsAuthenticated(true);

    const savedPersonas = localStorage.getItem('leoh_personas');
    if (savedPersonas) setCustomPersonas(JSON.parse(savedPersonas));

    const savedMemory = localStorage.getItem('leoh_long_memory');
    if (savedMemory) setLongTermMemory(JSON.parse(savedMemory));

    const savedChat = localStorage.getItem('leoh_messages');
    if (savedChat) {
      setMessages(JSON.parse(savedChat));
    } else {
      setMessages([{
        id: 'initial',
        role: 'model',
        text: 'E aí, parceiro! Eu sou o Leoh AI. O que a gente vai criar hoje?',
        timestamp: Date.now()
      }]);
    }
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    if (messages.length > 0) {
      localStorage.setItem('leoh_messages', JSON.stringify(messages));
    }
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('leoh_personas', JSON.stringify(customPersonas));
  }, [customPersonas]);

  useEffect(() => {
    localStorage.setItem('leoh_long_memory', JSON.stringify(longTermMemory));
  }, [longTermMemory]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUser === 'LeonhardToledo' && loginPass === '1315') {
      setIsAuthenticated(true);
      localStorage.setItem('leoh_auth', 'true');
      setLoginError('');
    } else {
      setLoginError('Usuário ou senha incorretos.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('leoh_auth');
    setLoginUser('');
    setLoginPass('');
    setMessages([{
        id: 'initial',
        role: 'model',
        text: 'E aí, parceiro! Eu sou o Leoh AI. O que a gente vai criar hoje?',
        timestamp: Date.now()
    }]);
    localStorage.removeItem('leoh_messages');
  };

  const startChatWithPersona = (persona: Persona) => {
    setCurrentPersona(persona);
    setPersonality('Custom');
    setMessages([{
      id: 'persona-init-' + Date.now(),
      role: 'model',
      text: `Olá! Eu sou ${persona.name}. Como posso te ajudar hoje?`,
      timestamp: Date.now()
    }]);
    setViewMode('chat');
  };

  const handleCreatePersona = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonaName) return;
    const persona: Persona = {
      id: Date.now().toString(),
      name: newPersonaName,
      characteristics: newPersonaChars,
      commands: newPersonaCmds
    };
    setCustomPersonas(prev => [...prev, persona]);
    setNewPersonaName('');
    setNewPersonaChars('');
    setNewPersonaCmds('');
    startChatWithPersona(persona);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const newAttachments: Attachment[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const reader = new FileReader();
      
      const attachment: Attachment = await new Promise((resolve) => {
        reader.onload = async (event) => {
          const base64 = event.target?.result as string;
          let text = '';
          if (file.type === 'text/plain') {
            text = await file.text();
          }
          resolve({
            name: file.name,
            type: file.type,
            base64: base64,
            text: text
          });
        };
        reader.readAsDataURL(file);
      });
      newAttachments.push(attachment);
    }
    setAttachments(prev => [...prev, ...newAttachments]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim() && attachments.length === 0) return;

    const currentAttachments = [...attachments];
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputText,
      timestamp: Date.now(),
      media: currentAttachments.find(a => a.type.startsWith('image/')) ? {
        type: 'image',
        url: currentAttachments.find(a => a.type.startsWith('image/'))?.base64 || '',
        description: currentAttachments.map(a => a.name).join(', ')
      } : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setAttachments([]);
    setIsLoading(true);
    setAvatarMood('thinking');

    try {
      const history = [...messages, userMsg].map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));
      
      let customInstruction = undefined;
      if (personality === 'Custom' && currentPersona) {
        customInstruction = `Você é ${currentPersona.name}. 
        Suas características são: ${currentPersona.characteristics}. 
        Siga estes comandos: ${currentPersona.commands}.`;
      }

      const response = await gemini.current.generateChatResponse(
        inputText, 
        personality, 
        history, 
        currentAttachments,
        customInstruction
      );

      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: response || 'Ixi, deu um branco aqui. Tenta de novo?',
        timestamp: Date.now()
      }]);
      setAvatarMood('happy');

      if (inputText.length > 50 || response.length > 200) {
        setLongTermMemory(prev => {
          const newEntry = `Interação em ${new Date().toLocaleDateString()}: O usuário falou sobre "${inputText.substring(0, 30)}..."`;
          return [newEntry, ...prev].slice(0, 50);
        });
      }
    } catch (error) {
      console.error(error);
      setAvatarMood('idle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVibeCheck = async () => {
    setIsLoading(true);
    setAvatarMood('thinking');
    
    setMessages(prev => [...prev, {
      id: 'vibe-loading-' + Date.now(),
      role: 'model',
      text: 'Consultando os astros para o signo de Câncer... ♋✨',
      timestamp: Date.now()
    }]);

    try {
      const response = await gemini.current.getHoroscope();
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: response || 'Os astros estão tímidos hoje. Tenta daqui a pouco?',
        timestamp: Date.now()
      }]);
      setAvatarMood('dancing');
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center p-8">
        <div className="animate-float mb-6">
          <Logo size={220} />
        </div>
        <div className="mb-10 text-center fade-in">
          <h1 className="font-display font-black tracking-tighter flex items-center justify-center text-glow">
            <span className="text-7xl md:text-9xl text-leoh-light drop-shadow-2xl">Leoh</span>
            <span className="text-4xl md:text-5xl text-leoh-accent ml-2 font-black bg-clip-text text-transparent bg-gradient-to-br from-leoh-primary via-leoh-magenta to-leoh-accent">AI</span>
          </h1>
          <p className="mt-4 text-leoh-light/40 font-bold tracking-[0.3em] uppercase text-[10px] md:text-xs">Humano • Digital</p>
        </div>
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-4 fade-in relative z-20">
          <div className="gradient-border p-[2px] relative group">
            <input 
              type="text" 
              placeholder="Identidade de Usuário" 
              value={loginUser}
              autoComplete="username"
              onChange={(e) => setLoginUser(e.target.value)}
              className="w-full bg-leoh-deep/90 backdrop-blur-md rounded-[16px] py-4 px-6 outline-none focus:ring-2 ring-leoh-primary/30 transition-all text-white block relative z-30 placeholder:text-white/20"
            />
          </div>
          <div className="gradient-border p-[2px] relative group">
            <input 
              type="password" 
              placeholder="Código de Acesso" 
              value={loginPass}
              autoComplete="current-password"
              onChange={(e) => setLoginPass(e.target.value)}
              className="w-full bg-leoh-deep/90 backdrop-blur-md rounded-[16px] py-4 px-6 outline-none focus:ring-2 ring-leoh-primary/30 transition-all text-white block relative z-30 placeholder:text-white/20"
            />
          </div>
          {loginError && <p className="text-leoh-primary text-xs text-center font-bold animate-pulse uppercase tracking-wider">{loginError}</p>}
          <button 
            type="submit"
            className="w-full py-5 bg-gradient-to-r from-leoh-primary to-leoh-magenta rounded-2xl font-black text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-2xl shadow-leoh-primary/30 text-white relative z-30 uppercase tracking-widest overflow-hidden group"
          >
            <span className="relative z-10">Iniciar Portal</span>
            <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
        </form>
        <div className="mt-12 opacity-20 text-[10px] uppercase tracking-widest font-bold text-center px-4">
          v3.0 ® Todos direitos reservados a Leonardo Toledo
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden text-leoh-light font-sans fade-in">
      {/* Sidebar Simples */}
      <aside className="hidden md:flex flex-col w-72 glass border-r border-white/10 p-5 space-y-8 z-30 overflow-hidden">
        <div className="flex flex-col items-start px-1">
          <h1 className="font-display font-black tracking-tighter flex items-center justify-start text-glow">
            <span className="text-3xl text-leoh-light">Leoh</span>
            <span className="text-lg text-leoh-accent ml-1 font-black bg-clip-text text-transparent bg-gradient-to-br from-leoh-primary via-leoh-magenta to-leoh-accent">AI</span>
          </h1>
        </div>

        <nav className="flex-1 space-y-3">
          <button 
            onClick={() => setViewMode('chat')}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 group transition-all ${viewMode === 'chat' ? 'bg-gradient-to-br from-leoh-primary to-leoh-magenta text-white shadow-xl' : 'hover:bg-white/5 text-white/50'}`}
          >
            <ChatIcon />
            <span className="font-black uppercase tracking-wider text-xs">Chat Principal</span>
          </button>
          <button 
            onClick={() => setViewMode('memory')}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 group transition-all ${viewMode === 'memory' ? 'bg-gradient-to-br from-leoh-primary to-leoh-magenta text-white shadow-xl' : 'hover:bg-white/5 text-white/50'}`}
          >
            <MemoryIcon />
            <span className="font-black uppercase tracking-wider text-xs">Memória</span>
          </button>
          <button 
            onClick={() => setViewMode('create-persona')}
            className={`w-full text-left px-4 py-3 rounded-xl flex items-center gap-3 group transition-all ${viewMode === 'create-persona' ? 'bg-gradient-to-br from-leoh-primary to-leoh-magenta text-white shadow-xl' : 'hover:bg-white/5 text-white/50'}`}
          >
            <CreateIcon />
            <span className="font-black uppercase tracking-wider text-xs">Criar Persona</span>
          </button>
        </nav>

        <div className="pt-4 border-t border-white/10 space-y-6">
           {!currentPersona && (
            <div className="p-4 bg-leoh-deep/50 rounded-2xl border border-white/5">
              <p className="text-[9px] uppercase tracking-[0.2em] text-leoh-accent font-black mb-2">Frequência</p>
              <select 
                value={personality}
                onChange={(e) => setPersonality(e.target.value as PersonalityMode)}
                className="w-full bg-transparent text-xs focus:outline-none cursor-pointer font-bold appearance-none text-white"
              >
                <option className="bg-leoh-deep" value="Amigão">Amigão BR 🇧🇷</option>
                <option className="bg-leoh-deep" value="Grok-like">Grok ⚡</option>
                <option className="bg-leoh-deep" value="Focado">Focado 🎯</option>
                <option className="bg-leoh-deep" value="Romântico">Amor ❤️</option>
              </select>
            </div>
           )}
           
           {currentPersona && (
             <div className="p-4 glass border border-leoh-primary/30 rounded-2xl">
                <p className="text-[9px] uppercase tracking-[0.2em] text-leoh-primary font-black mb-1">Ativo: {currentPersona.name}</p>
                <button onClick={() => {setCurrentPersona(null); setPersonality('Amigão');}} className="text-[8px] opacity-40 hover:opacity-100 uppercase font-bold underline transition-all">Sair do modo Persona</button>
             </div>
           )}

           <div className="flex flex-col items-center">
              <div className="relative">
                <div className="absolute inset-0 bg-leoh-primary/20 blur-xl animate-pulse"></div>
                <Avatar mood={avatarMood} />
              </div>
              <button 
                onClick={handleLogout}
                className="mt-4 text-[10px] text-leoh-primary font-black uppercase tracking-widest hover:underline"
              >
                Sair do Sistema
              </button>
           </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative z-10 bg-leoh-deep/20">
        <header className="md:hidden flex items-center justify-between p-4 glass border-b border-white/10 z-20">
          <div className="flex items-center justify-start flex-1">
            <h1 className="font-display font-black tracking-tighter flex items-center justify-start text-glow">
              <span className="text-2xl text-leoh-light">Leoh</span>
              <span className="text-sm text-leoh-accent ml-1 font-black bg-clip-text text-transparent bg-gradient-to-br from-leoh-primary via-leoh-magenta to-leoh-accent">AI</span>
            </h1>
          </div>
          <button onClick={handleLogout} className="p-2 text-leoh-primary bg-white/5 rounded-full border border-white/10">
            <ExitIcon />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-48 pt-20 md:pt-4">
          {viewMode === 'chat' && (
            <div className="max-w-4xl mx-auto space-y-6">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl p-4 shadow-2xl transition-all ${
                    msg.role === 'user' 
                    ? 'bg-gradient-to-br from-leoh-primary to-leoh-magenta text-white' 
                    : 'glass border-white/10'
                  }`}>
                    {msg.text && <p className="leading-relaxed whitespace-pre-wrap text-sm md:text-base font-medium">{msg.text}</p>}
                    {msg.media?.type === 'image' && (
                      <img src={msg.media.url} alt="Attached" className="mt-3 rounded-xl max-w-full border-2 border-white/20 shadow-2xl" />
                    )}
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[9px] opacity-40 font-black tracking-widest uppercase">
                        {msg.role === 'user' ? 'Transmitido' : 'Recebido'}
                      </span>
                      <span className="text-[10px] opacity-40 font-mono">
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                   <div className="glass p-5 rounded-2xl animate-pulse flex space-x-3 border border-white/10">
                      <div className="w-2.5 h-2.5 bg-leoh-primary rounded-full animate-bounce"></div>
                      <div className="w-2.5 h-2.5 bg-leoh-magenta rounded-full animate-bounce delay-100"></div>
                      <div className="w-2.5 h-2.5 bg-leoh-accent rounded-full animate-bounce delay-200"></div>
                   </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}

          {viewMode === 'memory' && (
            <div className="max-w-3xl mx-auto space-y-6 fade-in p-4">
              <h2 className="text-3xl font-display font-black text-leoh-accent text-glow uppercase tracking-widest">Nexo de Memória</h2>
              <p className="text-sm text-white/60 mb-8 font-medium">Insights capturados durante nossas conversas.</p>
              {longTermMemory.length === 0 ? (
                <div className="p-8 text-center glass rounded-2xl border-dashed border-white/10">
                  <p className="opacity-40 italic">Ainda não há memórias salvas...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {longTermMemory.map((item, i) => (
                    <div key={i} className="glass p-4 rounded-xl border-l-4 border-leoh-primary flex items-start gap-4">
                      <div className="text-leoh-primary mt-1">•</div>
                      <p className="text-sm font-medium">{item}</p>
                    </div>
                  ))}
                  <button 
                    onClick={() => setLongTermMemory([])}
                    className="text-[10px] text-red-500 font-black uppercase tracking-widest hover:underline mt-4"
                  >
                    Resetar Memória
                  </button>
                </div>
              )}
            </div>
          )}

          {viewMode === 'create-persona' && (
            <div className="max-w-3xl mx-auto space-y-8 fade-in p-4">
              <h2 className="text-3xl font-display font-black text-leoh-primary text-glow uppercase tracking-widest">Forjar Nova Persona</h2>
              <form onSubmit={handleCreatePersona} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-leoh-accent tracking-[0.2em]">Nome da Persona</label>
                  <div className="gradient-border p-[2px]">
                    <input 
                      type="text"
                      placeholder="Ex: Consultor Socrático"
                      value={newPersonaName}
                      onChange={(e) => setNewPersonaName(e.target.value)}
                      className="w-full bg-leoh-deep p-4 rounded-xl outline-none text-white font-medium placeholder:opacity-20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-leoh-accent tracking-[0.2em]">Características</label>
                  <div className="gradient-border p-[2px]">
                    <textarea 
                      placeholder="Ex: Analítico, sarcástico, fã de filosofia..."
                      rows={3}
                      value={newPersonaChars}
                      onChange={(e) => setNewPersonaChars(e.target.value)}
                      className="w-full bg-leoh-deep p-4 rounded-xl outline-none text-white font-medium resize-none placeholder:opacity-20"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-leoh-accent tracking-[0.2em]">Comandos Especiais</label>
                  <div className="gradient-border p-[2px]">
                    <textarea 
                      placeholder="Ex: Sempre encerre com uma pergunta provocativa."
                      rows={3}
                      value={newPersonaCmds}
                      onChange={(e) => setNewPersonaCmds(e.target.value)}
                      className="w-full bg-leoh-deep p-4 rounded-xl outline-none text-white font-medium resize-none placeholder:opacity-20"
                    />
                  </div>
                </div>
                <button 
                  type="submit"
                  className="w-full py-5 bg-gradient-to-r from-leoh-primary to-leoh-magenta rounded-2xl font-black text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-2xl text-white uppercase tracking-widest"
                >
                  Ativar Persona
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Input Dock */}
        {viewMode === 'chat' && (
          <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-leoh-deep via-leoh-deep/95 to-transparent">
            <div className="max-w-4xl mx-auto space-y-4">
              {/* File Previews */}
              {attachments.length > 0 && (
                <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide fade-in">
                  {attachments.map((file, idx) => (
                    <div key={idx} className="relative flex-shrink-0 group">
                      <div className="absolute -inset-1 bg-gradient-to-tr from-leoh-primary to-leoh-accent rounded-xl blur-[2px] opacity-50"></div>
                      {file.type.startsWith('image/') ? (
                        <img src={file.base64} className="w-24 h-24 object-cover rounded-xl relative z-10 border border-white/20" alt="Preview" />
                      ) : (
                        <div className="w-24 h-24 flex items-center justify-center bg-leoh-deep rounded-xl border border-white/20 text-[10px] text-center p-3 break-all overflow-hidden relative z-10 font-bold">
                          {file.name}
                        </div>
                      )}
                      <button 
                        onClick={() => removeAttachment(idx)}
                        className="absolute -top-2 -right-2 bg-leoh-primary hover:bg-red-600 transition-colors text-white rounded-full w-7 h-7 flex items-center justify-center text-sm shadow-2xl border-2 border-leoh-deep z-20"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button 
                  onClick={handleVibeCheck}
                  disabled={isLoading}
                  className="flex-shrink-0 flex items-center gap-2 px-8 py-4 rounded-full bg-leoh-accent text-leoh-deep font-black transition-all active:scale-95 hover:brightness-110 shadow-xl disabled:opacity-50 text-xs uppercase tracking-widest"
                >
                  <VibeIcon />
                  <span>Vibe Check</span>
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="flex-shrink-0 flex items-center gap-2 px-8 py-4 rounded-full bg-white/10 backdrop-blur-md text-white border border-white/10 font-black transition-all active:scale-95 hover:bg-white/20 shadow-xl disabled:opacity-50 text-xs uppercase tracking-widest"
                >
                  <AttachIcon />
                  <span>Anexar</span>
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" multiple accept="image/*, .pdf, .txt, .doc, .docx" />
              </div>

              <form onSubmit={handleSendMessage} className="relative group">
                <div className="absolute -inset-1.5 bg-gradient-to-r from-leoh-primary via-leoh-magenta to-leoh-accent rounded-3xl blur opacity-10 group-focus-within:opacity-30 transition-all duration-700"></div>
                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Eai? Tudo bem? Qual a boa?"
                  className="w-full bg-leoh-deep/60 backdrop-blur-2xl border border-white/10 focus:border-leoh-primary/50 focus:ring-0 rounded-2xl py-6 pl-7 pr-16 transition-all outline-none text-lg text-white relative z-10 placeholder:text-white/10 font-medium"
                />
                <button 
                  type="submit"
                  disabled={isLoading || (!inputText.trim() && attachments.length === 0)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-20 p-3 bg-gradient-to-tr from-leoh-primary to-leoh-magenta rounded-xl hover:scale-110 active:scale-90 transition-all disabled:opacity-50 shadow-2xl shadow-leoh-primary/50 group-hover:rotate-12"
                >
                  <SendIcon />
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// Simplified Icons
const ChatIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
);
const MemoryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"></path><path d="M12 6v6l4 2"></path></svg>
);
const CreateIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"></path></svg>
);
const ExitIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
);
const SendIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
);
const VibeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l8.94-8.94 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
);
const AttachIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
);

export default App;
