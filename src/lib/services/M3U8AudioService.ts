import fs from 'fs/promises';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import { spawn } from 'child_process';
import { ContentManager } from '../ContentManager';
import {
  getM3U8Config,
  isSupportedLanguage,
  shouldGenerateM3U8,
} from '@/config/languages';
import type { Language } from '@/types/content';

interface ConversionOptions {
  segmentDuration?: number;
  segmentFormat?: string;
}

interface M3U8Metadata {
  original: {
    path: string;
    size: number;
    created: string;
  };
  m3u8: {
    playlistPath: string;
    segmentDir: string;
    segments: number;
    totalSegmentSize: number;
    playlistSize: number;
    created: string;
  };
  conversion: {
    id: string;
    language: string;
    category: string;
    segmentDuration: number;
    segmentFormat: string;
    convertedAt: string;
  };
}

export interface M3U8ConversionResult {
  success: boolean;
  playlistPath: string;
  segmentDir: string;
  segments: string[];
  metadata: M3U8Metadata;
}

interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
  code?: number;
}

interface M3U8FileInfo {
  playlistPath: string;
  segmentDir: string;
  segments: string[];
  created: string;
  size: number;
}

export class M3U8AudioService {
  static M3U8_DIR = path.join(process.env.AUDIO_ROOT || 'audio', 'm3u8');
  static DEFAULT_SEGMENT_DURATION = 10; // 10 seconds per segment
  static DEFAULT_SEGMENT_FORMAT = 'ts'; // TypeScript format for HLS
  static FFMPEG_PATHS = [
    '/usr/local/bin/ffmpeg',
    '/opt/homebrew/bin/ffmpeg',
    '/usr/bin/ffmpeg',
    'ffmpeg', // Default PATH lookup
  ];

  /**
   * Check if ffmpeg is available and set the path
   */
  static async detectFFmpegPath(): Promise<string | null> {
    for (const ffmpegPath of this.FFMPEG_PATHS) {
      try {
        const result = await this.executeCommand(ffmpegPath, ['-version']);
        if (result.success) {
          console.log(`✅ FFmpeg found at: ${ffmpegPath}`);
          return ffmpegPath;
        }
      } catch (error) {
        // Continue to next path
      }
    }

    console.error('❌ FFmpeg not found in any common locations');
    console.error('💡 Please install FFmpeg:');
    console.error('   macOS: brew install ffmpeg');
    console.error('   Ubuntu: sudo apt install ffmpeg');
    console.error('   Windows: choco install ffmpeg');
    return null;
  }

