import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { executeCommand } from '@/lib/utils/command-executor';
import { EventEmitter } from 'events';

// Mock child_process.spawn
vi.mock('child_process', () => ({
  spawn: vi.fn(),
}));

describe('executeCommand', () => {
  let mockSpawn: any;
  let mockProcess: EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
  };

  beforeEach(async () => {
    const childProcess = await import('child_process');
    mockSpawn = childProcess.spawn;

    // Create mock process with event emitters
    mockProcess = Object.assign(new EventEmitter(), {
      stdout: new EventEmitter(),
      stderr: new EventEmitter(),
    });

    mockSpawn.mockReturnValue(mockProcess);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('executes command successfully with output', async () => {
    const promise = executeCommand('echo', ['hello']);

    // Simulate stdout data
    mockProcess.stdout.emit('data', Buffer.from('hello world'));

    // Simulate successful close
    mockProcess.emit('close', 0);

    const result = await promise;

    expect(mockSpawn).toHaveBeenCalledWith('echo', ['hello']);
    expect(result.success).toBe(true);
    expect(result.output).toBe('hello world');
    // Note: code is undefined when exit code is 0 due to `code || undefined` logic
    expect(result.code).toBeUndefined();
  });

  it('handles command failure', async () => {
    const promise = executeCommand('failing-cmd', []);

    // Simulate stderr data
    mockProcess.stderr.emit('data', Buffer.from('command failed'));

    // Simulate failure close
    mockProcess.emit('close', 1);

    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toBe('command failed');
    expect(result.code).toBe(1);
  });

  it('handles spawn error', async () => {
    const promise = executeCommand('nonexistent', []);

    // Simulate spawn error
    mockProcess.emit('error', new Error('ENOENT: command not found'));

    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.error).toBe('ENOENT: command not found');
    expect(result.code).toBe(-1);
  });

  it('handles multiple stdout chunks', async () => {
    const promise = executeCommand('cat', ['file.txt']);

    // Simulate multiple chunks
    mockProcess.stdout.emit('data', Buffer.from('line 1\n'));
    mockProcess.stdout.emit('data', Buffer.from('line 2\n'));
    mockProcess.stdout.emit('data', Buffer.from('line 3'));

    mockProcess.emit('close', 0);

    const result = await promise;

    expect(result.output).toBe('line 1\nline 2\nline 3');
  });

  it('handles null exit code', async () => {
    const promise = executeCommand('killed-cmd', []);

    // Simulate null exit code (e.g., killed by signal)
    mockProcess.emit('close', null);

    const result = await promise;

    expect(result.success).toBe(false);
    expect(result.code).toBeUndefined();
  });

  it('passes command arguments correctly', async () => {
    const promise = executeCommand('ffmpeg', [
      '-i',
      'input.wav',
      '-o',
      'output.mp3',
    ]);

    mockProcess.emit('close', 0);

    await promise;

    expect(mockSpawn).toHaveBeenCalledWith('ffmpeg', [
      '-i',
      'input.wav',
      '-o',
      'output.mp3',
    ]);
  });
});
