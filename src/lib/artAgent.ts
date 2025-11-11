export type ArtStyle = "line" | "watercolor" | "neon" | "charcoal" | "pastel";
export type Pose = "standing" | "sitting" | "dancing" | "stretching" | "profile";
export type Mood = "serene" | "energetic" | "melancholic" | "confident" | "mysterious";

export interface AgentConfig {
  prompt: string;
  style: ArtStyle;
  palette: string[];
  pose: Pose;
  mood: Mood;
  complexity: number;
}

const BASE_PALETTES: Record<ArtStyle, string[]> = {
  line: ["#111111", "#3c3c3c", "#f1f1f1"],
  watercolor: ["#f4ede4", "#f4a4a4", "#6ab7d6", "#fbd38d", "#7bc47f"],
  neon: ["#050014", "#ff00e0", "#08fdd8", "#fefe00", "#ff7b00"],
  charcoal: ["#121212", "#2c2c2c", "#555555", "#bbbbbb"],
  pastel: ["#f9f7f3", "#ffd1dc", "#bde0fe", "#c8e8ca", "#f2c49b"],
};

const KEYWORD_MAP: Array<{ keywords: string[]; updates: Partial<Omit<AgentConfig, "prompt">> }> = [
  {
    keywords: ["line", "sketch", "minimal"],
    updates: { style: "line", palette: BASE_PALETTES.line, complexity: 2 },
  },
  {
    keywords: ["watercolor", "flowing", "soft"],
    updates: { style: "watercolor", palette: BASE_PALETTES.watercolor, mood: "serene", complexity: 3 },
  },
  {
    keywords: ["neon", "cyber", "night"],
    updates: { style: "neon", palette: BASE_PALETTES.neon, mood: "energetic" },
  },
  {
    keywords: ["dramatic", "moody", "shadow"],
    updates: { style: "charcoal", palette: BASE_PALETTES.charcoal, mood: "mysterious", complexity: 4 },
  },
  {
    keywords: ["pastel", "dream", "romantic"],
    updates: { style: "pastel", palette: BASE_PALETTES.pastel, mood: "serene" },
  },
  {
    keywords: ["dance", "moving", "motion"],
    updates: { pose: "dancing", mood: "energetic" },
  },
  {
    keywords: ["sit", "relax"],
    updates: { pose: "sitting", mood: "serene" },
  },
  {
    keywords: ["profile", "side"],
    updates: { pose: "profile", complexity: 3 },
  },
  {
    keywords: ["strong", "hero", "power"],
    updates: { pose: "standing", mood: "confident", complexity: 4 },
  },
];

function pickMood(style: ArtStyle): Mood {
  switch (style) {
    case "neon":
      return "energetic";
    case "charcoal":
      return "mysterious";
    case "watercolor":
      return "serene";
    case "pastel":
      return "serene";
    default:
      return "confident";
  }
}

export function buildAgentConfig(prompt: string, previous?: AgentConfig): AgentConfig {
  const base: AgentConfig =
    previous ??
    ({
      prompt,
      style: "line",
      palette: BASE_PALETTES.line,
      pose: "standing",
      mood: "confident",
      complexity: 3,
    } as AgentConfig);

  const lowered = prompt.toLowerCase();
  let result: AgentConfig = { ...base, prompt };

  for (const entry of KEYWORD_MAP) {
    if (entry.keywords.some((kw) => lowered.includes(kw))) {
      result = {
        ...result,
        ...entry.updates,
        palette: entry.updates.palette ?? result.palette,
      };
    }
  }

  if (!prompt.trim()) {
    return result;
  }

  // Adjust palette slightly if the prompt mentions specific colors.
  const colorMatches = Array.from(lowered.matchAll(/(red|blue|green|gold|purple|orange|pink|teal)/g)).map(
    (match) => match[0],
  );

  if (colorMatches.length > 0) {
    const palette = new Set(result.palette);
    for (const color of colorMatches) {
      switch (color) {
        case "red":
          palette.add("#d64550");
          break;
        case "blue":
          palette.add("#3a86ff");
          break;
        case "green":
          palette.add("#70e000");
          break;
        case "gold":
          palette.add("#f4b41a");
          break;
        case "purple":
          palette.add("#8338ec");
          break;
        case "orange":
          palette.add("#ff9f1c");
          break;
        case "pink":
          palette.add("#ffadad");
          break;
        case "teal":
          palette.add("#12cad6");
          break;
        default:
          break;
      }
    }
    result.palette = Array.from(palette);
  }

  // Adapt mood based on sentiment words.
  if (lowered.includes("calm") || lowered.includes("gentle")) {
    result.mood = "serene";
  } else if (lowered.includes("mysterious") || lowered.includes("noir")) {
    result.mood = "mysterious";
  } else if (lowered.includes("joy") || lowered.includes("happy") || lowered.includes("dance")) {
    result.mood = "energetic";
  } else if (lowered.includes("melancholy") || lowered.includes("sad")) {
    result.mood = "melancholic";
  } else if (lowered.includes("bold") || lowered.includes("hero")) {
    result.mood = "confident";
  }

  return result;
}

export function describeAgentIntent(config: AgentConfig): string {
  const lines = [
    `Style fokus pada ${config.style} dengan nuansa ${config.mood}.`,
    `Pose ${config.pose} dipilih untuk menonjolkan siluet manusia.`,
    `Palet warna utama: ${config.palette.slice(0, 4).join(", ")}.`,
    `Detail level ${config.complexity} menjaga keseimbangan antara gesture dan bentuk.`,
  ];

  if (config.prompt.trim()) {
    lines.unshift(`Interpretasi prompt: “${config.prompt.trim()}”`);
  } else {
    lines.unshift("Menggunakan pengaturan agen default untuk figur manusia.");
  }

  return lines.join(" ");
}

export function getBasePalette(style: ArtStyle): string[] {
  return BASE_PALETTES[style] ?? BASE_PALETTES.line;
}
