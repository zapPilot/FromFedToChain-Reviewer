/**
 * R2Utils
 *
 * Utility functions for working with Cloudflare R2 and rclone output.
 */
export class R2Utils {
  /**
   * Parse output from `rclone ls` command to extract filenames
   * Expected format: "  size filename"
   * Example: "   1234 segment001.ts"
   *
   * @param output - The raw stdout output from rclone ls
   * @returns Array of filenames found
   */
  static parseRcloneLsOutput(output: string): string[] {
    if (!output) {
      return [];
    }

    const lines = output.split('\n').filter((l) => l.trim());
    const files: string[] = [];

    for (const line of lines) {
      // Match whitespace, size (digits), whitespace, filename (anything ending in .ts)
      const match = line.match(/^\s*\d+\s+(.+\.ts)$/);
      if (match) {
        files.push(match[1]);
      }
    }

    return files;
  }

  /**
   * Sort segment filenames naturally by the numeric part
   * e.g. segment0.ts, segment1.ts, ..., segment10.ts
   */
  static sortSegmentFiles(files: string[]): string[] {
    return [...files].sort((a, b) => {
      const numA = parseInt(a.match(/(\d+)/)?.[1] || '0');
      const numB = parseInt(b.match(/(\d+)/)?.[1] || '0');
      return numA - numB;
    });
  }
}
