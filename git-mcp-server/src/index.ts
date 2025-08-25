const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError
} = require('@modelcontextprotocol/sdk/types.js');
const simpleGit = require('simple-git');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const path = require('path');
const fs = require('fs/promises');
const { z } = require('zod');

// Type imports for TypeScript (these won't affect runtime)
import type { SimpleGit, StatusResult, LogResult, BranchSummary } from 'simple-git';
import type { CallToolResult, TextContent } from '@modelcontextprotocol/sdk/types.js';

// Validation schemas
const RepoPathSchema = z.object({
  repoPath: z.string().min(1, 'Repository path is required')
});

const CommitSchema = z.object({
  repoPath: z.string().min(1, 'Repository path is required'),
  message: z.string().min(1, 'Commit message is required'),
  files: z.array(z.string()).optional()
});

const BranchSchema = z.object({
  repoPath: z.string().min(1, 'Repository path is required'),
  branchName: z.string().min(1, 'Branch name is required')
});

const PushPullSchema = z.object({
  repoPath: z.string().min(1, 'Repository path is required'),
  remote: z.string().default('origin'),
  branch: z.string().optional()
});

const CloneSchema = z.object({
  repoUrl: z.string().url('Invalid repository URL'),
  targetPath: z.string().min(1, 'Target path is required'),
  branch: z.string().optional()
});

const AddFilesSchema = z.object({
  repoPath: z.string().min(1, 'Repository path is required'),
  files: z.array(z.string()).min(1, 'At least one file must be specified')
});

class GitMCPServer {
  private server: any;