  /**
   * Execute a command and return result
   */
  static async executeCommand(
    command: string,
    args: string[]
  ): Promise<CommandResult> {
    return new Promise((resolve) => {
      const process = spawn(command, args);
      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        resolve({
          success: code === 0,
          output: stdout,
          error: stderr,
          code: code || undefined,
        });
      });

      process.on('error', (error) => {
        resolve({
          success: false,
          error: error.message,
          code: -1,
        });
      });
    });
  }

  /**
   * Convert WAV file to M3U8 format with HLS segmentation
   */
  static async convertToM3U8(
    wavPath: string,
    id: string,
    language: string,
    category: string,
    options: ConversionOptions = {}
  ): Promise<M3U8ConversionResult> {
    const segmentDuration =
      options.segmentDuration || this.DEFAULT_SEGMENT_DURATION;
    const segmentFormat = options.segmentFormat || this.DEFAULT_SEGMENT_FORMAT;

    console.log(`🎬 Converting to M3U8: ${id} (${language})`);

    // Check if ffmpeg is available
    const ffmpegPath = await this.detectFFmpegPath();
    if (!ffmpegPath) {
      throw new Error(
        'FFmpeg not found. Please install FFmpeg to enable M3U8 conversion.'
      );
    }

    // Set ffmpeg path for fluent-ffmpeg
    ffmpeg.setFfmpegPath(ffmpegPath);

    // Create M3U8 directory structure: m3u8/<language>/<category>/<id>/
    const m3u8Dir = path.join(this.M3U8_DIR, language, category, id);
    await fs.mkdir(m3u8Dir, { recursive: true });

    // Define output paths
    const playlistPath = path.join(m3u8Dir, 'playlist.m3u8');
    const segmentPattern = path.join(m3u8Dir, `segment%03d.${segmentFormat}`);
    const segmentListPath = path.join(m3u8Dir, 'segment-list.txt');

    try {
      // Convert WAV to M3U8 using ffmpeg
      await this.runFFmpegConversion(
        wavPath,
        playlistPath,
        segmentPattern,
        segmentDuration
      );

      // Generate segment list for easier management
      const segments = await this.generateSegmentList(m3u8Dir, segmentFormat);
      await fs.writeFile(segmentListPath, segments.join('\n'));

      // Generate metadata
      const metadata = await this.generateM3U8Metadata(
        wavPath,
        playlistPath,
        segments,
        {
          id,
          language,
          category,
          segmentDuration,
          segmentFormat,
        }
      );

      console.log(`✅ M3U8 conversion completed: ${playlistPath}`);
      console.log(`   Segments: ${segments.length}`);
      console.log(`   Duration: ${segmentDuration}s per segment`);

      return {
        success: true,
        playlistPath,
        segmentDir: m3u8Dir,
        segments,
        metadata,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`❌ M3U8 conversion failed: ${errorMessage}`);
      throw new Error(
        `M3U8 conversion failed for ${id} (${language}): ${errorMessage}`
      );
    }
  }

  /**
   * Run FFmpeg conversion to create M3U8 playlist and segments
   */
  static async runFFmpegConversion(
    inputPath: string,
    playlistPath: string,
    segmentPattern: string,
    segmentDuration: number
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec('aac')
        .audioBitrate(128) // 128kbps for good quality streaming
        .audioFrequency(44100) // Standard frequency for audio streaming
        .format('hls')
        .outputOptions([
          `-hls_time ${segmentDuration}`,
          `-hls_list_size 0`, // Keep all segments in playlist
          `-hls_segment_filename ${segmentPattern}`,
          `-hls_playlist_type vod`, // Video On Demand type
          `-hls_flags independent_segments`, // Make segments independent
        ])
        .output(playlistPath)
        .on('start', (commandLine) => {
          console.log(`   FFmpeg command: ${commandLine}`);
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(`   Progress: ${Math.round(progress.percent)}%`);
          }
        })
        .on('end', () => {
          console.log(`   FFmpeg conversion completed`);
          resolve();
        })
        .on('error', (error) => {
          console.error(`   FFmpeg error: ${error.message}`);
          reject(error);
        })
        .run();
    });
  }

  /**
   * Generate list of segment files
   */
  static async generateSegmentList(
    segmentDir: string,
    segmentFormat: string
  ): Promise<string[]> {
    const files = await fs.readdir(segmentDir);
    const segments = files
      .filter((file) => file.endsWith(`.${segmentFormat}`))
      .sort();

    return segments;
  }

  /**
   * Generate metadata for M3U8 conversion
   */
  static async generateM3U8Metadata(
    originalPath: string,
    playlistPath: string,
    segments: string[],
    conversionInfo: {
      id: string;
      language: string;
      category: string;
      segmentDuration: number;
      segmentFormat: string;
    }
  ): Promise<M3U8Metadata> {
    const originalStats = await fs.stat(originalPath);
    const playlistStats = await fs.stat(playlistPath);

    // Calculate total segment file size
    const segmentDir = path.dirname(playlistPath);
    let totalSegmentSize = 0;

    for (const segment of segments) {
      const segmentPath = path.join(segmentDir, segment);
      const segmentStats = await fs.stat(segmentPath);
      totalSegmentSize += segmentStats.size;
    }

    return {
      original: {
        path: originalPath,
        size: originalStats.size,
        created: originalStats.birthtime.toISOString(),
      },
      m3u8: {
        playlistPath,
        segmentDir,
        segments: segments.length,
        totalSegmentSize,
        playlistSize: playlistStats.size,
        created: playlistStats.birthtime.toISOString(),
      },
      conversion: {
        ...conversionInfo,
        convertedAt: new Date().toISOString(),
      },
    };
  }

  static async generateM3U8Audio(
    id: string,
    language: Language
  ): Promise<M3U8ConversionResult> {
    if (!isSupportedLanguage(language)) {
      throw new Error(`Unsupported language: ${language}`);
    }

    if (!shouldGenerateM3U8(language)) {
      throw new Error(`M3U8 conversion disabled for ${language}`);
    }

    const content = await ContentManager.read(id, language);
    if (!content.audio_file) {
      throw new Error(
        `No WAV audio found for ${id} (${language}). Run audio generation first.`
      );
    }

    const m3u8Config = getM3U8Config(language);
    return this.convertToM3U8(
      content.audio_file,
      id,
      language,
      content.category,
      m3u8Config
    );
  }

  /**
   * Get M3U8 files for a specific content
   */
  static async getM3U8Files(
    id: string,
    language: string,
    category: string
  ): Promise<M3U8FileInfo | null> {
    const m3u8Dir = path.join(this.M3U8_DIR, language, category, id);
    const playlistPath = path.join(m3u8Dir, 'playlist.m3u8');

    try {
      const stats = await fs.stat(playlistPath);
      const segments = await this.generateSegmentList(
        m3u8Dir,
        this.DEFAULT_SEGMENT_FORMAT
      );

      return {
        playlistPath,
        segmentDir: m3u8Dir,
        segments,
        created: stats.birthtime.toISOString(),
        size: stats.size,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * List all M3U8 files with organized structure
   */
  static async listM3U8Files(): Promise<
    Array<M3U8FileInfo & { id: string; language: string; category: string }>
  > {
    try {
      const m3u8Files: Array<
        M3U8FileInfo & { id: string; language: string; category: string }
      > = [];

      // Check if M3U8_DIR exists
      try {
        await fs.access(this.M3U8_DIR);
      } catch (error) {
        console.log(`⚠️ M3U8 directory does not exist: ${this.M3U8_DIR}`);
        return [];
      }

      const languages = await fs.readdir(this.M3U8_DIR);

      for (const language of languages) {
        try {
          const languageDir = path.join(this.M3U8_DIR, language);
          const languageStat = await fs.stat(languageDir);

          if (!languageStat.isDirectory()) continue;

          const categories = await fs.readdir(languageDir);

          for (const category of categories) {
            try {
              const categoryDir = path.join(languageDir, category);
              const categoryStat = await fs.stat(categoryDir);

              if (!categoryStat.isDirectory()) continue;

              const contentIds = await fs.readdir(categoryDir);

              for (const id of contentIds) {
                try {
                  const idDir = path.join(categoryDir, id);
                  const idStat = await fs.stat(idDir);

                  if (!idStat.isDirectory()) continue;

                  const m3u8Info = await this.getM3U8Files(
                    id,
                    language,
                    category
                  );
                  if (m3u8Info) {
                    m3u8Files.push({
                      id,
                      language,
                      category,
                      ...m3u8Info,
                    });
                  }
                } catch (error) {
                  // Skip individual content directories that have issues
                  const errorMessage =
                    error instanceof Error ? error.message : String(error);
                  console.log(
                    `⚠️ Skipping ${language}/${category}/${id}: ${errorMessage}`
                  );
                }
              }
            } catch (error) {
              // Skip individual category directories that have issues
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              console.log(
                `⚠️ Skipping ${language}/${category}: ${errorMessage}`
              );
            }
          }
        } catch (error) {
          // Skip individual language directories that have issues
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          console.log(`⚠️ Skipping ${language}: ${errorMessage}`);
        }
      }

      return m3u8Files.sort(
        (a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Error listing M3U8 files: ${errorMessage}`);
      return [];
    }
  }

  /**
   * Clean up M3U8 files for a specific content
   */
  static async cleanupM3U8Files(
    id: string,
    language: string,
    category: string
  ): Promise<boolean> {
    const m3u8Dir = path.join(this.M3U8_DIR, language, category, id);

    try {
      await fs.rm(m3u8Dir, { recursive: true, force: true });
      console.log(`🗑️ Cleaned up M3U8 files: ${id} (${language})`);
      return true;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`Failed to cleanup M3U8 files: ${errorMessage}`);
      return false;
    }
  }
}
