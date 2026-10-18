import React from "react";
import { cn } from "../../lib/utils";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  hoverEffect?: boolean;
}

export function Card({ className, hoverEffect = false, children, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-gray-800 bg-gray-900/60 backdrop-blur-md p-6 shadow-xl transition-all duration-300",
        hoverEffect && "hover:border-gray-700 hover:bg-gray-900/80 hover:shadow-2xl hover:shadow-emerald-500/5",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
