import React from 'react';
import { Button } from "@/components/ui/button";
import Image from 'next/image';

interface ServerCardProps {
  iconSrc: string;
  title: string;
  description: string;
}

const ServerCard: React.FC<ServerCardProps> = ({
  iconSrc,
  title,
  description,
}) => {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-80 space-y-6">
      {/* Icon */}
      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
        <Image src={iconSrc} alt={`${title} Icon`} width={24} height={24} className="text-white" />
      </div>

      {/* Title and Description */}
      <div className="space-y-3">
        <h3 className="text-white text-xl font-semibold">{title}</h3>
        <p className="text-gray-400 text-sm leading-relaxed">{description}</p>

        {/* Server Badge */}
        <div className="inline-block">
          <span className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-xs font-medium">Server</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-700"></div>

      {/* Connect Button and Status */}
      <div className="space-y-4">
        <Button
          className="w-fit bg-white text-gray-900 hover:bg-gray-100 px-6 py-2 rounded-lg font-medium"
        >
          Connect
        </Button>

        {/* Offline Status */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
          <span className="text-gray-500 text-sm">Offline</span>
        </div>
      </div>
    </div>
  );
};

export default ServerCard;
