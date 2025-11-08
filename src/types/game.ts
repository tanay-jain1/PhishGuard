export interface Email {
  id: string;
  subject: string;
  from: string;
  to: string;
  body: string;
  isPhishing: boolean;
  explanation: string;
  redFlags: string[];
}

export interface GameSession {
  id: string;
  userId: string;
  score: number;
  totalGuesses: number;
  correctGuesses: number;
  currentEmailIndex: number;
  completed: boolean;
}

