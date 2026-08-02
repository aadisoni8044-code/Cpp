import { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatWindow } from './components/ChatWindow';
import type { Chat, Message, UserProfile } from './types';
import mockData from './data/mockData.json';

export default function App() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    // Sync initially with system/document class
    return document.documentElement.classList.contains('dark');
  });

  const [currentUser] = useState<UserProfile>(mockData.currentUser);
  const [chats, setChats] = useState<Chat[]>(() => {
    // Typecast mockData to proper TS schema
    return mockData.chats as Chat[];
  });

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [mobileViewActive, setMobileViewActive] = useState<'sidebar' | 'chat'>('sidebar');

  // Sync isDark with document class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleToggleTheme = () => {
    setIsDark(!isDark);
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setMobileViewActive('chat');

    // Automatically clear unread count for selected chat
    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === chatId ? { ...chat, unreadCount: 0 } : chat
      )
    );
  };

  const handleSendMessage = (
    text: string,
    attachment?: { type: 'image' | 'file'; url: string; name: string }
  ) => {
    if (!activeChatId) return;

    const newMessage: Message = {
      id: `msg_${Date.now()}`,
      senderId: currentUser.id,
      text,
      timestamp: new Date().toISOString(),
      status: 'sent',
      attachment
    };

    setChats((prevChats) =>
      prevChats.map((chat) => {
        if (chat.id === activeChatId) {
          return {
            ...chat,
            messages: [...chat.messages, newMessage],
          };
        }
        return chat;
      })
    );

    // Mock automatic receipt progression (sent -> delivered -> read)
    setTimeout(() => {
      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id === activeChatId) {
            return {
              ...chat,
              messages: chat.messages.map((m) =>
                m.id === newMessage.id ? { ...m, status: 'delivered' } : m
              ),
            };
          }
          return chat;
        })
      );
    }, 1000);

    setTimeout(() => {
      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id === activeChatId) {
            return {
              ...chat,
              messages: chat.messages.map((m) =>
                m.id === newMessage.id ? { ...m, status: 'read' } : m
              ),
            };
          }
          return chat;
        })
      );
    }, 2500);

    // Dynamic Reply simulations
    setTimeout(() => {
      const responses = [
        "That sounds super cool!",
        "Thanks for updating, highly appreciate it.",
        "Let me review this carefully and get back to you shortly.",
        "Could you check the desktop responsive version?",
        "Brilliant design execution of SPPChat!",
        "Perfect, let's deploy the React Tailwind code!"
      ];
      const randomReply = responses[Math.floor(Math.random() * responses.length)];

      const systemReply: Message = {
        id: `reply_${Date.now()}`,
        senderId: 'bot', // representing contact
        text: randomReply,
        timestamp: new Date().toISOString(),
        status: 'read'
      };

      setChats((prevChats) =>
        prevChats.map((chat) => {
          if (chat.id === activeChatId) {
            return {
              ...chat,
              messages: [...chat.messages, systemReply],
              contact: { ...chat.contact, status: 'online' }
            };
          }
          return chat;
        })
      );
    }, 4500);
  };

  const handleStartTyping = () => {
    if (!activeChatId) return;

    // Simulate contact seeing typing, then becoming active/online
    setChats((prevChats) =>
      prevChats.map((chat) => {
        if (chat.id === activeChatId && chat.contact.status === 'online') {
          // Temporarily show "typing..." or active state indicators
          return {
            ...chat,
            contact: { ...chat.contact, status: 'online' }
          };
        }
        return chat;
      })
    );
  };

  const handleAddNewChat = (contactName: string) => {
    const newChatId = `chat_${Date.now()}`;
    const newChat: Chat = {
      id: newChatId,
      contact: {
        id: `contact_${Date.now()}`,
        name: contactName,
        avatar: `https://images.unsplash.com/photo-${1500000000000 + Math.floor(Math.random() * 100000)}?w=150`,
        status: 'online'
      },
      messages: [
        {
          id: `msg_init_${Date.now()}`,
          senderId: `contact_${Date.now()}`,
          text: `Hey! I am ${contactName}. Glad to connect with you on SPPChat!`,
          timestamp: new Date().toISOString(),
          status: 'read'
        }
      ],
      unreadCount: 1
    };

    setChats((prev) => [newChat, ...prev]);
    setActiveChatId(newChatId);
    setMobileViewActive('chat');
  };

  const activeChat = chats.find((chat) => chat.id === activeChatId) || null;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gray-100 dark:bg-gray-950 text-gray-900 dark:text-gray-100 font-sans transition-colors duration-200">
      {/* Sidebar - Collapsible on Mobile using mobileViewActive state */}
      <div className={`h-full md:w-[380px] lg:w-[420px] flex-shrink-0 transition-all duration-300 ${
        mobileViewActive === 'sidebar' ? 'w-full block' : 'hidden md:block'
      }`}>
        <Sidebar
          currentUser={currentUser}
          chats={chats}
          activeChatId={activeChatId}
          onSelectChat={handleSelectChat}
          isDark={isDark}
          onToggleTheme={handleToggleTheme}
          onAddNewChat={handleAddNewChat}
        />
      </div>

      {/* Main Chat Area - Collapsible on Mobile */}
      <div className={`h-full flex-1 transition-all duration-300 ${
        mobileViewActive === 'chat' ? 'w-full block' : 'hidden md:block'
      }`}>
        <ChatWindow
          chat={activeChat}
          currentUser={currentUser}
          onSendMessage={handleSendMessage}
          onBack={() => setMobileViewActive('sidebar')}
          onStartTyping={handleStartTyping}
        />
      </div>
    </div>
  );
}
