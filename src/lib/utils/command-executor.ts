/**
 * Command execution utilities
 * Provides unified command execution with proper error handling
 */

import { spawn } from 'child_process';
import type { CommandResult } from '@/types/service-results';

/**
 * Execute a command and return the result
 * @param command - Command to execute (e.g., 'ffmpeg', 'rclone')
 * @param args - Array of command arguments
 * @returns Promise with command execution result
 */
export async function executeCommand(
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
