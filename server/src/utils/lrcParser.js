import fs from 'fs';
import readline from 'readline';

/**
 * Parses an LRC file and returns an array of timestamped lines.
 * @param {string} filePath - Absolute path to the .lrc file
 * @returns {Promise<Array<{time: number, text: string}>>}
 */
export const parseLRC = async (filePath) => {
  const lines = [];
  const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2,3})\](.*)/;

  try {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    for await (const line of rl) {
      const match = line.match(timeRegex);
      if (match) {
        const minutes = parseInt(match[1], 10);
        const seconds = parseInt(match[2], 10);
        const fractionStr = match[3];
        let milliseconds = parseInt(fractionStr, 10);
        
        // If fraction is 2 digits, it's centiseconds (multiply by 10 to get ms)
        // If fraction is 3 digits, it's milliseconds
        if (fractionStr.length === 2) {
          milliseconds *= 10;
        }

        const totalTimeMs = (minutes * 60 * 1000) + (seconds * 1000) + milliseconds;
        const text = match[4].trim();

        lines.push({
          time: totalTimeMs,
          text: text
        });
      }
    }
  } catch (error) {
    console.error('Error parsing LRC file:', error);
    throw error;
  }

  return lines;
};