  constructor() {
    this.server = new Server(
      {
        name: 'git-mcp-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.setupToolHandlers();
  }

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'git_status',
            description: 'Get the current status of a git repository',
            inputSchema: {
              type: 'object',
              properties: {
                repoPath: {
                  type: 'string',
                  description: 'Path to the git repository'
                }
              },
              required: ['repoPath']
            }
          },
          {
            name: 'git_log',
            description: 'Get commit history of a git repository',
            inputSchema: {
              type: 'object',
              properties: {
                repoPath: {
                  type: 'string',
                  description: 'Path to the git repository'
                },
                maxCount: {
                  type: 'number',
                  description: 'Maximum number of commits to retrieve',
                  default: 10
                }
              },
              required: ['repoPath']
            }
          },
          {
            name: 'git_branches',
            description: 'List all branches in the repository',
            inputSchema: {
              type: 'object',
              properties: {
                repoPath: {
                  type: 'string',
                  description: 'Path to the git repository'
                }
              },
              required: ['repoPath']
            }
          },
          {
            name: 'git_create_branch',
            description: 'Create a new branch',
            inputSchema: {
              type: 'object',
              properties: {
                repoPath: {
                  type: 'string',
                  description: 'Path to the git repository'
                },
                branchName: {
                  type: 'string',
                  description: 'Name of the new branch'
                }
              },
              required: ['repoPath', 'branchName']
            }
          },
          {
            name: 'git_checkout',
            description: 'Switch to a different branch',
            inputSchema: {
              type: 'object',
              properties: {
                repoPath: {
                  type: 'string',
                  description: 'Path to the git repository'
                },
                branchName: {
                  type: 'string',
                  description: 'Name of the branch to switch to'
                }
              },
              required: ['repoPath', 'branchName']
            }
          },
          {
            name: 'git_add',
            description: 'Add files to staging area',
            inputSchema: {
              type: 'object',
              properties: {
                repoPath: {
                  type: 'string',
                  description: 'Path to the git repository'
                },
                files: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'List of file paths to add (use "." for all files)'
                }
              },
              required: ['repoPath', 'files']
            }
          },
          {
            name: 'git_commit',
            description: 'Commit staged changes',
            inputSchema: {
              type: 'object',
              properties: {
                repoPath: {
                  type: 'string',
                  description: 'Path to the git repository'
                },
                message: {
                  type: 'string',
                  description: 'Commit message'
                },
                files: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Optional: specific files to commit'
                }
              },
              required: ['repoPath', 'message']
            }
          },
          {
            name: 'git_push',
            description: 'Push changes to remote repository',
            inputSchema: {
              type: 'object',
              properties: {
                repoPath: {
                  type: 'string',
                  description: 'Path to the git repository'
                },
                remote: {
                  type: 'string',
                  description: 'Remote name',
                  default: 'origin'
                },
                branch: {
                  type: 'string',
                  description: 'Branch to push (defaults to current branch)'
                }
              },
              required: ['repoPath']
            }
          },
          {
            name: 'git_pull',
            description: 'Pull changes from remote repository',
            inputSchema: {
              type: 'object',
              properties: {
                repoPath: {
                  type: 'string',
                  description: 'Path to the git repository'
                },
                remote: {
                  type: 'string',
                  description: 'Remote name',
                  default: 'origin'
                },
                branch: {
                  type: 'string',
                  description: 'Branch to pull (defaults to current branch)'
                }
              },
              required: ['repoPath']
            }
          },
          {
            name: 'git_clone',
            description: 'Clone a remote repository',
            inputSchema: {
              type: 'object',
              properties: {
                repoUrl: {
                  type: 'string',
                  description: 'URL of the repository to clone'
                },
                targetPath: {
                  type: 'string',
                  description: 'Local path where to clone the repository'
                },
                branch: {
                  type: 'string',
                  description: 'Specific branch to clone'
                }
              },
              required: ['repoUrl', 'targetPath']
            }
          },
          {
            name: 'git_diff',
            description: 'Show differences in the repository',
            inputSchema: {
              type: 'object',
              properties: {
                repoPath: {
                  type: 'string',
                  description: 'Path to the git repository'
                },
                file: {
                  type: 'string',
                  description: 'Specific file to show diff for'
                },
                staged: {
                  type: 'boolean',
                  description: 'Show staged changes',
                  default: false
                }
              },
              required: ['repoPath']
            }
          },
          {
            name: 'git_init',
            description: 'Initialize a new git repository',
            inputSchema: {
              type: 'object',
              properties: {
                repoPath: {
                  type: 'string',
                  description: 'Path where to initialize the repository'
                }
              },
              required: ['repoPath']
            }
          }
        ]
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
      try {
        const { name, arguments: args } = request.params;
        
        switch (name) {
          case 'git_status':
            return await this.handleGitStatus(args);
          case 'git_log':
            return await this.handleGitLog(args);
          case 'git_branches':
            return await this.handleGitBranches(args);
          case 'git_create_branch':
            return await this.handleGitCreateBranch(args);
          case 'git_checkout':
            return await this.handleGitCheckout(args);
          case 'git_add':
            return await this.handleGitAdd(args);
          case 'git_commit':
            return await this.handleGitCommit(args);
          case 'git_push':
            return await this.handleGitPush(args);
          case 'git_pull':
            return await this.handleGitPull(args);
          case 'git_clone':
            return await this.handleGitClone(args);
          case 'git_diff':
            return await this.handleGitDiff(args);
          case 'git_init':
            return await this.handleGitInit(args);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        if (error instanceof McpError) {
          throw error;
        }
        
        const errorMessage = error instanceof Error ? error.message : String(error);
        throw new McpError(ErrorCode.InternalError, `Git operation failed: ${errorMessage}`);
      }
    });
  }

  // Utility methods
  private async validateRepoPath(repoPath: string): Promise<void> {
    try {
      const resolvedPath = path.resolve(repoPath);
      await fs.access(resolvedPath);
      const gitDir = path.join(resolvedPath, '.git');
      await fs.access(gitDir);
    } catch (error) {
      throw new McpError(ErrorCode.InvalidParams, `Invalid repository path: ${repoPath}`);
    }
  }

  private getGitInstance(repoPath: string): SimpleGit {
    return simpleGit(path.resolve(repoPath));
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
  private async handleGitStatus(args: any): Promise<CallToolResult> {
    const { repoPath } = RepoPathSchema.parse(args);
    await this.validateRepoPath(repoPath);
    
    const git = this.getGitInstance(repoPath);
    const status = await git.status();
    
    const result = {
      current: status.current,
      tracking: status.tracking,
      ahead: status.ahead,
      behind: status.behind,
      staged: status.staged,
      modified: status.modified,
      not_added: status.not_added,
      deleted: status.deleted,
      renamed: status.renamed,
      conflicted: status.conflicted
    };
    
    return this.createTextResult(JSON.stringify(result, null, 2));
  }

  private async handleGitLog(args: any): Promise<CallToolResult> {
    const { repoPath, maxCount = 10 } = args;
    RepoPathSchema.parse({ repoPath });
    await this.validateRepoPath(repoPath);
    
    const git = this.getGitInstance(repoPath);
    const log = await git.log({ maxCount });
    
    const commits = log.all.map(commit => ({
      hash: commit.hash,
      date: commit.date,
      message: commit.message,
      author_name: commit.author_name,
      author_email: commit.author_email
    }));
    
    return this.createTextResult(JSON.stringify(commits, null, 2));
  }

  private async handleGitBranches(args: any): Promise<CallToolResult> {
    const { repoPath } = RepoPathSchema.parse(args);
    await this.validateRepoPath(repoPath);
    
    const git = this.getGitInstance(repoPath);
    const branches = await git.branchLocal();
    
    const result = {
      current: branches.current,
      all: branches.all,
      branches: branches.branches
    };
    
    return this.createTextResult(JSON.stringify(result, null, 2));
  }

  private async handleGitCreateBranch(args: any): Promise<CallToolResult> {
    const { repoPath, branchName } = BranchSchema.parse(args);
    await this.validateRepoPath(repoPath);
    
    const git = this.getGitInstance(repoPath);
    await git.checkoutLocalBranch(branchName);
    
    return this.createTextResult(`Created and switched to branch: ${branchName}`);
  }

  private async handleGitCheckout(args: any): Promise<CallToolResult> {
    const { repoPath, branchName } = BranchSchema.parse(args);
    await this.validateRepoPath(repoPath);
    
    const git = this.getGitInstance(repoPath);
    await git.checkout(branchName);
    
    return this.createTextResult(`Switched to branch: ${branchName}`);
  }

  private async handleGitAdd(args: any): Promise<CallToolResult> {
    const { repoPath, files } = AddFilesSchema.parse(args);
    await this.validateRepoPath(repoPath);
    
    const git = this.getGitInstance(repoPath);
    await git.add(files);
    
    return this.createTextResult(`Added files: ${files.join(', ')}`);
  }

  private async handleGitCommit(args: any): Promise<CallToolResult> {
    const { repoPath, message, files } = CommitSchema.parse(args);
    await this.validateRepoPath(repoPath);
    
    const git = this.getGitInstance(repoPath);
    
    if (files && files.length > 0) {
      await git.add(files);
    }
    
    const result = await git.commit(message);
    
    return this.createTextResult(`Committed: ${result.commit} - ${message}`);
  }

  private async handleGitPush(args: any): Promise<CallToolResult> {
    const { repoPath, remote = 'origin', branch } = PushPullSchema.parse(args);
    await this.validateRepoPath(repoPath);
    
    const git = this.getGitInstance(repoPath);
    await git.push(remote, branch);
    
    return this.createTextResult(`Pushed to ${remote}${branch ? `/${branch}` : ''}`);
  }

  private async handleGitPull(args: any): Promise<CallToolResult> {
    const { repoPath, remote = 'origin', branch } = PushPullSchema.parse(args);
    await this.validateRepoPath(repoPath);
    
    const git = this.getGitInstance(repoPath);
    await git.pull(remote, branch);
    
    return this.createTextResult(`Pulled from ${remote}${branch ? `/${branch}` : ''}`);
  }

  private async handleGitClone(args: any): Promise<CallToolResult> {
    const { repoUrl, targetPath, branch } = CloneSchema.parse(args);
    
    try {
      await fs.access(targetPath);
      const files = await fs.readdir(targetPath);
      if (files.length > 0) {
        throw new McpError(ErrorCode.InvalidParams, `Target directory ${targetPath} is not empty`);
      }
    } catch (error) {
      // Directory doesn't exist, which is fine
    }
    
    const git = simpleGit();
    const options = branch ? ['--branch', branch] : [];
    await git.clone(repoUrl, targetPath, options);
    
    return this.createTextResult(`Cloned repository to ${targetPath}`);
  }

  private async handleGitDiff(args: any): Promise<CallToolResult> {
    const { repoPath, file, staged = false } = args;
    RepoPathSchema.parse({ repoPath });
    await this.validateRepoPath(repoPath);
    
    const git = this.getGitInstance(repoPath);
    
    let diff: string;
    if (staged) {
      diff = await git.diff(['--cached', file].filter(Boolean));
    } else {
      diff = await git.diff(file ? [file] : []);
    }
    
    return this.createTextResult(diff || 'No differences found');
  }

  private async handleGitInit(args: any): Promise<CallToolResult> {
    const { repoPath } = RepoPathSchema.parse(args);
    
    const resolvedPath = path.resolve(repoPath);
    await fs.mkdir(resolvedPath, { recursive: true });
    
    const git = this.getGitInstance(repoPath);
    await git.init();
    
    return this.createTextResult(`Initialized git repository at ${resolvedPath}`);
  }

  public async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Git MCP Server running on stdio');
  }
}

// Start the server
async function main(): Promise<void> {
  const server = new GitMCPServer();
  
  process.on('SIGINT', async () => {
    console.error('\nShutting down Git MCP Server...');
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

module.exports = { GitMCPServer };