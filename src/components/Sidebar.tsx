import React, { useState } from 'react';
import type { Chat, UserProfile } from '../types';
import {
  Search,
  Sun,
  Moon,
  MessageSquarePlus,
  Settings,
  MoreVertical,
  LogOut,
  X,
  UserPlus,
  Wifi,
  WifiOff,
  Bluetooth
} from 'lucide-react';

interface SidebarProps {
  currentUser: UserProfile;
  chats: Chat[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onAddNewChat: (contactName: string) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentUser,
  chats,
  activeChatId,
  onSelectChat,
  isDark,
  onToggleTheme,
  onAddNewChat,
  onLogout,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);

  // Connectivity states
  const [wifiState, setWifiState] = useState<'connected' | 'disconnected'>('connected');
  const [bluetoothState, setBluetoothState] = useState<'connected' | 'pairing' | 'off'>('connected');

  // Filter chats by either contact name or message content matching searchQuery
  const filteredChats = chats.filter((chat) => {
    const nameMatch = chat.contact.name.toLowerCase().includes(searchQuery.toLowerCase());
    const messageMatch = chat.messages.some((msg) =>
      msg.text.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return nameMatch || messageMatch;
  });

  const handleAddNewChatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newContactName.trim()) {
      onAddNewChat(newContactName.trim());
      setNewContactName('');
      setShowNewChatModal(false);
    }
  };

  const formatTime = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 w-full transition-colors duration-200">
      {/* Sidebar Header */}
      <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={currentUser.avatar}
              alt={currentUser.name}
              className="w-10 h-10 rounded-full object-cover border-2 border-emerald-500"
            />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full" />
          </div>
          <div>
            <h1 className="font-bold text-gray-800 dark:text-gray-100 text-lg flex items-center gap-1.5">
              <span>SPPChat</span>
            </h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[130px]">{currentUser.status}</p>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all duration-200"
            aria-label="Toggle Theme"
            title="Toggle theme"
          >
            {isDark ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* New Chat Button */}
          <button
            onClick={() => setShowNewChatModal(true)}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all duration-200"
            aria-label="New Chat"
            title="Start new chat"
          >
            <MessageSquarePlus className="w-5 h-5" />
          </button>

          {/* Settings / Menu */}
          <div className="relative">
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all duration-200"
              aria-label="Menu"
              title="Menu"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showSettingsMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50">
                <button
                  onClick={() => {
                    setShowSettingsMenu(false);
                    alert("Settings profile feature coming soon!");
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                >
                  <Settings className="w-4 h-4" /> Profile Settings
                </button>
                <button
                  onClick={() => {
                    setShowSettingsMenu(false);
                    onLogout();
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" /> Log out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Connectivity & Control Panel */}
      <div className="px-4 py-3 bg-gray-50/70 dark:bg-gray-800/20 border-b border-gray-100 dark:border-gray-800 transition-all">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Connectivity Control Panel
          </span>
          <span className="flex h-2 w-2 relative">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              wifiState === 'connected' ? 'bg-emerald-400' : 'bg-rose-400'
            }`}></span>
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              wifiState === 'connected' ? 'bg-emerald-500' : 'bg-rose-500'
            }`}></span>
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {/* Wi-Fi Control Card */}
          <div className={`p-2.5 rounded-xl border transition-all duration-200 ${
            wifiState === 'connected'
              ? 'bg-emerald-500/5 dark:bg-emerald-500/10 border-emerald-500/30 dark:border-emerald-500/20'
              : 'bg-gray-100/60 dark:bg-gray-800/40 border-gray-200 dark:border-gray-800'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Wi-Fi</span>
              <button
                onClick={() => setWifiState(wifiState === 'connected' ? 'disconnected' : 'connected')}
                className={`text-[10px] px-2 py-0.5 rounded-full font-bold transition-all ${
                  wifiState === 'connected'
                    ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/10'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {wifiState === 'connected' ? 'ON' : 'OFF'}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              {wifiState === 'connected' ? (
                <Wifi className="w-5 h-5 text-emerald-500 animate-pulse" />
              ) : (
                <WifiOff className="w-5 h-5 text-gray-400 dark:text-gray-600" />
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">
                  {wifiState === 'connected' ? 'SppChat_Secure' : 'Disconnected'}
                </p>
                <p className="text-[9px] text-gray-400 dark:text-gray-500 font-mono">
                  {wifiState === 'connected' ? 'IP: 192.168.1.45' : 'Offline'}
                </p>
              </div>
            </div>
          </div>

          {/* Bluetooth Control Card */}
          <div className={`p-2.5 rounded-xl border transition-all duration-200 ${
            bluetoothState === 'connected'
              ? 'bg-sky-500/5 dark:bg-sky-500/10 border-sky-500/30 dark:border-sky-500/20'
              : bluetoothState === 'pairing'
              ? 'bg-amber-500/5 dark:bg-amber-500/10 border-amber-500/30 dark:border-amber-500/20'
              : 'bg-gray-100/60 dark:bg-gray-800/40 border-gray-200 dark:border-gray-800'
          }`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">Bluetooth</span>
              <button
                onClick={() => {
                  setBluetoothState(prev => {
                    if (prev === 'connected') return 'pairing';
                    if (prev === 'pairing') return 'off';
                    return 'connected';
                  });
                }}
                className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold transition-all ${
                  bluetoothState === 'connected'
                    ? 'bg-sky-500 text-white'
                    : bluetoothState === 'pairing'
                    ? 'bg-amber-500 text-white animate-pulse'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                }`}
              >
                {bluetoothState === 'connected' ? 'ON' : bluetoothState === 'pairing' ? 'PAIR' : 'OFF'}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1.5">
              <Bluetooth className={`w-5 h-5 ${
                bluetoothState === 'connected'
                  ? 'text-sky-500'
                  : bluetoothState === 'pairing'
                  ? 'text-amber-500 animate-bounce'
                  : 'text-gray-400 dark:text-gray-600'
              }`} />
              <div className="min-w-0">
                <p className="text-xs font-bold truncate">
                  {bluetoothState === 'connected' ? 'Galaxy_Buds_Pro' : bluetoothState === 'pairing' ? 'Searching...' : 'Disabled'}
                </p>
                <p className="text-[9px] text-gray-400 dark:text-gray-500 font-mono">
                  {bluetoothState === 'connected' ? 'Paired' : bluetoothState === 'pairing' ? 'Discoverable' : 'Inactive'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 border-b border-gray-100 dark:border-gray-800">
        <div className="relative flex items-center bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-1.5">
          <Search className="w-5 h-5 text-gray-400 dark:text-gray-500 mr-2" />
          <input
            type="text"
            placeholder="Search or start new chat"
            className="w-full bg-transparent border-none outline-none text-sm text-gray-800 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-800/50">
        {filteredChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">No conversations found</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Try searching another contact or message</p>
          </div>
        ) : (
          filteredChats.map((chat) => {
            const isSelected = chat.id === activeChatId;
            const lastMessage = chat.messages[chat.messages.length - 1];
            const isOnline = chat.contact.status === 'online' || chat.contact.status === 'typing...';

            return (
              <div
                key={chat.id}
                onClick={() => onSelectChat(chat.id)}
                className={`flex items-center gap-3 p-3 cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/20 border-l-4 border-emerald-500'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-800/40 border-l-4 border-transparent'
                }`}
              >
                {/* Contact Avatar */}
                <div className="relative flex-shrink-0">
                  <img
                    src={chat.contact.avatar}
                    alt={chat.contact.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {/* Online Badge */}
                  {isOnline && (
                    <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full" />
                  )}
                </div>

                {/* Conversation Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h2 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                      {chat.contact.name}
                    </h2>
                    <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
                      {lastMessage ? formatTime(lastMessage.timestamp) : ''}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1">
                    {chat.contact.status === 'typing...' ? (
                      <p className="text-xs text-emerald-500 font-medium italic animate-pulse">typing...</p>
                    ) : (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {lastMessage ? lastMessage.text : 'No messages yet'}
                      </p>
                    )}

                    {/* Unread Badge */}
                    {chat.unreadCount > 0 && (
                      <span className="bg-emerald-500 text-white font-bold text-[10px] min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center flex-shrink-0">
                        {chat.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* New Chat Modal Dialog */}
      {showNewChatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-sm w-full shadow-2xl p-6 relative">
            <button
              onClick={() => setShowNewChatModal(false)}
              className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-emerald-500" /> Start New Chat
            </h3>
            <form onSubmit={handleAddNewChatSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Contact Name
                </label>
                <input
                  type="text"
                  placeholder="Enter contact name..."
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-2 rounded-lg transition-colors duration-200"
              >
                Create Conversation
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
