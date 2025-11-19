import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { ContentManager } from '../ContentManager';
import { M3U8AudioService } from './M3U8AudioService';
import { isSupportedLanguage } from '@/config/languages';
import type { Language } from '@/types/content';

interface M3U8Data {
  playlistPath: string;
  segmentDir: string;
  segments: string[];
}

interface UploadFiles {
  m3u8Data?: M3U8Data;
}

interface UploadResult {
  success: boolean;
  urls: {
    m3u8?: string;
    segments?: string[];
  };
  errors: string[];
}

interface FileUploadResult {
  success: boolean;
  error?: string;
}

interface SingleFileUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

interface CommandResult {
  success: boolean;
  output?: string;
  error?: string;
}

interface R2File {
  path: string;
  size: number;
  language: string;
  category: string;
  id: string;
  filename: string;
  url: string;
}

export class CloudflareR2Service {
  static REMOTE_NAME = 'r2'; // R2 remote name in rclone config
  static BUCKET_NAME = 'fromfedtochain'; // R2 bucket name
  static RCLONE_BINARY = 'rclone'; // Assumes rclone is in PATH
  static BASE_URL =
    'https://fromfedtochain.1352ed9cb1e236fe232f67ff3a8e9850.r2.cloudflarestorage.com'; // Actual R2 domain

