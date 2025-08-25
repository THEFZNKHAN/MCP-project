'use client';

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

const GoogleDriveServerCard: React.FC<ServerCardProps> = ({
  iconSrc,
  title,
  description,
  onStateChange,
}) => {
  const [output, setOutput] = useState<ServerConfig | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [mcpConfig, setMcpConfig] = useState<ServerConfig | null>(null);

  // Notify parent component of state changes
  useEffect(() => {
    if (onStateChange) {
      onStateChange(isAuthenticated, mcpConfig);
    }
  }, [isAuthenticated, mcpConfig, onStateChange]);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('http://localhost:3002/call_tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tool: 'drive_is_authenticated',
          args: {},
        }),
      });
      const data = await response.json();
      const authenticated = JSON.parse(data.content[0].text).authenticated;
      setIsAuthenticated(authenticated);
      if (authenticated) {
        const config = {
          mcpServers: {
            Drive: {
              command: "node",
              args: [
                "/Users/shahma/Downloads/MCP-project/google-drive-mcp-server/dist/index.js"
              ]
            }
          }
        };
        setMcpConfig(config);
      }
    } catch (error) {
      console.error('Error checking authentication status:', error);
      setIsAuthenticated(false);
      setMcpConfig(null);
    }
  };

  useEffect(() => {
    const handleOAuthRedirect = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const authSuccess = urlParams.get('auth_success');
      console.log('handleOAuthRedirect: auth_success parameter', authSuccess);

      if (authSuccess === 'true') {
        urlParams.delete('auth_success');
        const newUrl = `${window.location.pathname}${urlParams.toString() ? '?' + urlParams.toString() : ''}`;
        window.history.replaceState({}, document.title, newUrl);
        console.log('handleOAuthRedirect: Calling checkAuthStatus after auth_success');
        checkAuthStatus();
      }
    };

    handleOAuthRedirect();
    console.log('useEffect: Calling checkAuthStatus on mount');
    checkAuthStatus();
  }, []);

  const handleConnect = async () => {
    try {
      const response = await fetch('http://localhost:3002/auth/google');
      const data = await response.json();
      const authUrl = data.authUrl;
      window.location.assign(authUrl);
      await checkAuthStatus();
    } catch (error) {
      console.error('Error initiating Google OAuth:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch('http://localhost:3002/auth/google/disconnect', {
        method: 'POST',
      });
      setIsAuthenticated(false);
      setMcpConfig(null);
      setOutput(null);
      console.log('Google Drive disconnected successfully.');
    } catch (error) {
      console.error('Error disconnecting Google Drive:', error);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  const handleShowConfig = () => {
    setShowModal(true);
    setOutput(mcpConfig);
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

        {/* Google Drive Badge */}
        <div className="inline-block">
          <span className="bg-gray-700 text-gray-300 px-3 py-1 rounded-full text-xs font-medium">Drive</span>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-700"></div>

      {/* Connect Button and Status */}
      <div className="space-y-4">
        <div className="flex gap-4">
          <Button
            className={`w-fit px-6 py-2 rounded-lg font-medium ${
              isAuthenticated 
                ? 'bg-red-600 text-white hover:bg-red-700' 
                : 'bg-white text-gray-900 hover:bg-gray-100'
            }`}
            onClick={isAuthenticated ? handleDisconnect : handleConnect}
          >
            {isAuthenticated ? 'Disconnect' : 'Connect'}
          </Button>

          {isAuthenticated && (
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
          <div className={`w-2 h-2 rounded-full ${isAuthenticated ? 'bg-green-500' : 'bg-gray-500'}`}></div>
          <span className={`text-sm ${isAuthenticated ? 'text-green-400' : 'text-gray-500'}`}>
            {isAuthenticated ? 'Connected' : 'Offline'}
          </span>
        </div>
      </div>



              {/* JSON Modal */}
        {output && (
          <JsonModal
            isOpen={showModal}
            onClose={handleCloseModal}
            jsonOutput={output}
            title="Google Drive Server Configuration"
          />
        )}
    </div>
  );
};

export default GoogleDriveServerCard;
