import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { 
  useListStudents, 
  useListConversations, 
  useCreateConversation, 
  useListMessages,
  getListConversationsQueryKey,
  getListMessagesQueryKey,
  Student
} from "@workspace/api-client-react";
import { CampusAvatar } from "@/components/campus/CampusAvatar";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { Loader2 } from "lucide-react";

export default function Campus() {
  const { data: students, isLoading: loadingStudents } = useListStudents();
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  // We need to fetch conversations to see if the selected student has one
  const { data: conversations, isLoading: loadingConversations } = useListConversations(
    { studentId: selectedStudent?.id },
    { query: { enabled: !!selectedStudent, queryKey: getListConversationsQueryKey({ studentId: selectedStudent?.id }) } }
  );

  const createConversation = useCreateConversation();
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);

  // Determine active conversation when selected student or conversations change
  useEffect(() => {
    if (selectedStudent && conversations) {
      if (conversations.length > 0) {
        setActiveConversationId(conversations[0].id);
      } else if (!createConversation.isPending) {
        // Create one if none exists
        createConversation.mutate(
          { data: { studentId: selectedStudent.id } },
          {
            onSuccess: (newConv) => {
              setActiveConversationId(newConv.id);
            }
          }
        );
      }
    } else if (!selectedStudent) {
      setActiveConversationId(null);
    }
  }, [selectedStudent, conversations]);

  const { data: messages = [] } = useListMessages(activeConversationId!, {
    query: { enabled: !!activeConversationId, queryKey: getListMessagesQueryKey(activeConversationId!) }
  });

  if (loadingStudents) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden relative bg-[#8FB996]">
      {/* Campus Background Scene */}
      <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
        {/* Simple drawn campus SVG background */}
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" className="w-full h-full object-cover opacity-80">
          <defs>
            <pattern id="grass" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
              <path d="M10 10 Q 15 5 20 10" stroke="#7AA782" fill="none" strokeWidth="1" strokeLinecap="round" />
              <path d="M60 40 Q 65 35 70 40" stroke="#7AA782" fill="none" strokeWidth="1" strokeLinecap="round" />
              <path d="M30 80 Q 35 75 40 80" stroke="#7AA782" fill="none" strokeWidth="1" strokeLinecap="round" />
            </pattern>
          </defs>
          <rect width="1000" height="1000" fill="url(#grass)" />
          
          {/* Paths */}
          <path d="M -100 500 Q 250 550 500 500 T 1100 500" fill="none" stroke="#DCCCA3" strokeWidth="60" strokeLinecap="round" />
          <path d="M 500 -100 Q 550 250 500 500 T 500 1100" fill="none" stroke="#DCCCA3" strokeWidth="60" strokeLinecap="round" />
          
          {/* Center Fountain/Plaza */}
          <circle cx="500" cy="500" r="100" fill="#DCCCA3" />
          <circle cx="500" cy="500" r="80" fill="#8FB996" />
          <circle cx="500" cy="500" r="40" fill="#4B8BBE" />
          
          {/* Buildings */}
          {/* Library */}
          <g transform="translate(150, 150)">
            <rect x="0" y="0" width="200" height="120" fill="#B48E75" rx="8" />
            <rect x="20" y="20" width="160" height="80" fill="#8B6C58" rx="4" />
            <path d="M 100 20 L 100 100" stroke="#B48E75" strokeWidth="4" />
            <path d="M 60 20 L 60 100" stroke="#B48E75" strokeWidth="4" />
            <path d="M 140 20 L 140 100" stroke="#B48E75" strokeWidth="4" />
          </g>

          {/* Dorms */}
          <g transform="translate(700, 200)">
            <rect x="0" y="0" width="150" height="180" fill="#C57B57" rx="8" />
            <rect x="20" y="20" width="30" height="30" fill="#F4E8C1" rx="2" />
            <rect x="60" y="20" width="30" height="30" fill="#F4E8C1" rx="2" />
            <rect x="100" y="20" width="30" height="30" fill="#F4E8C1" rx="2" />
            
            <rect x="20" y="70" width="30" height="30" fill="#F4E8C1" rx="2" />
            <rect x="60" y="70" width="30" height="30" fill="#F4E8C1" rx="2" />
            <rect x="100" y="70" width="30" height="30" fill="#F4E8C1" rx="2" />
          </g>

          {/* Science Center */}
          <g transform="translate(200, 700)">
            <circle cx="100" cy="100" r="80" fill="#A8B5B2" />
            <circle cx="100" cy="100" r="40" fill="#D3D9D8" />
          </g>

          {/* Trees */}
          <g fill="#4F7959">
            <circle cx="100" cy="400" r="30" />
            <circle cx="150" cy="450" r="40" />
            <circle cx="80" cy="480" r="35" />
            
            <circle cx="850" cy="750" r="45" />
            <circle cx="800" cy="800" r="35" />
            <circle cx="900" cy="820" r="40" />
            
            <circle cx="650" cy="100" r="35" />
            <circle cx="550" cy="150" r="40" />
          </g>
        </svg>
      </div>

      {/* Interactive Layer */}
      <div 
        className="absolute inset-0 z-10" 
        onClick={() => setSelectedStudent(null)}
      >
        {students?.map((student) => (
          <CampusAvatar
            key={student.id}
            student={student}
            isSelected={selectedStudent?.id === student.id}
            onClick={() => setSelectedStudent(student)}
          />
        ))}
      </div>

      {/* Slide-in Chat Panel */}
      <AnimatePresence>
        {selectedStudent && (
          <motion.div
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="absolute top-0 right-0 h-full z-30 shadow-2xl"
          >
            {activeConversationId ? (
              <ChatPanel
                student={selectedStudent}
                conversationId={activeConversationId}
                messages={messages}
                onClose={() => setSelectedStudent(null)}
              />
            ) : (
              <div className="w-[400px] h-full bg-card border-l border-border flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
