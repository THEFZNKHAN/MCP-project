'use client';

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { ServerConfig } from '@/lib/types';

interface PortiaIntegrationProps {
  gitConnected: boolean;
  gitConfig: ServerConfig | null;
  driveConnected: boolean;
  driveConfig: ServerConfig | null;
}

const PortiaIntegration: React.FC<PortiaIntegrationProps> = ({
  gitConnected,
  gitConfig,
  driveConnected,
  driveConfig,
}) => {
  const [activeServers, setActiveServers] = useState<string[]>([]);
  const [selectedServer, setSelectedServer] = useState<string>('');
  const [serverResponse, setServerResponse] = useState<string>('');

  useEffect(() => {
    const servers = [];
    if (gitConnected) servers.push('Git');
    if (driveConnected) servers.push('Google Drive');
    setActiveServers(servers);
  }, [gitConnected, driveConnected]);

  const handleServerAction = async (action: string) => {
    if (!selectedServer) {
      setServerResponse('Please select a server first');
      return;
    }

    let response = '';
    
    if (selectedServer === 'Git') {
      switch (action) {
        case 'status':
          response = 'Git server is ready for repository operations';
          break;
        case 'list':
          response = 'Available repositories:\n- mcp-project (main)\n- git-mcp-server\n- google-drive-mcp-server';
          break;
        case 'branch':
          response = 'Current branch: main\nAvailable branches: main, develop, feature/ui-updates';
          break;
        default:
          response = 'Unknown action for Git server';
      }
    } else if (selectedServer === 'Google Drive') {
      switch (action) {
        case 'status':
          response = 'Google Drive server is authenticated and ready';
          break;
        case 'list':
          response = 'Recent files:\n- project-docs.pdf\n- meeting-notes.docx\n- images/';
          break;
        case 'quota':
          response = 'Storage used: 2.1 GB / 15 GB (14% used)';
          break;
        default:
          response = 'Unknown action for Google Drive server';
      }
    }

    setServerResponse(response);
  };

  const getServerConfig = (serverName: string) => {
    if (serverName === 'Git') return gitConfig;
    if (serverName === 'Google Drive') return driveConfig;
    return null;
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-white">
            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <div>
          <h2 className="text-2xl font-bold text-white">Portia MCP Integration</h2>
          <p className="text-gray-400">Intelligent orchestration of your MCP servers</p>
        </div>
      </div>

      {/* Server Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
          <h3 className="text-lg font-semibold text-white mb-3">Connected Servers</h3>
          <div className="space-y-2">
            {activeServers.map(server => (
              <div key={server} className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-green-400 text-sm">{server}</span>
              </div>
            ))}
            {activeServers.length === 0 && (
              <span className="text-gray-500 text-sm">No servers connected</span>
            )}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
          <h3 className="text-lg font-semibold text-white mb-3">Server Selection</h3>
          <select
            value={selectedServer}
            onChange={(e) => setSelectedServer(e.target.value)}
            className="w-full bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select a server...</option>
            {activeServers.map(server => (
              <option key={server} value={server}>{server}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Actions */}
      {selectedServer && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
          <h3 className="text-lg font-semibold text-white mb-3">Server Actions</h3>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => handleServerAction('status')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              Status
            </Button>
            <Button
              onClick={() => handleServerAction('list')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              List
            </Button>
            <Button
              onClick={() => handleServerAction('branch')}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm"
            >
              Branch/Quota
            </Button>
          </div>
        </div>
      )}

      {/* Response */}
      {serverResponse && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
          <h3 className="text-lg font-semibold text-white mb-3">Server Response</h3>
          <pre className="bg-gray-900 p-4 rounded-md text-sm overflow-auto w-full text-gray-300 whitespace-pre-wrap">
            {serverResponse}
          </pre>
        </div>
      )}

      {/* MCP Configuration */}
      {selectedServer && (
        <div className="bg-gray-800 rounded-lg p-4 border border-gray-600">
          <h3 className="text-lg font-semibold text-white mb-3">MCP Configuration</h3>
          <pre className="bg-gray-900 p-4 rounded-md text-sm overflow-auto w-full text-gray-300">
            <code>{JSON.stringify(getServerConfig(selectedServer), null, 2)}</code>
          </pre>
        </div>
      )}
    </div>
  );
};

export default PortiaIntegration;
