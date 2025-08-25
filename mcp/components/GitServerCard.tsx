"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import JsonModal from './JsonModal';
import Image from 'next/image';
import { ServerConfig } from '@/lib/types';

interface ServerCardProps {
  iconSrc: string;
  title: string;
  description: string;
  onStateChange?: (isConnected: boolean, config: ServerConfig | null) => void;
}

const GitServerCard: React.FC<ServerCardProps> = ({
  iconSrc,
  title,
  description,
  onStateChange,
}) => {
  const [output, setOutput] = useState<ServerConfig | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  // Notify parent component of state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange(isConnected, output);
    }
  }, [isConnected, output, onStateChange]);

  const handleGetCredentials = async () => {
    if (isConnected) {
      // Handle disconnect
      setIsConnected(false);
      setOutput(null);
      return;
    }

    // Handle connect
    setIsConnecting(true);
    
    // Simulate connection process for 3 seconds
    setTimeout(() => {
      setIsConnecting(false);
      setIsConnected(true);
      
      // Set the MCP config when connected
      const jsonOutput = {
        mcpServers: {
          git: {
            command: "node",
            args: ["/Users/shahma/Downloads/MCP-project/git-mcp-server/dist/index.js"],
            env: {}
          }
        }
      };
      setOutput(jsonOutput);
    }, 3000);
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleShowConfig = () => {
    setShowModal(true);
  };

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

        {/* Git Badge */}
        <div className="inline-block">
          <span className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-xs font-medium">Git</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-700"></div>

      {/* Connect Button and Status */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <Button
            className={`w-fit px-6 py-2 rounded-lg font-medium ${
              isConnecting 
                ? 'bg-gray-600 text-white cursor-not-allowed' 
                : isConnected 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-white text-gray-900 hover:bg-gray-100'
            }`}
            onClick={handleGetCredentials}
            disabled={isConnecting}
          >
            {isConnecting ? 'Connecting...' : isConnected ? 'Disconnect' : 'Connect'}
          </Button>

          {isConnected && (
            <Button
              className="w-fit bg-gray-700 text-white hover:bg-gray-600 px-6 py-2 rounded-lg font-medium"
              onClick={handleShowConfig}
            >
              Configuration
            </Button>
          )}
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            isConnecting ? 'bg-yellow-500' : isConnected ? 'bg-green-500' : 'bg-gray-500'
          }`}></div>
          <span className={`text-sm ${
            isConnecting ? 'text-yellow-400' : isConnected ? 'text-green-400' : 'text-gray-500'
          }`}>
            {isConnecting ? 'Connecting...' : isConnected ? 'Connected' : 'Offline'}
          </span>
        </div>
      </div>



              {/* JSON Modal */}
        {output && (
          <JsonModal
            isOpen={showModal}
            onClose={handleCloseModal}
            jsonOutput={output}
            title="Git Server Configuration"
          />
        )}
    </div>
  );
};

export default GitServerCard;