export interface ParsedFilename {
  type: "movie" | "series";
  title: string;
  episodeNumber: number | "";
  year: string;
}

export function parseFilename(filename: string): ParsedFilename {
  let raw = filename.replace(/\.[^/.]+$/, ""); // remove extension
  raw = raw.replace(/[\._]/g, " "); // replace dots/underscores with spaces
  
  // Clean quality tags early
  const qualityRegex = /\b(?:1080p|720p|480p|4k|2160p|bluray|bdrip|brrip|web-dl|webrip|hdtv|x264|x265|hevc|yify|aac|xvid|divx)\b/gi;
  let cleaned = raw.replace(qualityRegex, " ").replace(/\s+/g, " ").trim();

  const seriesRegex = /(?:[sS]\d+[eE](\d+))|(?:(\d+)x(\d+))|(?:[eE]pisode\s*(\d+))|(?:[eE]p\s*(\d+))|(?:[εΕ]πεισ[όοo]διο\s*(\d+))|(?:[εΕ]πεισ\.?\s*(\d+))|(?:[εΕ]π\.?\s*(\d+))/iu;
  const match = cleaned.match(seriesRegex);

  let type: "movie" | "series" = "movie";
  let episodeNumber: number | "" = "";
  let titlePart = cleaned;

  if (match) {
    type = "series";
    episodeNumber = parseInt(match[1] || match[3] || match[4] || match[5] || match[6] || match[7] || match[8], 10);
    titlePart = cleaned.substring(0, match.index).trim();
  }

  // Extract year (4 digits starting with 19xx or 20xx)
  let year = "";
  const yearMatch = titlePart.match(/\b(19\d\d|20\d\d)\b/);
  if (yearMatch) {
    year = yearMatch[1];
    titlePart = titlePart.replace(yearMatch[0], "").trim();
  } else {
    const yearMatchAfter = cleaned.match(/\b(19\d\d|20\d\d)\b/);
    if (yearMatchAfter) {
      year = yearMatchAfter[1];
    }
  }

  let cleanTitle = titlePart.replace(/^[\s\-_()]+|[\s\-_()]+$/g, "").trim();

  return { type, title: cleanTitle || raw, episodeNumber, year };
}
