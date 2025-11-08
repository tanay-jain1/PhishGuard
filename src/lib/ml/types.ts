export type MlInput = {
  subject: string;
  body_html: string;
  from_email?: string | null;
  from_name?: string | null;
};

export type MlOutput = {
  prob_phish: number;
  reasons?: string[];
  topTokens?: string[];
};

