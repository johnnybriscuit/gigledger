export interface Gig {
  id: string;
  clientName: string;
  projectName: string;
  amount: number;
  date: string;
  status: 'pending' | 'paid' | 'overdue';
  description?: string;
}

export type RootStackParamList = {
  Home: undefined;
  AddGig: undefined;
};
