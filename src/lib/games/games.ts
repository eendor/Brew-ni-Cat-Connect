/**
 * Loyalty mini-games (FR-089, ADR-034). The server decides every result in
 * public.play_mini_game(); the browser only asks to play and shows what the
 * server drew. These are the shapes it sends back and the words the page
 * shows for them.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { getAuthSupabaseClient } from "@/lib/supabase/auth-client";

export type GameId = "cat-cups" | "lucky-paw";

export type GameInfo = Readonly<{
  id: GameId;
  name: string;
  description: string;
  choices: number;
  winPoints: number | null;
  tryPoints: number | null;
  maxPoints: number;
}>;

export type GameStatus = Readonly<{
  dailyPlays: number;
  playsToday: number;
  playsLeft: number;
  games: readonly GameInfo[];
}>;

export type CatCupsOutcome = Readonly<{ hiddenUnder: number; won: boolean }>;
export type LuckyPawOutcome = Readonly<{ treat: number }>;

export type PlaySuccess = Readonly<{
  ok: true;
  playId: number;
  game: GameId;
  outcome: CatCupsOutcome | LuckyPawOutcome;
  points: number;
  playsLeft: number;
  balance: number;
}>;

export type PlayError =
  | "unauthorized"
  | "unknown_game"
  | "invalid_choice"
  | "daily_limit_reached"
  | "unavailable"
  | "failed";

export type PlayFailure = Readonly<{ ok: false; error: PlayError }>;
export type PlayResult = PlaySuccess | PlayFailure;

/** The games aren't on this database yet (the migration isn't applied). */
export class GamesUnavailableError extends Error {
  constructor() {
    super("The mini-games aren't open yet.");
    this.name = "GamesUnavailableError";
  }
}

type RpcError = { code?: string; message?: string } | null;

/** PostgREST answers PGRST202 (or 404) when a function doesn't exist. */
export function isMissingFunction(error: RpcError): boolean {
  if (!error) return false;
  return (
    error.code === "PGRST202" ||
    error.code === "42883" ||
    /could not find the function/i.test(error.message ?? "")
  );
}

export async function fetchGameStatus(
  client?: SupabaseClient,
): Promise<GameStatus> {
  const supabase = client ?? getAuthSupabaseClient();
  const { data, error } = await supabase.rpc("mini_game_status");
  if (isMissingFunction(error)) throw new GamesUnavailableError();
  if (error) throw new Error(`Failed to load the games: ${error.message}`);
  return data as GameStatus;
}

export async function playMiniGame(
  game: GameId,
  choice: number | null,
  client?: SupabaseClient,
): Promise<PlayResult> {
  const supabase = client ?? getAuthSupabaseClient();
  const { data, error } = await supabase.rpc("play_mini_game", {
    p_game: game,
    p_choice: choice,
  });
  if (isMissingFunction(error)) return { ok: false, error: "unavailable" };
  if (error) return { ok: false, error: "failed" };
  return data as PlayResult;
}

export function playErrorMessage(error: PlayError): string {
  switch (error) {
    case "daily_limit_reached":
      return "That's all your plays for today. Come back tomorrow!";
    case "unauthorized":
      return "Sign in to play for points.";
    case "unavailable":
      return "The games aren't open yet. Check back soon!";
    case "invalid_choice":
    case "unknown_game":
      return "That move didn't work. Try again.";
    default:
      return "Something went wrong. Your play wasn't used. Try again.";
  }
}

export function pointsLabel(points: number): string {
  return `${points} ${points === 1 ? "point" : "points"}`;
}

export function playsLeftLabel(left: number): string {
  if (left <= 0) return "No plays left today";
  return `${left} ${left === 1 ? "play" : "plays"} left today`;
}
