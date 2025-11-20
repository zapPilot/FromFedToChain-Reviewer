import { ContentManager } from '../ContentManager';
import { ContentSchema, type PipelineConfigEntry } from '../ContentSchema';
import { TranslationService } from './TranslationService';
import { AudioService } from './AudioService';
import { SocialService } from './SocialService';
import { M3U8AudioService } from './M3U8AudioService';
import { CloudflareR2Service } from './CloudflareR2Service';
import {
  getAudioLanguages,
  getM3U8Config,
  shouldGenerateM3U8,
  shouldUploadToR2,
  isSupportedLanguage,
} from '@/config/languages';
import fs from 'fs/promises';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { Language, Status } from '@/types/content';
import { getErrorMessage, logError } from '../utils/error-handler';

const execAsync = promisify(exec);

interface PipelineExecutionStep {
  from: Status;
  to: Status | null;
  description: string;
  success: boolean;
}

interface PendingContent {
  content: any;
  nextPhase: string;
  currentStatus: Status;
  nextStatus: Status | null;
  description: string;
}

interface ContentFile {
  localPath: string;
  r2Key: string;
  language: string;
  category: string;
  id: string;
}

export class ContentPipelineService {
  /**
   * Get content that needs processing for a specific status
   */
  static async getPendingContent(status: Status): Promise<any[]> {
    try {
      const step = ContentSchema.getPipelineStep(status);
      if (!step) {
        console.warn(`No pipeline step found for status: ${status}`);
        return [];
      }

      // Get content with the specified status
      const content = await ContentManager.getByStatus(status);
      return content;
    } catch (error) {
      const errorMessage = logError(
        `Error getting pending content for ${status}`,
        error
      );
      return [];
    }
  }

  /**
   * Get all pending content across all pipeline stages
   */
  static async getAllPendingContent(): Promise<PendingContent[]> {
    const pendingContent: PendingContent[] = [];
    const pipelineConfig = ContentSchema.getPipelineConfig();

    for (const step of pipelineConfig) {
      const content = await this.getPendingContent(step.status);
      content.forEach((item) => {
        pendingContent.push({
          content: item,
          nextPhase: step.phase,
          currentStatus: step.status,
          nextStatus: step.nextStatus,
          description: step.description,
        });
      });
    }

    // Sort by date (newest first)
    return pendingContent.sort(
      (a, b) =>
        new Date(b.content.date).getTime() - new Date(a.content.date).getTime()
    );
  }

  /**
   * Process content through the next pipeline step
   */
  static async processContentNextStep(id: string): Promise<boolean> {
    try {
      const sourceContent = await ContentManager.readSource(id);
      const currentStatus = sourceContent.status;

      const step = ContentSchema.getPipelineStep(currentStatus);
      if (!step) {
        console.warn(`No pipeline step found for status: ${currentStatus}`);
        return false;
      }

      if (!step.nextStatus) {
        console.log(
          `Content ${id} is in final pipeline stage (${currentStatus}). No next step.`
        );
        return true;
      }

      console.log(`🔄 Processing ${id}: ${currentStatus} → ${step.nextStatus}`);
      console.log(`   ${step.description}`);

      // Execute the appropriate processing step
      const success = await this.executeProcessingStep(id, step);

      if (success) {
        console.log(`✅ ${id}: ${currentStatus} → ${step.nextStatus}`);
        return true;
      } else {
        console.error(`❌ Failed to process ${id} from ${currentStatus}`);
        return false;
      }
    } catch (error) {
      const errorMessage = logError(`Error processing ${id}`, error);
      return false;
    }
  }

  /**
   * Execute the specific processing step based on the pipeline configuration
   */
  static async executeProcessingStep(
    id: string,
    step: PipelineConfigEntry
  ): Promise<boolean> {
    try {
      switch (step.status) {
        case 'reviewed':
          await TranslationService.translateAll(id);
          await ContentManager.updateSourceStatus(id, 'translated');
          return true;

        case 'translated':
          await AudioService.generateWavOnly(id);
          await ContentManager.updateSourceStatus(id, 'wav');
          return true;

        case 'wav':
          return await this.generateM3U8Step(id);

        case 'm3u8':
          return await this.uploadToCloudflareStep(id);

        case 'cloudflare':
          return await this.uploadContentToCloudflareStep(id);

        case 'content':
          await SocialService.generateAllHooks(id);
          return true;

        default:
          console.error(`Unknown processing step: ${step.status}`);
          return false;
      }
    } catch (error) {
      const errorMessage = logError('Processing step failed', error);
      return false;
    }
  }

