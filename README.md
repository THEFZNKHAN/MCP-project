# MCP-project: Model Context Protocol Integration

## Table of Contents
- [Project Overview](#project-overview)
- [Features](#features)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Cloning the Repository](#cloning-the-repository)
  - [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
  - [Development Mode](#development-mode)
  - [Production Mode](#production-mode)
- [Contributing](#contributing)
- [License](#license)

## Project Overview
This project is a monorepo designed to integrate various services with the Model Context Protocol (MCP). It includes a Next.js frontend application and two backend servers: one for Git operations and another for Google Drive integration. The goal is to provide a unified interface for managing and interacting with different data sources through the MCP.

## Features
- **Unified Interface:** Manage Git repositories and Google Drive files from a single web application.
- **Git Server Integration:** Interact with Git repositories (e.g., status, list, branch operations).
- **Google Drive Server Integration:** Authenticate with Google Drive, list files, download, upload, create folders, and delete files.
- **Model Context Protocol (MCP) Compatibility:** All integrations are built to communicate via the MCP.
- **Modular Architecture:** A monorepo setup allows for independent development and deployment of each component.

## Project Structure
This project is organized as a monorepo containing three main components:

-   `mcp/`: The main Next.js frontend application. This is where the user interface for interacting with the MCP servers resides.
-   `git-mcp-server/`: A Node.js/TypeScript backend server responsible for handling Git-related operations.
-   `google-drive-mcp-server/`: A Node.js/TypeScript backend server responsible for handling Google Drive integration, including OAuth2 authentication.

```
MCP-project/
├── git-mcp-server/
│   ├── src/
│   └── package.json
├── google-drive-mcp-server/
│   ├── src/
│   └── package.json
└── mcp/
    ├── app/
    ├── components/
    ├── lib/
    └── package.json
```

## Getting Started

### Prerequisites
Before you begin, ensure you have the following installed:
-   [Node.js](https://nodejs.org/en/download/) (LTS version recommended)
-   [npm](https://www.npmjs.com/get-npm) (comes with Node.js)
-   [Git](https://git-scm.com/downloads)

### Cloning the Repository
```bash
git clone https://github.com/THEFZNKHAN/MCP-project.git
cd MCP-project
```

### Installation
You need to install dependencies for each sub-project. Navigate into each directory and run `npm install`.

```bash
# Install frontend dependencies
cd mcp
npm install
cd ..

# Install Git server dependencies
cd git-mcp-server
npm install
cd ..

# Install Google Drive server dependencies
cd google-drive-mcp-server
npm install
cd ..
```

## Configuration

### Google Drive Server Environment Variables
The `google-drive-mcp-server` requires Google OAuth 2.0 credentials. You need to obtain a Client ID and Client Secret from the [Google Cloud Console](https://console.cloud.google.com/).

1.  Go to the [Google Cloud Console](https://console.cloud.google.com/).
2.  Create a new project or select an existing one.
3.  Navigate to "APIs & Services" > "Credentials".
4.  Click "Create Credentials" > "OAuth client ID".
5.  Choose "Web application" as the Application type.
6.  Add `http://localhost:3002/auth/google/callback` to "Authorized redirect URIs".
7.  After creating, you will get your Client ID and Client Secret.

Create a `.env` file in the `google-drive-mcp-server/` directory (at the same level as `package.json`) and add your credentials:

```
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
```
*Replace `YOUR_GOOGLE_CLIENT_ID` and `YOUR_GOOGLE_CLIENT_SECRET` with the actual values from your Google Cloud project.*

## Running the Application

You will need to run each component in a separate terminal window.

### Development Mode

1.  **Start the Git MCP Server:**
    Open a new terminal, navigate to the `git-mcp-server` directory, and run:
    ```bash
    cd git-mcp-server
    npm run dev
    ```

2.  **Start the Google Drive MCP Server:**
    Open another terminal, navigate to the `google-drive-mcp-server` directory, and run:
    ```bash
    cd google-drive-mcp-server
    npm run dev
    ```
    This server will listen for requests on `http://localhost:3002`.

3.  **Start the Frontend Application:**
    Open a third terminal, navigate to the `mcp` directory, and run:
    ```bash
    cd mcp
    npm run dev
    ```
    The Next.js development server will typically start on `http://localhost:3000`.

Once all three are running, open your web browser and go to `http://localhost:3000` to access the application.

### Production Mode

To build and run the application for production:

1.  **Build the Git MCP Server:**
    ```bash
    cd git-mcp-server
    npm run build
    cd ..
    ```
2.  **Build the Google Drive MCP Server:**
    ```bash
    cd google-drive-mcp-server
    npm run build
    cd ..
    ```
3.  **Build the Frontend Application:**
    ```bash
    cd mcp
    npm run build
    cd ..
    ```

4.  **Start the Servers (in separate terminal windows):**
    *   **Git MCP Server:**
        ```bash
        cd git-mcp-server
        npm run start
        ```
    *   **Google Drive MCP Server:**
        ```bash
        cd google-drive-mcp-server
        npm run start
        ```

5.  **Start the Frontend Application:**
    ```bash
    cd mcp
    npm run start
    ```

## Contributing
Contributions are welcome! Please feel free to submit issues or pull requests.

## License
This project is licensed under the ISC License. See the `LICENSE` file for details.
