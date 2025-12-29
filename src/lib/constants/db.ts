/**
 * Database Constants
 * Centralized configuration for table names and common fields
 */

export const DB_TABLES = {
  CONTENT: 'content',
} as const;

export const DB_FIELDS = {
  ID: 'id',
  LANGUAGE: 'language',
  STATUS: 'status',
  CATEGORY: 'category',
  UPDATED_AT: 'updated_at',
  CREATED_AT: 'created_at',
  FEEDBACK: 'feedback',
} as const;
