"use client";

import React, { useState } from 'react';
import ServerCard from '@/components/ServerCard';
import GitServerCard from '@/components/GitServerCard';
import GoogleDriveServerCard from '@/components/GoogleDriveServerCard';
import JsonModal from '@/components/JsonModal';
import { ServerConfig } from '@/lib/types';

interface ServerState {
  isConnected: boolean;
  config: ServerConfig | null;
}

const servers = [
  {
    type: 'git',
    iconSrc: '/git.svg',
    title: 'Git Server',
    description: 'A server for interacting with Git repositories.',
  },
  {
    type: 'googleDrive',
    iconSrc: '/drive.svg',
    title: 'Google Drive Server',
    description: 'Cloud file storage and management system',
  }
];

export default function Home() {
  const [allConfigs, setAllConfigs] = useState<ServerConfig | null>(null);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [serverStates, setServerStates] = useState<{
    git: ServerState;
    googleDrive: ServerState;
  }>({
    git: { isConnected: false, config: null },
    googleDrive: { isConnected: false, config: null }
  });

  // Function to update server state
  const updateServerState = (serverType: string, isConnected: boolean, config: ServerConfig | null) => {
    setServerStates(prev => ({
      ...prev,
      [serverType]: { isConnected, config }
    }));
  };

  // Function to collect all configurations
  const collectAllConfigs = (): ServerConfig => {
    const configs: ServerConfig = { mcpServers: {} };
    
    if (serverStates.git.isConnected && serverStates.git.config) {
      configs.mcpServers.git = serverStates.git.config.mcpServers.git;
    }
    
    if (serverStates.googleDrive.isConnected && serverStates.googleDrive.config) {
      configs.mcpServers.Drive = serverStates.googleDrive.config.mcpServers.Drive;
    }
    
    return configs;
  };

  // Function to handle Get Config button click
  const handleGetConfig = () => {
    const configs = collectAllConfigs();
    if (Object.keys(configs.mcpServers).length > 0) {
      setAllConfigs(configs);
      setShowConfigModal(true);
    } else {
      alert('No servers are currently connected. Please connect at least one server first.');
    }
  };

  const handleCloseConfigModal = () => {
    setShowConfigModal(false);
    setAllConfigs(null);
  };

  return (
    <div className='h-screen bg-gray-900 flex justify-center'>
      <div className=" p-8 flex flex-col">
        {/* Header */}
        <div className="mb-8 mt-12">
          <div className='flex flex-row justify-between'>
          <h1 className="text-5xl font-bold text-white">MCP Servers</h1>
          <button
            onClick={handleGetConfig}
            className="bg-white text-gray-900 px-8 py-3 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 font-medium"
          >
            Get Config
          </button>
          </div>
          <h5 className="font-bold text-gray-300">Manage and configure your Model Context Protocol Servers</h5>
        </div>

        {/* Server Cards Container just below the header */}
        <div className="flex-grow flex items-center justify-center">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {servers.map((server, index) => {
              if (server.type === 'git') {
                return (
                  <GitServerCard
                    key={index}
                    iconSrc={server.iconSrc}
                    title={server.title}
                    description={server.description}
                    onStateChange={(isConnected, config) => updateServerState('git', isConnected, config)}
                  />
                );
              } else if (server.type === 'googleDrive') {
                return (
                  <GoogleDriveServerCard
                    key={index}
                    iconSrc={server.iconSrc}
                    title={server.title}
                    description={server.description}
                    onStateChange={(isConnected, config) => updateServerState('googleDrive', isConnected, config)}
                  />
                );
              }
              return (
                <ServerCard
                  key={index}
                  iconSrc={server.iconSrc}
                  title={server.title}
                  description={server.description}
                />
              );
            })}
          </div>
        </div>

        {/* Configuration Modal */}
        {allConfigs && (
          <JsonModal
            isOpen={showConfigModal}
            onClose={handleCloseConfigModal}
            jsonOutput={allConfigs}
            title="All MCP Server Configurations"
          />
        )}
      </div>
    </div>
  );
}
