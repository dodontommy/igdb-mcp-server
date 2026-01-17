#!/usr/bin/env node

/**
 * IGDB MCP Server
 *
 * A Model Context Protocol server that provides access to the IGDB (Internet Game Database) API.
 * Supports searching for games and getting detailed game information.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  CallToolResult,
} from "@modelcontextprotocol/sdk/types.js";
import { IGDBClient, Game } from "./igdb-client.js";

// Initialize the IGDB client
let igdbClient: IGDBClient;

try {
  igdbClient = new IGDBClient();
} catch (error) {
  console.error("Error initializing IGDB client:", error);
  process.exit(1);
}

// Create the MCP server
const server = new Server(
  {
    name: "igdb-mcp-server",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

/**
 * Format a game for display
 */
function formatGame(game: Game): string {
  const lines: string[] = [];

  lines.push(`**${game.name}** (ID: ${game.id})`);

  if (game.rating) {
    lines.push(`Rating: ${game.rating.toFixed(1)}/100`);
  }

  if (game.aggregated_rating) {
    lines.push(`Critic Rating: ${game.aggregated_rating.toFixed(1)}/100`);
  }

  if (game.first_release_date) {
    const date = new Date(game.first_release_date * 1000);
    lines.push(`Released: ${date.toLocaleDateString()}`);
  }

  if (game.genres && game.genres.length > 0) {
    const genreNames = game.genres.map((g) => g.name).join(", ");
    lines.push(`Genres: ${genreNames}`);
  }

  if (game.platforms && game.platforms.length > 0) {
    const platformNames = game.platforms.map((p) => p.name).join(", ");
    lines.push(`Platforms: ${platformNames}`);
  }

  if (game.summary) {
    lines.push(`\nSummary: ${game.summary}`);
  }

  return lines.join("\n");
}

/**
 * Format detailed game information
 */
function formatGameDetails(game: Game): string {
  const lines: string[] = [];

  lines.push(`# ${game.name}`);
  lines.push(`**IGDB ID:** ${game.id}`);
  lines.push("");

  if (game.rating) {
    lines.push(`**User Rating:** ${game.rating.toFixed(1)}/100`);
  }

  if (game.aggregated_rating) {
    lines.push(`**Critic Rating:** ${game.aggregated_rating.toFixed(1)}/100`);
  }

  if (game.first_release_date) {
    const date = new Date(game.first_release_date * 1000);
    lines.push(`**Released:** ${date.toLocaleDateString()}`);
  }

  lines.push("");

  if (game.genres && game.genres.length > 0) {
    const genreNames = game.genres.map((g) => g.name).join(", ");
    lines.push(`**Genres:** ${genreNames}`);
  }

  if (game.themes && game.themes.length > 0) {
    const themeNames = game.themes.map((t) => t.name).join(", ");
    lines.push(`**Themes:** ${themeNames}`);
  }

  if (game.platforms && game.platforms.length > 0) {
    const platformNames = game.platforms.map((p) => p.name).join(", ");
    lines.push(`**Platforms:** ${platformNames}`);
  }

  if (game.game_modes && game.game_modes.length > 0) {
    const modeNames = game.game_modes.map((m) => m.name).join(", ");
    lines.push(`**Game Modes:** ${modeNames}`);
  }

  if (game.involved_companies && game.involved_companies.length > 0) {
    const companyNames = game.involved_companies.map((c) => c.company.name).join(", ");
    lines.push(`**Companies:** ${companyNames}`);
  }

  lines.push("");

  if (game.summary) {
    lines.push("## Summary");
    lines.push(game.summary);
    lines.push("");
  }

  if (game.storyline) {
    lines.push("## Storyline");
    lines.push(game.storyline);
    lines.push("");
  }

  if (game.similar_games && game.similar_games.length > 0) {
    lines.push("## Similar Games");
    for (const similar of game.similar_games) {
      lines.push(`- ${similar.name} (ID: ${similar.id})`);
    }
  }

  return lines.join("\n");
}

// Register the tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "search_games",
        description:
          "Search for games in the IGDB database by name. Returns a list of matching games with basic information including name, rating, genres, platforms, and release date.",
        inputSchema: {
          type: "object" as const,
          properties: {
            query: {
              type: "string",
              description: "The game name or search query to look for",
            },
            limit: {
              type: "number",
              description: "Maximum number of results to return (default: 10, max: 50)",
              default: 10,
            },
          },
          required: ["query"],
        },
      },
      {
        name: "get_game_details",
        description:
          "Get detailed information about a specific game by its IGDB ID. Returns comprehensive details including storyline, themes, similar games, and more.",
        inputSchema: {
          type: "object" as const,
          properties: {
            game_id: {
              type: "number",
              description: "The IGDB game ID",
            },
          },
          required: ["game_id"],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "search_games") {
      const query = args?.query as string;
      const limit = Math.min((args?.limit as number) || 10, 50);

      if (!query) {
        return {
          content: [
            {
              type: "text",
              text: "Error: query parameter is required",
            },
          ],
          isError: true,
        };
      }

      const games = await igdbClient.searchGames(query, limit);

      if (games.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No games found matching "${query}"`,
            },
          ],
        };
      }

      const formattedGames = games.map(formatGame).join("\n\n---\n\n");
      return {
        content: [
          {
            type: "text",
            text: `Found ${games.length} game(s) matching "${query}":\n\n${formattedGames}`,
          },
        ],
      };
    }

    if (name === "get_game_details") {
      const gameId = args?.game_id as number;

      if (!gameId) {
        return {
          content: [
            {
              type: "text",
              text: "Error: game_id parameter is required",
            },
          ],
          isError: true,
        };
      }

      const game = await igdbClient.getGameDetails(gameId);

      if (!game) {
        return {
          content: [
            {
              type: "text",
              text: `No game found with ID ${gameId}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: formatGameDetails(game),
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Unknown tool: ${name}`,
        },
      ],
      isError: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("IGDB MCP Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
