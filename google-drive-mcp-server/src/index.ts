const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
} = require('@modelcontextprotocol/sdk/types.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { google } = require('googleapis');
const fs = require('fs/promises');
const path = require('path');
const { z } = require('zod');
const fastify = require('fastify');
const cors = require('@fastify/cors');
const { URL } = require('url');

// OAuth 2.0 Credentials
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const REDIRECT_URI = 'http://localhost:3002/auth/google/callback';
const TOKEN_PATH = path.join(process.cwd(), 'token.json');

// Type imports
import type { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';
import type { drive_v3 } from 'googleapis';
import type { FastifyInstance } from 'fastify';

// Validation schemas
const ListFilesSchema = z.object({
  folderId: z.string().optional(),
  query: z.string().optional(),
  maxResults: z.number().min(1).max(1000).default(10)
});

const FileOperationSchema = z.object({
  fileId: z.string().min(1, 'File ID is required')
});

const UploadFileSchema = z.object({
  name: z.string().min(1, 'File name is required'),
  content: z.string(),
  mimeType: z.string().optional(),
  folderId: z.string().optional()
});

const CreateFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required'),
  parentId: z.string().optional()
});

class GoogleDriveMCPServer {
  private server: any;
  private driveClient: drive_v3.Drive | null = null;
  private oauth2Client: any;
  private httpWebServer: FastifyInstance;
  private credentialsPath: string;