  static async processContent(
    id: string,
    startFrom?: Status
  ): Promise<{ steps: PipelineExecutionStep[]; finalStatus: Status }> {
    const sourceContent = await ContentManager.readSource(id);
    let currentStatus = sourceContent.status as Status;

    if (startFrom) {
      const startStep = ContentSchema.getPipelineStep(startFrom);
      if (!startStep) {
        throw new Error(`Invalid pipeline step: ${startFrom}`);
      }
      if (currentStatus !== startFrom) {
        throw new Error(
          `Content ${id} is currently ${currentStatus} and cannot start from ${startFrom}`
        );
      }
    }

    const executedSteps: PipelineExecutionStep[] = [];
    const MAX_STEPS = 10;
    let safetyCounter = 0;

    while (safetyCounter < MAX_STEPS) {
      const freshContent = await ContentManager.readSource(id);
      currentStatus = freshContent.status as Status;
      const step = ContentSchema.getPipelineStep(currentStatus);

      if (!step || !step.nextStatus) {
        break;
      }

      const success = await this.processContentNextStep(id);
      executedSteps.push({
        from: currentStatus,
        to: step.nextStatus,
        description: step.description,
        success,
      });

      if (!success) {
        break;
      }

      const updatedContent = await ContentManager.readSource(id);
      const newStatus = updatedContent.status as Status;
      if (newStatus === currentStatus) {
        console.warn(
          `⚠️ Status did not advance after processing ${currentStatus} for ${id}`
        );
        break;
      }

      currentStatus = newStatus;
      safetyCounter += 1;
    }

    return {
      steps: executedSteps,
      finalStatus: currentStatus,
    };
  }

  /**
   * Generate M3U8 files for content (extracted from cli.js)
   */
  static async generateM3U8Step(id: string): Promise<boolean> {
    console.log(`🎬 Converting to M3U8 for: ${id}`);

    try {
      // Get available languages for this content
      const availableLanguages = await ContentManager.getAvailableLanguages(id);

      // Language configuration
      const audioLanguages = getAudioLanguages();
      const targetLanguages = availableLanguages
        .filter((lang): lang is Language => isSupportedLanguage(lang))
        .filter(
          (lang) => audioLanguages.includes(lang) && shouldGenerateM3U8(lang)
        );

      if (targetLanguages.length === 0) {
        console.log(`⚠️ No languages configured for M3U8 conversion`);
        return false;
      }

      console.log(
        `📝 Converting M3U8 for ${targetLanguages.length} languages: ${targetLanguages.join(', ')}`
      );

      let allSuccessful = true;

      for (const language of targetLanguages) {
        try {
          const content = await ContentManager.read(id, language);
          const audioPath = content.audio_file;

          if (!audioPath) {
            throw new Error(`No audio file found for ${language}`);
          }

          const m3u8Config = getM3U8Config(language);
          const m3u8Result = await M3U8AudioService.convertToM3U8(
            audioPath,
            id,
            language,
            content.category,
            m3u8Config
          );

          console.log(`✅ M3U8 converted for ${language}`);
        } catch (error) {
          const errorMessage = logError(
            `M3U8 conversion failed for ${language}`,
            error
          );
          allSuccessful = false;
        }
      }

      if (allSuccessful) {
        await ContentManager.updateSourceStatus(id, 'm3u8');
      }

      return allSuccessful;
    } catch (error) {
      const errorMessage = logError('M3U8 step failed', error);
      return false;
    }
  }

  /**
   * Upload audio files to Cloudflare R2 (extracted from cli.js)
   */
  static async uploadToCloudflareStep(id: string): Promise<boolean> {
    console.log(`☁️ Uploading to Cloudflare R2 for: ${id}`);

    try {
      // Check if rclone is available
      const rcloneAvailable =
        await CloudflareR2Service.checkRcloneAvailability();
      if (!rcloneAvailable) {
        throw new Error(
          'rclone not available. Please install and configure rclone for Cloudflare R2.'
        );
      }

      // Get available languages for this content
      const availableLanguages = await ContentManager.getAvailableLanguages(id);

      const audioLanguages = getAudioLanguages();
      const targetLanguages = availableLanguages
        .filter((lang): lang is Language => isSupportedLanguage(lang))
        .filter(
          (lang) => audioLanguages.includes(lang) && shouldUploadToR2(lang)
        );

      if (targetLanguages.length === 0) {
        console.log(`⚠️ No languages configured for R2 upload`);
        return false;
      }

      console.log(
        `📤 Uploading to R2 for ${targetLanguages.length} languages: ${targetLanguages.join(', ')}`
      );

      let allSuccessful = true;

      for (const language of targetLanguages) {
        try {
          const content = await ContentManager.read(id, language);
          if (!content.audio_file) {
            throw new Error(`No audio path recorded for ${language}`);
          }

          // Get M3U8 files for this content
          const m3u8Info = await M3U8AudioService.getM3U8Files(
            id,
            language,
            content.category
          );

          if (!m3u8Info) {
            throw new Error(
              `No M3U8 files found for ${language}. Run M3U8 conversion first.`
            );
          }

          // Upload only M3U8 files (no WAV files)
          const uploadFiles = {
            m3u8Data: m3u8Info,
          };

          const uploadResult = await CloudflareR2Service.uploadAudioFiles(
            id,
            language,
            content.category,
            uploadFiles
          );

          if (uploadResult.success) {
            // Update content with streaming URLs
            await ContentManager.addAudio(
              id,
              language,
              content.audio_file,
              uploadResult.urls
            );
            console.log(`✅ R2 upload completed for ${language}`);
          } else {
            throw new Error(uploadResult.errors.join(', '));
          }
        } catch (error) {
          const errorMessage = logError(
            `R2 upload failed for ${language}`,
            error
          );
          allSuccessful = false;
        }
      }

      // Update source status to 'cloudflare' if all uploads successful
      if (allSuccessful && targetLanguages.length > 0) {
        await ContentManager.updateSourceStatus(id, 'cloudflare');
      }

      return allSuccessful;
    } catch (error) {
      const errorMessage = logError('Cloudflare upload step failed', error);
      return false;
    }
  }

