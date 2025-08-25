export interface ServerConfig {
  mcpServers: {
    [key: string]: {
      command: string;
      args: string[];
      env?: Record<string, unknown>;
    };
  };
}