  constructor() {
    this.server = new Server(
      {
        name: 'google-drive-mcp-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI
    );

    this.httpWebServer = fastify({ logger: false });
    this.httpWebServer.register(cors, { origin: [
        'http://localhost:3004',
        'http://localhost:3003',
        'http://localhost:3002',
        'http://localhost:3001',
        'http://localhost:3000'
      ] 
    });

    // Path to your Google Drive API credentials JSON file (no longer used for service accounts)
    this.credentialsPath = process.env.GOOGLE_CREDENTIALS_PATH || 
      path.join(process.cwd(), 'credentials.json'); // Keep for now, might be useful for migration

    this.setupToolHandlers();
    this.setupOAuthWebServer();
  }

  private async initializeGoogleDriveClient(): Promise<void> {
    try {
      // Load tokens from file if they exist
      const tokenData = await fs.readFile(TOKEN_PATH, 'utf-8');
      const tokens = JSON.parse(tokenData);
      this.oauth2Client.setCredentials(tokens);

      this.oauth2Client.on('tokens', (newTokens: any) => {
        if (newTokens.refresh_token) {
          // Update the refresh token if it changes
          tokens.refresh_token = newTokens.refresh_token;
        }
        tokens.access_token = newTokens.access_token;
        fs.writeFile(TOKEN_PATH, JSON.stringify(tokens)).catch(console.error);
      });

      this.driveClient = google.drive({ version: 'v3', auth: this.oauth2Client });
      
      console.error('Google Drive client initialized successfully with OAuth2');
    } catch (error) {
      console.error('Failed to initialize Google Drive client (no valid tokens found):', error);
      // This is expected if no tokens are saved yet, not an error that needs to be thrown
      // The client will need to initiate the OAuth flow
      this.driveClient = null;
    }
  }

  private setupOAuthWebServer(): void {
    this.httpWebServer.get('/auth/google', (request: any, reply: any) => {
      const authUrl = this.oauth2Client.generateAuthUrl({
        access_type: 'offline',
        prompt: 'consent',
        scope: [
          'https://www.googleapis.com/auth/drive.readonly'
        ]
      });
      reply.send({ authUrl });
    });

    this.httpWebServer.get('/auth/google/callback', async (request: any, reply: any) => {
      const { code } = request.query;
      try {
        const { tokens } = await this.oauth2Client.getToken(code);
        this.oauth2Client.setCredentials(tokens);
        await fs.writeFile(TOKEN_PATH, JSON.stringify(tokens));
        // Redirect back to the frontend application after successful authentication
        console.error('Attempting to redirect to:', 'http://localhost:3000/home?auth_success=true');
        reply.redirect('http://localhost:3000/home?auth_success=true');
        console.error('OAuth2 tokens saved successfully. Redirect initiated.');
        // Re-initialize drive client with new tokens
        await this.initializeGoogleDriveClient();
      } catch (error) {
        console.error('Error during OAuth2 callback:', error);
        reply.status(500).send('Authentication failed.');
      }
    });

    // Handle generic tool calls from the client
    this.httpWebServer.post('/call_tool', async (request: any, reply: any) => {
      try {
        const { tool, args } = request.body;
        const result = await this._handleMcpToolCall(tool, args);
        reply.send(result);
      } catch (error: any) {
        console.error('Error handling /call_tool:', error);
        reply.status(500).send({ error: error.message });
      }
    });

    this.httpWebServer.post('/auth/google/disconnect', async (request: any, reply: any) => {
      try {
        await fs.unlink(TOKEN_PATH);
        this.oauth2Client.setCredentials(null);
        this.driveClient = null;
        reply.send('Disconnected successfully.');
        console.error('OAuth2 tokens deleted successfully.');
      } catch (error: any) {
        if (error.code === 'ENOENT') {
          reply.status(200).send('Already disconnected (no token file found).');
        } else {
          console.error('Error during disconnect:', error);
          reply.status(500).send('Disconnection failed.');
        }
      }
    });
  }

  private async _handleMcpToolCall(toolName: string, toolArgs: any): Promise<CallToolResult> {
    // Ensure authentication first for all tools except 'drive_authenticate' and 'drive_is_authenticated'
    if (toolName !== 'drive_authenticate' && toolName !== 'drive_is_authenticated') {
      if (!this.oauth2Client.credentials || !this.oauth2Client.credentials.access_token) {
        throw new McpError(ErrorCode.Unauthorized, 'Google Drive not authenticated. Please run drive_authenticate first.');
      }
      if (!this.driveClient) {
        await this.initializeGoogleDriveClient();
      }
    }

    try {
      switch (toolName) {
        case 'drive_authenticate':
          return this.handleAuthenticate();
        case 'drive_is_authenticated':
          return this.handleIsAuthenticated();
        case 'drive_list_files':
          return await this.handleListFiles(toolArgs);
        case 'drive_get_file':
          return await this.handleGetFile(toolArgs);
        case 'drive_download_file':
          return await this.handleDownloadFile(toolArgs);
        case 'drive_create_folder':
          return await this.handleCreateFolder(toolArgs);
        case 'drive_upload_file':
          return await this.handleUploadFile(toolArgs);
        case 'drive_delete_file':
          return await this.handleDeleteFile(toolArgs);
        default:
          throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${toolName}`);
      }
    } catch (error) {
      if (error instanceof McpError) {
        throw error;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new McpError(ErrorCode.InternalError, `Google Drive operation failed: ${errorMessage}`);
    }
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'drive_authenticate',
            description: 'Initiate Google Drive OAuth2 authentication flow',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'drive_is_authenticated',
            description: 'Check if Google Drive is authenticated',
            inputSchema: {
              type: 'object',
              properties: {},
              required: []
            }
          },
          {
            name: 'drive_list_files',
            description: 'List files and folders in Google Drive',
            inputSchema: {
              type: 'object',
              properties: {
                folderId: {
                  type: 'string',
                  description: 'ID of the folder to list files from (optional)'
                },
                query: {
                  type: 'string',
                  description: 'Search query to filter files (optional)'
                },
                maxResults: {
                  type: 'number',
                  description: 'Maximum number of files to return (1-1000)',
                  default: 10
                }
              },
              required: []
            }
          },
          {
            name: 'drive_get_file',
            description: 'Get details of a specific file',
            inputSchema: {
              type: 'object',
              properties: {
                fileId: {
                  type: 'string',
                  description: 'ID of the file to get details for'
                }
              },
              required: ['fileId']
            }
          },
          {
            name: 'drive_download_file',
            description: 'Download content of a file',
            inputSchema: {
              type: 'object',
              properties: {
                fileId: {
                  type: 'string',
                  description: 'ID of the file to download'
                }
              },
              required: ['fileId']
            }
          },
          {
            name: 'drive_create_folder',
            description: 'Create a new folder in Google Drive',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name of the folder to create'
                },
                parentId: {
                  type: 'string',
                  description: 'ID of the parent folder (optional)'
                }
              },
              required: ['name']
            }
          },
          {
            name: 'drive_upload_file',
            description: 'Upload a new file to Google Drive',
            inputSchema: {
              type: 'object',
              properties: {
                name: {
                  type: 'string',
                  description: 'Name of the file to upload'
                },
                content: {
                  type: 'string',
                  description: 'Content of the file'
                },
                mimeType: {
                  type: 'string',
                  description: 'MIME type of the file (optional)'
                },
                folderId: {
                  type: 'string',
                  description: 'ID of the folder to upload to (optional)'
                }
              },
              required: ['name', 'content']
            }
          },
          {
            name: 'drive_delete_file',
            description: 'Delete a file from Google Drive',
            inputSchema: {
              type: 'object',
              properties: {
                fileId: {
                  type: 'string',
                  description: 'ID of the file to delete'
                }
              },
              required: ['fileId']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      const { name, arguments: args } = request.params;
      return this._handleMcpToolCall(name, args);
    });
  }

  // New tool handlers for authentication
  private handleAuthenticate(): CallToolResult {
    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/drive.readonly'
      ]
    });
    return this.createTextResult(`Please open this URL in your browser to authenticate: ${authUrl}`);
  }

  private handleIsAuthenticated(): CallToolResult {
    const isAuthenticated = !!(this.oauth2Client.credentials && this.oauth2Client.credentials.access_token);
    return this.createTextResult(JSON.stringify({ authenticated: isAuthenticated }));
  }

  private createTextResult(content: string): CallToolResult {
    return {
      content: [
        {
          type: 'text',
          text: content
        } as TextContent
      ]
    };
  }

  // Tool handlers
  private async handleListFiles(args: any): Promise<CallToolResult> {
    const { folderId, query, maxResults } = ListFilesSchema.parse(args);
    
    let q = query || '';
    if (folderId) {
      q = q ? `${q} and '${folderId}' in parents` : `'${folderId}' in parents`;
    }

    const response = await this.driveClient!.files.list({
      q: q || undefined,
      pageSize: maxResults,
      fields: 'files(id,name,mimeType,size,modifiedTime,parents)',
      orderBy: 'modifiedTime desc'
    });

    const files = response.data.files || [];
    const result = files.map(file => ({
      id: file.id,
      name: file.name,
      mimeType: file.mimeType,
      size: file.size,
      modifiedTime: file.modifiedTime,
      isFolder: file.mimeType === 'application/vnd.google-apps.folder'
    }));

    return this.createTextResult(JSON.stringify(result, null, 2));
  }

  private async handleGetFile(args: any): Promise<CallToolResult> {
    const { fileId } = FileOperationSchema.parse(args);

    const response = await this.driveClient!.files.get({
      fileId,
      fields: 'id,name,mimeType,size,modifiedTime,createdTime,parents,webViewLink,webContentLink'
    });

    return this.createTextResult(JSON.stringify(response.data, null, 2));
  }

  private async handleDownloadFile(args: any): Promise<CallToolResult> {
    const { fileId } = FileOperationSchema.parse(args);

    // First get file metadata
    const fileResponse = await this.driveClient!.files.get({
      fileId,
      fields: 'id,name,mimeType'
    });

    const file = fileResponse.data;
    
    // Handle Google Workspace files (need to export)
    if (file.mimeType?.startsWith('application/vnd.google-apps.')) {
      let exportMimeType = 'text/plain';
      
      switch (file.mimeType) {
        case 'application/vnd.google-apps.document':
          exportMimeType = 'text/plain';
          break;
        case 'application/vnd.google-apps.spreadsheet':
          exportMimeType = 'text/csv';
          break;
        case 'application/vnd.google-apps.presentation':
          exportMimeType = 'text/plain';
          break;
      }
      
      const response = await this.driveClient!.files.export({
        fileId,
        mimeType: exportMimeType
      }, { responseType: 'text' });
      
      return this.createTextResult(`File: ${file.name}\nContent:\n${response.data}`);
    } else {
      // Regular file download
      const response = await this.driveClient!.files.get({
        fileId,
        alt: 'media'
      }, { responseType: 'text' });
      
      return this.createTextResult(`File: ${file.name}\nContent:\n${response.data}`);
    }
  }

  private async handleCreateFolder(args: any): Promise<CallToolResult> {
    const { name, parentId } = CreateFolderSchema.parse(args);

    const fileMetadata: any = {
      name,
      mimeType: 'application/vnd.google-apps.folder'
    };

    if (parentId) {
      fileMetadata.parents = [parentId];
    }

    const response = await this.driveClient!.files.create({
      requestBody: fileMetadata,
      fields: 'id,name,parents'
    });

    return this.createTextResult(`Created folder: ${response.data.name} (ID: ${response.data.id})`);
  }

  private async handleUploadFile(args: any): Promise<CallToolResult> {
    const { name, content, mimeType, folderId } = UploadFileSchema.parse(args);

    const fileMetadata: any = {
      name
    };

    if (folderId) {
      fileMetadata.parents = [folderId];
    }

    const media = {
      mimeType: mimeType || 'text/plain',
      body: content
    };

    const response = await this.driveClient!.files.create({
      requestBody: fileMetadata,
      media,
      fields: 'id,name,size'
    });

    return this.createTextResult(`Uploaded file: ${response.data.name} (ID: ${response.data.id})`);
  }

  private async handleDeleteFile(args: any): Promise<CallToolResult> {
    const { fileId } = FileOperationSchema.parse(args);

    // Get file name first
    const fileResponse = await this.driveClient!.files.get({
      fileId,
      fields: 'name'
    });

    await this.driveClient!.files.delete({ fileId });

    return this.createTextResult(`Deleted file: ${fileResponse.data.name} (ID: ${fileId})`);
  }

  public async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Google Drive MCP Server running on stdio');
    await this.httpWebServer.listen({ port: 3002 });
    console.error('OAuth2 Web Server running on http://localhost:3002');
  }
}

// Start the server
async function main(): Promise<void> {
  const server = new GoogleDriveMCPServer();
  
  process.on('SIGINT', async () => {
    console.error('\nShutting down Google Drive MCP Server...');
    process.exit(0);
  });
  
  await server.run();
}

// Only run if this is the main module
if (require.main === module) {
  main().catch((error) => {
    console.error('Failed to start server:', error);
    process.exit(1);
  });
}

module.exports = { GoogleDriveMCPServer };