  /**
   * Upload content files to Cloudflare R2 (extracted from cli.js)
   */
  static async uploadContentToCloudflareStep(id: string): Promise<boolean> {
    console.log(`📄 Uploading content to Cloudflare R2: ${id}`);

    try {
      // Find all language versions of this content
      const contentFiles = await this.findContentFiles(id);

      if (contentFiles.length === 0) {
        throw new Error(`No content files found for: ${id}`);
      }

      console.log(`Found ${contentFiles.length} content file(s) to upload`);

      // Upload each language version
      for (const contentFile of contentFiles) {
        await this.uploadSingleContentFile(contentFile);
      }

      console.log(
        `✅ Content uploaded successfully: ${contentFiles.length} files`
      );
      await ContentManager.updateSourceStatus(id, 'content');

      return true;
    } catch (error) {
      const errorMessage = logError('Content upload failed', error);
      return false;
    }
  }

  /**
   * Find all language/category versions of content (helper method)
   */
  static async findContentFiles(id: string): Promise<ContentFile[]> {
    const contentFiles: ContentFile[] = [];
    const contentDir = 'content';

    try {
      const languages = await fs.readdir(contentDir);

      for (const lang of languages) {
        const langPath = path.join(contentDir, lang);
        const langStat = await fs.stat(langPath);
        if (!langStat.isDirectory()) continue;

        const categories = await fs.readdir(langPath);

        for (const category of categories) {
          const categoryPath = path.join(langPath, category);
          const categoryStat = await fs.stat(categoryPath);
          if (!categoryStat.isDirectory()) continue;

          const articlePath = path.join(categoryPath, `${id}.json`);

          try {
            await fs.access(articlePath);
            contentFiles.push({
              localPath: articlePath,
              r2Key: `content/${lang}/${category}/${id}.json`,
              language: lang,
              category: category,
              id: id,
            });
          } catch (error) {
            // File doesn't exist in this language/category combination
          }
        }
      }
    } catch (error) {
      console.error('Error finding content files:', error);
    }

    return contentFiles;
  }

  /**
   * Upload single content file (helper method)
   */
  static async uploadSingleContentFile(
    contentFile: ContentFile
  ): Promise<void> {
    const { localPath, r2Key, language, category } = contentFile;

    console.log(
      `Uploading: ${localPath} → r2:${CloudflareR2Service.BUCKET_NAME}/${r2Key}`
    );

    const uploadCommand = `rclone copyto "${localPath}" "r2:${CloudflareR2Service.BUCKET_NAME}/${r2Key}"`;

    try {
      await execAsync(uploadCommand);
      console.log(
        `✅ Uploaded: ${language}/${category}/${contentFile.id}.json`
      );
    } catch (error) {
      const errorMessage = logError(
        `Upload failed: ${language}/${category}/${contentFile.id}.json`,
        error
      );
      throw error;
    }
  }

  /**
   * Get pipeline status summary for display
   */
  static getPhaseGroups(
    pendingContent: PendingContent[]
  ): Record<string, PendingContent[]> {
    const phaseGroups: Record<string, PendingContent[]> = {};
    pendingContent.forEach((item) => {
      if (!phaseGroups[item.nextPhase]) {
        phaseGroups[item.nextPhase] = [];
      }
      phaseGroups[item.nextPhase].push(item);
    });
    return phaseGroups;
  }

  /**
   * Get phase color for display
   */
  static getPhaseColor(phase: string): string {
    const colors: Record<string, string> = {
      translation: 'cyan',
      audio: 'green',
      content: 'blue',
      social: 'magenta',
    };
    return colors[phase] || 'white';
  }
}
