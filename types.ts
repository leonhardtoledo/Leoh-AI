
export type PersonalityMode = 'Grok-like' | 'Amigão' | 'Focado' | 'Romântico' | 'Normal' | 'Custom';

export interface Persona {
  id: string;
  name: string;
  characteristics: string;
  commands: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  media?: {
    type: 'image' | 'video' | 'audio';
    url: string;
    description?: string;
  };
  timestamp: number;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: number;
  persona?: Persona;
  personality: PersonalityMode;
}

export interface UserPreferences {
  name: string;
  nickname: string;
  goals: string[];
  personality: PersonalityMode;
  longTermMemory: string[];
  customPersonas: Persona[];
}