  /**
   * Upload audio files (WAV and M3U8) to Cloudflare R2
   */
  static async uploadAudioFiles(
    id: string,
    language: string,
    category: string,
    files: UploadFiles
  ): Promise<UploadResult> {
    console.log(`☁️ Uploading to R2: ${id} (${language})`);
    console.log(`   Files to upload: ${Object.keys(files).join(', ')}`);

    const uploadResults: UploadResult = {
      success: true,
      urls: {},
      errors: [],
    };

    try {
      // Create R2 directory structure: audio/{language}/{category}/{id}/
      const r2BasePath = `audio/${language}/${category}/${id}`;

      // WAV files are stored locally only, not uploaded to R2 for streaming

      // Upload M3U8 files if provided
      if (files.m3u8Data) {
        console.log(`🎬 Uploading M3U8 files...`);
        console.log(`   Playlist: ${files.m3u8Data.playlistPath}`);
        console.log(`   Segments: ${files.m3u8Data.segments.length}`);

        const m3u8Result = await this.uploadM3U8Files(
          files.m3u8Data,
          r2BasePath
        );
        if (m3u8Result.success) {
          uploadResults.urls.m3u8 = `${this.BASE_URL}/${r2BasePath}/playlist.m3u8`;
          if (m3u8Result.segmentUrls) {
            uploadResults.urls.segments = m3u8Result.segmentUrls;
          }
          console.log(`✅ M3U8 files uploaded successfully`);
          console.log(`   Playlist URL: ${uploadResults.urls.m3u8}`);
          console.log(
            `   Segments uploaded: ${m3u8Result.segmentUrls?.length ?? 0}`
          );
        } else {
          console.error(`❌ M3U8 upload failed: ${m3u8Result.error}`);
          uploadResults.errors.push(`M3U8 upload failed: ${m3u8Result.error}`);
          uploadResults.success = false;
        }
      } else {
        console.log(`⚠️ No M3U8 data provided for upload`);
      }

      if (uploadResults.success) {
        console.log(`✅ R2 upload completed: ${id} (${language})`);
        console.log(`   M3U8: ${uploadResults.urls.m3u8 || 'N/A'}`);
      } else {
        console.error(
          `❌ R2 upload had errors: ${uploadResults.errors.join(', ')}`
        );
      }

      return uploadResults;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`❌ R2 upload failed: ${errorMessage}`);
      return {
        success: false,
        urls: {},
        errors: [errorMessage],
      };
    }
  }

  static async uploadWAVAudio(
    id: string,
    language: Language
  ): Promise<SingleFileUploadResult> {
    if (!isSupportedLanguage(language)) {
      throw new Error(`Unsupported language: ${language}`);
    }

    const rcloneReady = await this.checkRcloneAvailability();
    if (!rcloneReady) {
      throw new Error('rclone not available or not configured');
    }

    const content = await ContentManager.read(id, language);
    if (!content.audio_file) {
      throw new Error(
        `No WAV audio found for ${id} (${language}). Generate audio first.`
      );
    }

    const wavFileName = path.basename(content.audio_file);
    const remotePath = `audio/${language}/${content.category}/${id}/${wavFileName}`;
    const uploadResult = await this.uploadFile(content.audio_file, remotePath);

    if (!uploadResult.success) {
      return { success: false, error: uploadResult.error };
    }

    const url = `${this.BASE_URL}/${remotePath}`;
    await ContentManager.addAudio(id, language, content.audio_file, {
      cloudflare: url,
    });

    return {
      success: true,
      url,
    };
  }

  static async uploadM3U8Audio(
    id: string,
    language: Language
  ): Promise<UploadResult> {
    if (!isSupportedLanguage(language)) {
      throw new Error(`Unsupported language: ${language}`);
    }

    const rcloneReady = await this.checkRcloneAvailability();
    if (!rcloneReady) {
      throw new Error('rclone not available or not configured');
    }

    const content = await ContentManager.read(id, language);
    if (!content.audio_file) {
      throw new Error(
        `No WAV audio found for ${id} (${language}). Generate audio first.`
      );
    }

    const m3u8Info = await M3U8AudioService.getM3U8Files(
      id,
      language,
      content.category
    );

    if (!m3u8Info) {
      throw new Error(
        `No M3U8 assets found for ${id} (${language}). Run conversion first.`
      );
    }

    const uploadResult = await this.uploadAudioFiles(
      id,
      language,
      content.category,
      { m3u8Data: m3u8Info }
    );

    if (uploadResult.success) {
      await ContentManager.addAudio(
        id,
        language,
        content.audio_file,
        uploadResult.urls
      );
    }

    return uploadResult;
  }

  /**
   * Upload M3U8 playlist and segments to R2
   */
  static async uploadM3U8Files(
    m3u8Data: M3U8Data,
    r2BasePath: string
  ): Promise<{ success: boolean; segmentUrls?: string[]; error?: string }> {
    try {
      const segmentUrls: string[] = [];

      // Upload playlist file
      const playlistResult = await this.uploadFile(
        m3u8Data.playlistPath,
        `${r2BasePath}/playlist.m3u8`
      );
      if (!playlistResult.success) {
        return {
          success: false,
          error: `Playlist upload failed: ${playlistResult.error}`,
        };
      }

      // Upload all segment files
      for (const segment of m3u8Data.segments) {
        const segmentPath = path.join(m3u8Data.segmentDir, segment);
        const segmentResult = await this.uploadFile(
          segmentPath,
          `${r2BasePath}/${segment}`
        );

        if (segmentResult.success) {
          segmentUrls.push(`${this.BASE_URL}/${r2BasePath}/${segment}`);
        } else {
          return {
            success: false,
            error: `Segment upload failed: ${segmentResult.error}`,
          };
        }
      }

      return {
        success: true,
        segmentUrls,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Upload a single file to R2 using rclone
   */
  static async uploadFile(
    localPath: string,
    remotePath: string
  ): Promise<FileUploadResult> {
    console.log(`   Uploading: ${path.basename(localPath)} → ${remotePath}`);

    try {
      // Check if local file exists
      await fs.access(localPath);

      // Build rclone command using 'copyto' instead of 'copy' to avoid path duplication
      // This ensures the file is copied to the exact remote path specified
      const remoteFullPath = `${this.REMOTE_NAME}:${this.BUCKET_NAME}/${remotePath}`;
      const command = this.RCLONE_BINARY;
      const args = [
        'copyto', // Use 'copyto' instead of 'copy' to prevent directory creation
        localPath,
        remoteFullPath,
        '--progress',
        '--stats-one-line',
      ];

      // Execute rclone command
      const result = await this.executeRcloneCommand(command, args);

      if (result.success) {
        console.log(`     ✅ Uploaded: ${path.basename(localPath)}`);
        return { success: true };
      } else {
        console.error(`     ❌ Upload failed: ${result.error}`);
        return { success: false, error: result.error };
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`     ❌ Upload error: ${errorMessage}`);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * Execute rclone command with proper error handling
   */
  static async executeRcloneCommand(
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
        if (code === 0) {
          resolve({ success: true, output: stdout });
        } else {
          resolve({
            success: false,
            error: `rclone exited with code ${code}: ${stderr}`,
            output: stdout,
          });
        }
      });

      process.on('error', (error) => {
        resolve({
          success: false,
          error: `Failed to execute rclone: ${error.message}`,
        });
      });
    });
  }

  /**
   * List audio files in R2 bucket
   */
  static async listR2Files(
    language: string | null = null,
    category: string | null = null
  ): Promise<R2File[]> {
    console.log(`📋 Listing R2 files...`);

    try {
      let remotePath = `${this.REMOTE_NAME}:${this.BUCKET_NAME}/audio`;

      if (language) {
        remotePath += `/${language}`;
        if (category) {
          remotePath += `/${category}`;
        }
      }

      const args = ['ls', remotePath, '--recursive'];
      const result = await this.executeRcloneCommand(this.RCLONE_BINARY, args);

      if (result.success) {
        const files = this.parseRcloneListOutput(result.output || '');
        console.log(`✅ Found ${files.length} files in R2`);
        return files;
      } else {
        console.error(`❌ Failed to list R2 files: ${result.error}`);
        return [];
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`❌ Error listing R2 files: ${errorMessage}`);
      return [];
    }
  }

  /**
   * Parse rclone ls output into structured data
   */
  static parseRcloneListOutput(output: string): R2File[] {
    const files: R2File[] = [];
    const lines = output.split('\n').filter((line) => line.trim());

    for (const line of lines) {
      const match = line.match(/^\s*(\d+)\s+(.+)$/);
      if (match) {
        const size = parseInt(match[1]);
        const filePath = match[2];
        const pathParts = filePath.split('/');

        if (pathParts.length >= 4) {
          files.push({
            path: filePath,
            size: size,
            language: pathParts[1],
            category: pathParts[2],
            id: pathParts[3],
            filename: pathParts[pathParts.length - 1],
            url: `${this.BASE_URL}/${filePath}`,
          });
        }
      }
    }

    return files;
  }

  /**
   * Delete audio files from R2
   */
  static async deleteR2Files(
    id: string,
    language: string,
    category: string
  ): Promise<boolean> {
    console.log(`🗑️ Deleting R2 files: ${id} (${language})`);

    try {
      const remotePath = `${this.REMOTE_NAME}:${this.BUCKET_NAME}/audio/${language}/${category}/${id}`;
      const args = ['purge', remotePath];

      const result = await this.executeRcloneCommand(this.RCLONE_BINARY, args);

      if (result.success) {
        console.log(`✅ Deleted R2 files: ${id} (${language})`);
        return true;
      } else {
        console.error(`❌ Failed to delete R2 files: ${result.error}`);
        return false;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`❌ Error deleting R2 files: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Check if rclone is available and configured
   */
  static async checkRcloneAvailability(): Promise<boolean> {
    try {
      console.log(`🔍 Checking rclone availability...`);
      const result = await this.executeRcloneCommand(this.RCLONE_BINARY, [
        'version',
      ]);

      if (result.success) {
        console.log(`✅ rclone found and working`);

        // Check if remote is configured
        const configResult = await this.executeRcloneCommand(
          this.RCLONE_BINARY,
          ['listremotes']
        );
        if (configResult.success) {
          const remotes = (configResult.output || '')
            .split('\n')
            .filter((line) => line.trim());
          console.log(`📋 Available remotes: ${remotes.join(', ')}`);

          if (configResult.output?.includes(this.REMOTE_NAME)) {
            console.log(`✅ Remote '${this.REMOTE_NAME}' is configured`);
            return true;
          } else {
            console.error(
              `❌ rclone remote '${this.REMOTE_NAME}' not configured`
            );
            console.error(`💡 Configure remote with:`);
            console.error(`   rclone config create ${this.REMOTE_NAME} s3 \\`);
            console.error(`     provider=Cloudflare \\`);
            console.error(`     access_key_id=YOUR_ACCESS_KEY \\`);
            console.error(`     secret_access_key=YOUR_SECRET_KEY \\`);
            console.error(
              `     endpoint=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com \\`
            );
            console.error(`     region=auto`);
            return false;
          }
        } else {
          console.error(
            `❌ Failed to list rclone remotes: ${configResult.error}`
          );
          return false;
        }
      } else {
        console.error(`❌ rclone not available: ${result.error}`);
        console.error(`💡 Install rclone:`);
        console.error(`   curl https://rclone.org/install.sh | sudo bash`);
        return false;
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      console.error(`❌ Error checking rclone: ${errorMessage}`);
      return false;
    }
  }

  /**
   * Generate public URL for a file
   */
  static generatePublicUrl(
    id: string,
    language: string,
    category: string,
    filename: string
  ): string {
    return `${this.BASE_URL}/audio/${language}/${category}/${id}/${filename}`;
  }
}
