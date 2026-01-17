/**
 * IGDB API Client with Twitch OAuth2 authentication
 */

interface OAuthToken {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface TokenData {
  token: string;
  expiresAt: number;
}

export interface Game {
  id: number;
  name: string;
  summary?: string;
  storyline?: string;
  rating?: number;
  aggregated_rating?: number;
  first_release_date?: number;
  genres?: Array<{ id: number; name: string }>;
  platforms?: Array<{ id: number; name: string }>;
  themes?: Array<{ id: number; name: string }>;
  game_modes?: Array<{ id: number; name: string }>;
  involved_companies?: Array<{ company: { id: number; name: string } }>;
  similar_games?: Array<{ id: number; name: string }>;
  cover?: { url: string };
}

export class IGDBClient {
  private clientId: string;
  private clientSecret: string;
  private tokenData: TokenData | null = null;

  constructor() {
    const clientId = process.env.IGDB_CLIENT_ID;
    const clientSecret = process.env.IGDB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error(
        "Missing IGDB credentials. Please set IGDB_CLIENT_ID and IGDB_CLIENT_SECRET environment variables."
      );
    }

    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * Get a valid OAuth token, refreshing if necessary
   */
  private async getToken(): Promise<string> {
    // Check if we have a valid token (with 5 minute buffer)
    if (this.tokenData && Date.now() < this.tokenData.expiresAt - 300000) {
      return this.tokenData.token;
    }

    // Get a new token
    const url = "https://id.twitch.tv/oauth2/token";
    const params = new URLSearchParams({
      client_id: this.clientId,
      client_secret: this.clientSecret,
      grant_type: "client_credentials",
    });

    const response = await fetch(`${url}?${params}`, {
      method: "POST",
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to authenticate with Twitch: ${response.status} ${errorText}`);
    }

    const data: OAuthToken = await response.json();

    this.tokenData = {
      token: data.access_token,
      expiresAt: Date.now() + data.expires_in * 1000,
    };

    return this.tokenData.token;
  }

  /**
   * Make a request to the IGDB API
   */
  private async request(endpoint: string, body: string): Promise<unknown> {
    const token = await this.getToken();

    const response = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
      method: "POST",
      headers: {
        "Client-ID": this.clientId,
        Authorization: `Bearer ${token}`,
        "Content-Type": "text/plain",
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`IGDB API error: ${response.status} ${errorText}`);
    }

    return response.json();
  }

  /**
   * Search for games by name
   */
  async searchGames(query: string, limit: number = 10): Promise<Game[]> {
    const body = `
      search "${query.replace(/"/g, '\\"')}";
      fields name, summary, rating, aggregated_rating,
             genres.name, platforms.name,
             first_release_date, cover.url,
             involved_companies.company.name;
      limit ${limit};
    `;

    const games = await this.request("games", body);
    return games as Game[];
  }

  /**
   * Get detailed information about a specific game
   */
  async getGameDetails(gameId: number): Promise<Game | null> {
    const body = `
      where id = ${gameId};
      fields name, summary, storyline, rating, aggregated_rating,
             genres.name, themes.name, platforms.name,
             first_release_date, cover.url,
             involved_companies.company.name,
             similar_games.name, similar_games.id,
             game_modes.name;
    `;

    const games = await this.request("games", body);
    const gameArray = games as Game[];
    return gameArray.length > 0 ? gameArray[0] : null;
  }
}
