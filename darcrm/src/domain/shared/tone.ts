/** Semantic emphasis for badges, mapped to colours in the presentation layer. */
export type Tone = "success" | "highlight" | "warning" | "info" | "danger" | "neutral";

export interface Badge {
  readonly label: string;
  readonly tone: Tone;
}
