import React, { useState, useRef, useEffect } from 'react';
import type { Chat, UserProfile } from '../types';
import {
  Phone,
  Video,
  MoreVertical,
  Paperclip,
  Smile,
  Send,
  Mic,
  ArrowLeft,
  Check,
  CheckCheck,
  Image as ImageIcon,
  FileText,
  X
} from 'lucide-react';

interface ChatWindowProps {
  chat: Chat | null;
  currentUser: UserProfile;
  onSendMessage: (text: string, attachment?: { type: 'image' | 'file'; url: string; name: string }) => void;
  onBack: () => void;
  onStartTyping: () => void;
}

const EMOJIS = ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🥸', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🫣', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😬', '🫠', '🙄', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '😵‍💫', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕', '🤑', '🤠', '😈', '👿', '👹', '👺', '🤡', '💩', '👻', '💀', '☠️', '👽', '👾', 'robot', '🎃', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾', '👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🫰', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❤️‍🔥', '❤️‍🩹', '💖', '💗', '💓', '💞', '💕', '💟', '❣️', '💔'];

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  currentUser,
  onSendMessage,
  onBack,
  onStartTyping,
}) => {
  const [inputText, setInputText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chat?.messages]);

  if (!chat) {
    return (
      <div className="hidden md:flex flex-col items-center justify-center h-full bg-gray-50 dark:bg-gray-950/40 p-8 text-center select-none transition-colors duration-200">
        <div className="w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center mb-6 text-emerald-600 dark:text-emerald-400">
          <Send className="w-12 h-12 transform rotate-12" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 mb-2">SPPChat Web Application</h2>
        <p className="text-gray-500 dark:text-gray-400 max-w-md text-sm leading-relaxed">
          Send and receive messages with real-time feedback. Click on a contact to initiate a secure, highly-responsive conversations thread. Toggle themes to suit your style!
        </p>
      </div>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputText(e.target.value);
    onStartTyping();
  };

  const handleSend = () => {
    if (inputText.trim()) {
      onSendMessage(inputText.trim());
      setInputText('');
      setShowEmojiPicker(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleAddEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    setShowEmojiPicker(false);
    inputRef.current?.focus();
  };

  const handleSendAttachment = (type: 'image' | 'file') => {
    setShowAttachmentMenu(false);
    if (type === 'image') {
      onSendMessage("Sent an image attachment", {
        type: 'image',
        url: 'https://images.unsplash.com/photo-1579202673506-ca3ce28943ef?w=600',
        name: 'creative_artwork_spp.jpg'
      });
    } else {
      onSendMessage("Sent a file document attachment", {
        type: 'file',
        url: '#',
        name: 'SPPChat_Design_Specifications.pdf'
      });
    }
  };

  const handleVoiceMessageMock = () => {
    onSendMessage("🎤 Voice message (0:12)");
  };

  const formatMessageTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#efeae2] dark:bg-[#0b141a] relative transition-colors duration-200">
      {/* Dynamic Header */}
      <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-[#202c33] border-b border-gray-200 dark:border-gray-800 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          {/* Back button for mobile viewports */}
          <button
            onClick={onBack}
            className="md:hidden p-1.5 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-200"
            aria-label="Back to contacts list"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="relative">
            <img
              src={chat.contact.avatar}
              alt={chat.contact.name}
              className="w-10 h-10 rounded-full object-cover"
            />
            {(chat.contact.status === 'online' || chat.contact.status === 'typing...') && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-gray-900 rounded-full" />
            )}
          </div>

          <div>
            <h2 className="font-bold text-gray-800 dark:text-gray-100 text-sm">
              {chat.contact.name}
            </h2>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              {chat.contact.status}
            </p>
          </div>
        </div>

        {/* Options / Calling Trigger Icons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => alert(`Initiating phone audio call with ${chat.contact.name}...`)}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors duration-200"
            title="Audio Call"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button
            onClick={() => alert(`Initiating instant video conference call with ${chat.contact.name}...`)}
            className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors duration-200"
            title="Video Call"
          >
            <Video className="w-5 h-5" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowOptionsMenu(!showOptionsMenu)}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors duration-200"
              title="More options"
            >
              <MoreVertical className="w-5 h-5" />
            </button>
            {showOptionsMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-100 dark:border-gray-700 py-1 z-50">
                <button
                  onClick={() => {
                    setShowOptionsMenu(false);
                    alert("Contact information profile loaded successfully.");
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Contact Info
                </button>
                <button
                  onClick={() => {
                    setShowOptionsMenu(false);
                    alert("Chat thread has been muted for notifications.");
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700"
                >
                  Mute Notifications
                </button>
                <button
                  onClick={() => {
                    setShowOptionsMenu(false);
                    alert("Conversation cleared.");
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20"
                >
                  Clear Chat Messages
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Feed Area with custom scrollbar and Whatsapp BG decoration */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#e5ddd5] dark:bg-opacity-20 relative bg-cover"
        style={{
          backgroundImage: `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`,
          backgroundBlendMode: 'overlay'
        }}
      >
        {chat.messages.map((msg) => {
          const isMe = msg.senderId === currentUser.id;

          return (
            <div
              key={msg.id}
              className={`flex w-full ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              {/* Message Bubble container */}
              <div
                className={`relative max-w-[75%] px-4 py-2 rounded-xl shadow-sm text-sm break-words transition-all duration-200 ${
                  isMe
                    ? 'bg-[#d9fdd3] dark:bg-[#005c4b] text-gray-900 dark:text-gray-100 rounded-tr-none'
                    : 'bg-white dark:bg-[#202c33] text-gray-900 dark:text-gray-100 rounded-tl-none'
                }`}
              >
                {/* Bubble tail indicators using pure Tailwind CSS pseudo-classes or custom shapes */}
                <div
                  className={`absolute top-0 w-2.5 h-3 ${
                    isMe
                      ? '-right-2 bg-[#d9fdd3] dark:bg-[#005c4b] clip-path-right'
                      : '-left-2 bg-white dark:bg-[#202c33] clip-path-left'
                  }`}
                  style={{
                    clipPath: isMe
                      ? 'polygon(0 0, 0 100%, 100% 0)'
                      : 'polygon(100% 0, 0 0, 100% 100%)'
                  }}
                />

                {/* Render Attachments if present */}
                {msg.attachment && (
                  <div className="mb-2 overflow-hidden rounded-lg max-w-sm">
                    {msg.attachment.type === 'image' ? (
                      <div className="relative group cursor-pointer">
                        <img
                          src={msg.attachment.url}
                          alt={msg.attachment.name}
                          className="w-full h-auto max-h-60 object-cover rounded-lg"
                        />
                        <span className="absolute bottom-1 right-1 bg-black/50 text-[10px] text-white px-1.5 py-0.5 rounded">
                          Image Attachment
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 p-2.5 bg-gray-50 dark:bg-black/30 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <FileText className="w-8 h-8 text-red-500" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-xs text-gray-900 dark:text-gray-100 truncate">
                            {msg.attachment.name}
                          </p>
                          <p className="text-[10px] text-gray-500 dark:text-gray-400">PDF Document</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Text Content */}
                <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                {/* Message Timestamp & Checkmarks footer */}
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-gray-500 dark:text-gray-400 select-none">
                  <span>{formatMessageTime(msg.timestamp)}</span>
                  {isMe && (
                    <span className="flex items-center">
                      {msg.status === 'sent' ? (
                        <Check className="w-3.5 h-3.5 text-gray-400" />
                      ) : msg.status === 'delivered' ? (
                        <CheckCheck className="w-3.5 h-3.5 text-gray-400" />
                      ) : (
                        <CheckCheck className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Interactive Floating Emoji Drawer */}
      {showEmojiPicker && (
        <div className="absolute bottom-[60px] left-4 right-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-3 z-30 max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700 pb-2 mb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">Select Emoji</span>
            <button
              onClick={() => setShowEmojiPicker(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-8 gap-2 text-2xl justify-items-center">
            {EMOJIS.map((emoji, idx) => (
              <button
                key={idx}
                onClick={() => handleAddEmoji(emoji)}
                className="hover:scale-125 transition-transform duration-100 p-1"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Floating Attachment Menu Modal */}
      {showAttachmentMenu && (
        <div className="absolute bottom-[60px] left-14 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl p-2 z-40 flex flex-col gap-1 w-44">
          <button
            onClick={() => handleSendAttachment('image')}
            className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ImageIcon className="w-5 h-5 text-purple-500" />
            <span>Photos & Videos</span>
          </button>
          <button
            onClick={() => handleSendAttachment('file')}
            className="flex items-center gap-2.5 px-3 py-2 text-xs text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <FileText className="w-5 h-5 text-indigo-500" />
            <span>Document File</span>
          </button>
        </div>
      )}

      {/* Input Message Bar */}
      <div className="p-3 bg-gray-100 dark:bg-[#1f2c34] border-t border-gray-200 dark:border-gray-800 flex items-end gap-3 z-10">
        <div className="flex items-center gap-1.5">
          {/* Emoji Trigger Button */}
          <button
            onClick={() => {
              setShowEmojiPicker(!showEmojiPicker);
              setShowAttachmentMenu(false);
            }}
            className={`p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors ${
              showEmojiPicker ? 'text-emerald-500 dark:text-emerald-400 bg-gray-200 dark:bg-gray-700' : ''
            }`}
            title="Emojis"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Attachment Button */}
          <button
            onClick={() => {
              setShowAttachmentMenu(!showAttachmentMenu);
              setShowEmojiPicker(false);
            }}
            className={`p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors ${
              showAttachmentMenu ? 'text-emerald-500 dark:text-emerald-400 bg-gray-200 dark:bg-gray-700' : ''
            }`}
            title="Attach file"
          >
            <Paperclip className="w-5 h-5" />
          </button>
        </div>

        {/* Auto-Expanding Textarea Input Area */}
        <div className="flex-1 bg-white dark:bg-[#2a3942] rounded-xl px-4 py-1.5 flex items-center shadow-sm">
          <textarea
            ref={inputRef}
            placeholder="Type a message..."
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            rows={1}
            className="w-full bg-transparent border-none outline-none resize-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 max-h-24 align-middle py-1"
            style={{ height: 'auto' }}
          />
        </div>

        {/* Dynamic Send / Mic Voice trigger icon */}
        <div>
          {inputText.trim() ? (
            <button
              onClick={handleSend}
              className="p-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition-all duration-150 transform active:scale-95"
              title="Send message"
            >
              <Send className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={handleVoiceMessageMock}
              className="p-3 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-md transition-all duration-150 transform active:scale-95"
              title="Record voice message"
            >
              <Mic className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
