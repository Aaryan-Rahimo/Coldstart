import { create } from 'zustand';

export interface EmailDraft {
  id: string;
  company: string;
  contactEmail: string;
  role?: string;
  preview: string;
  fullBody: string;
  status: 'draft' | 'sent' | 'failed';
}

interface EmailsState {
  emails: EmailDraft[];
  selectedIds: string[];
  isGenerating: boolean;
  drawerOpen: boolean;
  editingId: string | null;
  toggleSelection: (id: string) => void;
  selectAll: (allIds: string[]) => void;
  clearSelection: () => void;
  openDrawer: (id: string) => void;
  closeDrawer: () => void;
  updateEmail: (id: string, newBody: string) => void;
  regenerateEmail: (id: string) => void;
  sendEmail: (id: string) => void;
  setGenerating: (generating: boolean) => void;
  mockGenerate: () => void;
}

const initialMockEmails: EmailDraft[] = [
  {
    id: '1',
    company: 'Stripe',
    contactEmail: 'jane.doe@stripe.com',
    role: 'Eng Manager',
    preview: "Hi Jane, I saw your team's recent work on Billing... ",
    fullBody: "Hi Jane,\n\nI saw your team's recent work on Stripe Billing and was super impressed by the new subscription schedules feature.\n\nI'm a full-stack engineer with experience building scalable payment integrations. Would love to chat about potential open roles on your team.\n\nBest,\nAryan",
    status: 'draft'
  },
  {
    id: '2',
    company: 'Vercel',
    contactEmail: 'lee@vercel.com',
    role: 'VP Product',
    preview: "Lee, loved the Next.js 15 conf talk! I built a...",
    fullBody: "Lee,\n\nloved the Next.js 15 conf talk! I built a mock application using the new compiler and saw a 40% reduction in build times.\n\nI'm currently looking for frontend roles and would be thrilled to contribute to the Next.js core or DevRel teams.\n\nCheers,\nAryan",
    status: 'sent'
  },
  {
    id: '3',
    company: 'Linear',
    contactEmail: 'recruiting@linear.app',
    role: 'Recruiter',
    preview: "Hello, Linear's keyboard-first design has heavily i...",
    fullBody: "Hello,\n\nLinear's keyboard-first design has heavily influenced my own personal projects. I've built several open-source tools prioritizing speed and aesthetic.\n\nAre you looking for product engineers who obsess over micro-interactions?\n\nThanks,\nAryan",
    status: 'draft'
  }
];

export const useEmailsStore = create<EmailsState>((set, get) => ({
  emails: initialMockEmails, // start with some data for demo purposes
  selectedIds: [],
  isGenerating: false,
  drawerOpen: false,
  editingId: null,

  toggleSelection: (id) => set((state) => ({
    selectedIds: state.selectedIds.includes(id) 
      ? state.selectedIds.filter(selectedId => selectedId !== id)
      : [...state.selectedIds, id]
  })),

  selectAll: (allIds) => set({ selectedIds: allIds }),
  clearSelection: () => set({ selectedIds: [] }),

  openDrawer: (id) => set({ drawerOpen: true, editingId: id }),
  closeDrawer: () => set({ drawerOpen: false, editingId: null }),

  updateEmail: (id, newBody) => set((state) => ({
    emails: state.emails.map(e => e.id === id ? { ...e, fullBody: newBody, preview: newBody.substring(0, 50) + '...' } : e)
  })),

  regenerateEmail: (id) => {
    // Mock regeneration delay
    setTimeout(() => {
      set((state) => ({
        emails: state.emails.map(e => e.id === id ? { ...e, fullBody: 'Here is a newly generated email draft! It is much better now.\n\nBest,\nAryan', preview: 'Here is a newly generated email draft! It is much...' } : e)
      }));
    }, 1500);
  },

  sendEmail: (id) => {
    set((state) => ({
      emails: state.emails.map(e => e.id === id ? { ...e, status: 'sent' } : e)
    }));
    get().closeDrawer();
  },

  setGenerating: (generating) => set({ isGenerating: generating }),

  mockGenerate: () => {
    set({ isGenerating: true });
    setTimeout(() => {
      set((state) => ({
        isGenerating: false,
        emails: [
          ...state.emails,
          {
            id: Date.now().toString(),
            company: 'OpenAI',
            contactEmail: 'sam@openai.com',
            role: 'CEO',
            preview: 'Hi Sam, the new model capabilities blow everything...',
            fullBody: 'Hi Sam,\n\nThe new model capabilities blow everything else out of the water. I\'d love to help build the next generation of inference APIs.\n\nBest,\nAryan',
            status: 'draft'
          }
        ]
      }));
    }, 2500);
  }
}));
