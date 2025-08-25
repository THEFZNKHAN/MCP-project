
"use client";

import ServerCard from '@/components/ServerCard';
import GitServerCard from '@/components/GitServerCard';
import GoogleDriveServerCard from '@/components/GoogleDriveServerCard';
import PortiaIntegration from '@/components/PortiaIntegration';
import { useState } from 'react';
import { ServerConfig } from '@/lib/types';

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
    description: 'Cloud file storage and management',
  }
];

export default function Home() {
  const [gitConnected, setGitConnected] = useState(false);
  const [gitConfig, setGitConfig] = useState<ServerConfig | null>(null);
  const [driveConnected, setDriveConnected] = useState(false);
  const [driveConfig, setDriveConfig] = useState<ServerConfig | null>(null);

  const handleGitStateChange = (isConnected: boolean, config: ServerConfig | null) => {
    setGitConnected(isConnected);
    setGitConfig(config);
  };

  const handleDriveStateChange = (isConnected: boolean, config: ServerConfig | null) => {
    setDriveConnected(isConnected);
    setDriveConfig(config);
  };

  return (
    <div className="h-screen bg-black flex justify-center ">
      <div className="min-h-screen bg-gray-950 p-8 flex flex-col">
      {/* Header */}
      <div className="mb-8 mt-12">
        <div className='flex flex-row justify-between'>
        <h1 className="text-5xl font-bold text-white">MCP Servers</h1>
        <button
        className="bg-white text-gray-900 px-8 py-3 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-300 font-medium"
      >
        Get Config
      </button>
        </div>
        <h5 className="font-bold text-gray-300">Manage and configure your Model Context Protocol Servers</h5>
      </div>

      {/* Server Cards Container */}
      <div className="mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {servers.map((server, index) => {
            if (server.type === 'git') {
              return (
                <GitServerCard
                  key={index}
                  iconSrc={server.iconSrc}
                  title={server.title}
                  description={server.description}
                  onStateChange={handleGitStateChange}
                />
              );
            } else if (server.type === 'googleDrive') {
              return (
                <GoogleDriveServerCard
                  key={index}
                  iconSrc={server.iconSrc}
                  title={server.title}
                  description={server.description}
                  onStateChange={handleDriveStateChange}
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

      {/* Portia Integration */}
      <div className="flex justify-center">
        <PortiaIntegration
          gitConnected={gitConnected}
          gitConfig={gitConfig}
          driveConnected={driveConnected}
          driveConfig={driveConfig}
        />
      </div>
    </div>
    </div>
  );
}
