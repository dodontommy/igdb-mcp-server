# IGDB MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that provides access to the [IGDB (Internet Game Database)](https://www.igdb.com/) API. This allows AI assistants like Claude to search for games and retrieve detailed game information.

## Features

- **search_games** - Search for games by name, returning basic info including ratings, genres, platforms, and release dates
- **get_game_details** - Get comprehensive details about a specific game including storyline, themes, and similar games

## Prerequisites

You need IGDB API credentials to use this server. IGDB uses Twitch authentication:

1. Create a Twitch account at https://dev.twitch.tv/
2. Register a new application in the Twitch Developer Console
3. Note your **Client ID** and generate a **Client Secret**

For detailed instructions, see the [IGDB API documentation](https://api-docs.igdb.com/#account-creation).

## Installation

### Using npx (recommended)

```bash
npx igdb-mcp-server
```

### From source

```bash
git clone https://github.com/yourusername/igdb-mcp-server.git
cd igdb-mcp-server
npm install
npm run build
```

## Configuration

### Environment Variables

Set the following environment variables:

- `IGDB_CLIENT_ID` - Your Twitch/IGDB Client ID
- `IGDB_CLIENT_SECRET` - Your Twitch/IGDB Client Secret

### Claude Desktop / Claude Code

Add to your MCP configuration file (`.mcp.json` or `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "igdb": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "igdb-mcp-server"],
      "env": {
        "IGDB_CLIENT_ID": "your-client-id",
        "IGDB_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

Or if running from source:

```json
{
  "mcpServers": {
    "igdb": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/igdb-mcp-server/dist/index.js"],
      "env": {
        "IGDB_CLIENT_ID": "your-client-id",
        "IGDB_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

## Tools

### search_games

Search for games in the IGDB database.

**Parameters:**
- `query` (required): The game name or search query
- `limit` (optional): Maximum results to return (default: 10, max: 50)

**Example:**
```
Search IGDB for "Final Fantasy Tactics"
```

### get_game_details

Get detailed information about a specific game.

**Parameters:**
- `game_id` (required): The IGDB game ID

**Example:**
```
Get details for IGDB game ID 1920
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run locally
npm start

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node dist/index.js
```

## License

MIT
