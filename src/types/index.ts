export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: string; // ISO string or simple time format e.g. "10:15 AM" / ISO
  status: 'sent' | 'delivered' | 'read';
  attachment?: {
    type: 'image' | 'file';
    url: string;
    name: string;
    size?: string;
  };
}

export interface Contact {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'typing...';
  lastSeen?: string;
}

export interface Chat {
  id: string;
  contact: Contact;
  messages: Message[];
  unreadCount: number;
}

export interface UserProfile {
  id: string;
  name: string;
  avatar: string;
  status: string;
}
