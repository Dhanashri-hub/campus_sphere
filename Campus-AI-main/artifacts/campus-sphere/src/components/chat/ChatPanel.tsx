import React, { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getListMessagesQueryKey, getListConversationsQueryKey } from "@workspace/api-client-react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Student, Message } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  student: Student;
  conversationId: number;
  messages: Message[];
  onClose: () => void;
}

export function ChatPanel({ student, conversationId, messages, onClose }: ChatPanelProps) {
  const [input, setInput] = React.useState("");
  const [isStreaming, setIsStreaming] = React.useState(false);
  const [streamingContent, setStreamingContent] = React.useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const scrollToBottom = () => {
    if (scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  // Scroll to bottom when messages or streaming content changes
  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;

    const currentInput = input;
    setInput("");
    setIsStreaming(true);
    setStreamingContent("");

    // Optimistically update the UI with user's message
    queryClient.setQueryData<Message[]>(getListMessagesQueryKey(conversationId), (old = []) => [
      ...old,
      {
        id: Date.now(), // temporary ID
        conversationId,
        role: "user",
        content: currentInput,
        createdAt: new Date().toISOString()
      }
    ]);

    try {
      const res = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: currentInput }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";
      let lineBuffer = ""; // holds partial lines across chunk boundaries

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        lineBuffer += decoder.decode(value, { stream: true });
        const lines = lineBuffer.split('\n');
        // Keep the last (possibly incomplete) line in the buffer
        lineBuffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.done) break;
              if (data.content) {
                accumulatedContent += data.content;
                setStreamingContent(accumulatedContent);
                scrollToBottom();
              }
            } catch {
              // ignore malformed SSE lines
            }
          }
        }
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsStreaming(false);
      setStreamingContent("");
      // Refresh the query to get the actual IDs and exact server state
      queryClient.invalidateQueries({ queryKey: getListMessagesQueryKey(conversationId) });
      queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
    }
  };

  return (
    <div className="flex flex-col h-full bg-card shadow-2xl border-l border-border w-[400px]">
      {/* Header */}
      <div className="p-4 border-b border-border bg-sidebar/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border-2 border-background shadow-sm" style={{ backgroundColor: student.avatarColor }}>
            <AvatarFallback>{student.avatarEmoji}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-serif font-bold text-lg leading-tight flex items-center gap-2">
              {student.name}
              <span className={cn(
                "w-2.5 h-2.5 rounded-full inline-block",
                student.isOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-gray-300"
              )} />
            </h3>
            <p className="text-xs text-muted-foreground flex gap-1">
              <span className="font-medium text-primary">{student.role}</span> • {student.specialty}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full shrink-0">
          <span className="sr-only">Close</span>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
            <path d="M11.7816 4.03157C12.0062 3.80702 12.0062 3.44295 11.7816 3.2184C11.5571 2.99385 11.193 2.99385 10.9685 3.2184L7.50005 6.68682L4.03164 3.2184C3.80708 2.99385 3.44301 2.99385 3.21846 3.2184C2.99391 3.44295 2.99391 3.80702 3.21846 4.03157L6.68688 7.49999L3.21846 10.9684C2.99391 11.193 2.99391 11.557 3.21846 11.7816C3.44301 12.0061 3.80708 12.0061 4.03164 11.7816L7.50005 8.31316L10.9685 11.7816C11.193 12.0061 11.5571 12.0061 11.7816 11.7816C12.0062 11.557 12.0062 11.193 11.7816 10.9684L8.31322 7.49999L11.7816 4.03157Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
          </svg>
        </Button>
      </div>

      {/* Personality Pill */}
      <div className="px-4 py-2 bg-accent/20 border-b border-accent/30 shrink-0">
        <p className="text-xs text-accent-foreground text-center italic">
          "{student.personality}"
        </p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="space-y-4">
          {messages.length === 0 && !isStreaming ? (
            <div className="flex flex-col items-center justify-center h-40 text-center space-y-3 opacity-50">
              <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center text-xl">
                👋
              </div>
              <p className="text-sm">Say hi to {student.name}!</p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm",
                  msg.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground rounded-tr-sm"
                    : "mr-auto bg-muted text-muted-foreground rounded-tl-sm"
                )}
              >
                <span className="text-sm whitespace-pre-wrap">{msg.content}</span>
                <span className={cn(
                  "text-[10px] mt-1 opacity-70",
                  msg.role === "user" ? "text-right" : "text-left"
                )}>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            ))
          )}
          
          {/* Streaming Indicator */}
          {isStreaming && (
            <div className="flex flex-col max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm mr-auto bg-muted text-muted-foreground rounded-tl-sm">
              <span className="text-sm whitespace-pre-wrap">
                {streamingContent}
                <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse align-middle" />
              </span>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 bg-background border-t border-border shrink-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Chat with ${student.name}...`}
            disabled={isStreaming}
            className="rounded-full bg-muted/50 border-muted-foreground/20 focus-visible:ring-primary"
          />
          <Button 
            type="submit" 
            size="icon" 
            disabled={!input.trim() || isStreaming}
            className="rounded-full shrink-0"
          >
            {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
