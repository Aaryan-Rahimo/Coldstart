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
  isLoading: boolean;
  drawerOpen: boolean;
  editingId: string | null;
  loadEmails: () => Promise<void>;
  toggleSelection: (id: string) => void;
  selectAll: (allIds: string[]) => void;
  clearSelection: () => void;
  openDrawer: (id: string) => void;
  closeDrawer: () => void;
  updateEmail: (id: string, newBody: string) => void;
  regenerateEmail: (id: string) => void;
  sendEmail: (id: string) => Promise<void>;
  setGenerating: (generating: boolean) => void;
  mockGenerate: () => void;
}

type BackendEmailRow = {
  id: string;
  company_name: string;
  contact_email: string;
  role?: string | null;
  generated_text: string;
  edited_text?: string | null;
  status: 'draft' | 'sent' | 'failed';
};

function toEmailDraft(row: BackendEmailRow): EmailDraft {
  const fullBody = row.edited_text ?? row.generated_text;
  return {
    id: row.id,
    company: row.company_name,
    contactEmail: row.contact_email,
    role: row.role ?? undefined,
    preview: `${fullBody.slice(0, 60)}${fullBody.length > 60 ? '...' : ''}`,
    fullBody,
    status: row.status,
  };
}

export const useEmailsStore = create<EmailsState>((set, get) => ({
  emails: [],
  selectedIds: [],
  isGenerating: false,
  isLoading: false,
  drawerOpen: false,
  editingId: null,

  loadEmails: async () => {
    set({ isLoading: true });
    try {
      const res = await fetch('/api/backend/emails', { method: 'GET', cache: 'no-store' });
      if (!res.ok) {
        throw new Error('Failed to load emails');
      }
      const rows = (await res.json()) as BackendEmailRow[];
      set({ emails: rows.map(toEmailDraft), isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  toggleSelection: (id) => set((state) => ({
    selectedIds: state.selectedIds.includes(id) 
      ? state.selectedIds.filter(selectedId => selectedId !== id)
      : [...state.selectedIds, id]
  })),

  selectAll: (allIds) => set({ selectedIds: allIds }),
  clearSelection: () => set({ selectedIds: [] }),

  openDrawer: (id) => set({ drawerOpen: true, editingId: id }),
  closeDrawer: () => set({ drawerOpen: false, editingId: null }),

  updateEmail: (id, newBody) => {
    set((state) => ({
      emails: state.emails.map(e => e.id === id ? { ...e, fullBody: newBody, preview: `${newBody.slice(0, 60)}${newBody.length > 60 ? '...' : ''}` } : e)
    }));

    void fetch(`/api/backend/emails/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ edited_text: newBody }),
    });
  },

  regenerateEmail: (id) => {
    const target = get().emails.find((e) => e.id === id);
    if (!target) {
      return;
    }
    alert(`Regenerate for ${target.company} is not wired yet. Use the backend /generate-emails flow to create new drafts.`);
  },

  sendEmail: async (id) => {
    const target = get().emails.find((e) => e.id === id);
    if (!target) {
      return;
    }

    const statusRes = await fetch('/api/gmail/status', { method: 'GET' });
    if (!statusRes.ok) {
      alert('Please connect Gmail first');
      return;
    }

    const statusJson = await statusRes.json();
    if (!statusJson.connected) {
      alert('Please connect Gmail first');
      return;
    }

    const sendRes = await fetch('/api/gmail/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        emailId: id,
      }),
    });

    if (!sendRes.ok) {
      const error = await sendRes.json().catch(() => ({}));
      alert(error?.message ?? 'Failed to send email');
      set((state) => ({
        emails: state.emails.map((e) => (e.id === id ? { ...e, status: 'failed' } : e)),
      }));
      return;
    }

    set((state) => ({
      emails: state.emails.map((e) => (e.id === id ? { ...e, status: 'sent' } : e)),
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
