import React from "react";
import { Student } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

interface CampusAvatarProps {
  student: Student;
  onClick: () => void;
  isSelected?: boolean;
}

export function CampusAvatar({ student, onClick, isSelected }: CampusAvatarProps) {
  return (
    <div
      className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10"
      style={{
        left: `${student.positionX}%`,
        top: `${student.positionY}%`,
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    >
      <div className="flex flex-col items-center">
        {/* Tooltip bubble (visible on hover) */}
        <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none w-max max-w-[120px]">
          <div className="bg-popover text-popover-foreground text-xs px-2 py-1 rounded-md shadow-md text-center">
            {student.specialty}
          </div>
          <div className="w-2 h-2 bg-popover transform rotate-45 absolute -bottom-1 left-1/2 -translate-x-1/2"></div>
        </div>

        {/* Avatar */}
        <div 
          className={cn(
            "relative w-12 h-12 rounded-full border-2 shadow-lg flex items-center justify-center text-xl transition-transform duration-200",
            isSelected ? "scale-110 border-primary ring-4 ring-primary/20" : "border-white group-hover:scale-110 hover-elevate"
          )}
          style={{ backgroundColor: student.avatarColor }}
        >
          {student.avatarEmoji}
          
          {/* Online Indicator */}
          <div className={cn(
            "absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white",
            student.isOnline ? "bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" : "bg-gray-300"
          )} />
        </div>

        {/* Name Label */}
        <div className={cn(
          "mt-1.5 px-2 py-0.5 rounded-full text-xs font-semibold shadow-sm transition-colors",
          isSelected 
            ? "bg-primary text-primary-foreground" 
            : "bg-white/90 text-foreground backdrop-blur-sm group-hover:bg-white"
        )}>
          {student.name}
        </div>
      </div>
    </div>
  );
}
