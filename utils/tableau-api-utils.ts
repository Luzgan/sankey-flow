/**
 * Tableau Extensions API utilities and type-safe wrappers
 */

import { 
  Extensions, 
  Settings,
  UI,
  Environment
} from '@tableau/extensions-api-types';

declare global {
  interface Window {
    tableau: {
      extensions: Extensions;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped Tableau global API
      TableauEventType: any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- untyped Tableau global API
      ErrorCodes: any;
    };
    __sankeyDragSaving?: boolean;
  }
}

/**
 * Check if Tableau Extensions API is available
 */
export function isTableauAvailable(): boolean {
  return typeof window !== 'undefined' && 
         typeof window.tableau !== 'undefined' && 
         typeof window.tableau.extensions !== 'undefined';
}

/**
 * Get Tableau Extensions API with error handling
 */
export function getTableauExtensions(): Extensions {
  if (!isTableauAvailable()) {
    throw new Error('Tableau Extensions API is not available');
  }
  return window.tableau.extensions;
}

/**
 * Check if the extension is running in authoring mode (vs viewing on a published dashboard)
 */
export function isAuthoringMode(): boolean {
  try {
    return getTableauExtensions().environment.mode === "authoring";
  } catch {
    // Dev mode / mock — treat as authoring
    return true;
  }
}

/**
 * Settings utility functions
 */
export const TableauSettings = {
  /**
   * Get a setting value safely
   */
  get(key: string): string | undefined {
    try {
      const extensions = getTableauExtensions();
      return extensions.settings?.get(key);
    } catch (error) {
      console.warn(`Error getting setting '${key}':`, error);
      return undefined;
    }
  },

  /**
   * Set a setting value safely
   */
  set(key: string, value: string): boolean {
    try {
      const extensions = getTableauExtensions();
      extensions.settings?.set(key, value);
      return true;
    } catch (error) {
      console.error(`Error setting '${key}':`, error);
      return false;
    }
  },

  /**
   * Save settings async with error handling
   */
  async save(): Promise<boolean> {
    try {
      const extensions = getTableauExtensions();
      await extensions.settings?.saveAsync();
      return true;
    } catch (error) {
      console.error('Error saving settings:', error);
      return false;
    }
  },

  /**
   * Get all settings safely
   */
  getAll(): { [key: string]: string } {
    try {
      const extensions = getTableauExtensions();
      return extensions.settings?.getAll() || {};
    } catch (error) {
      console.warn('Error getting all settings:', error);
      return {};
    }
  },

  /**
   * Add settings change listener
   */
  addChangeListener(handler: () => void): () => void {
    try {
      const extensions = getTableauExtensions();
      if (extensions.settings && window.tableau.TableauEventType) {
        extensions.settings.addEventListener(
          window.tableau.TableauEventType.SettingsChanged,
          handler
        );
        
        // Return cleanup function
        return () => {
          try {
            extensions.settings?.removeEventListener(
              window.tableau.TableauEventType.SettingsChanged,
              handler
            );
          } catch (error) {
            console.warn('Error removing settings listener:', error);
          }
        };
      }
    } catch (error) {
      console.error('Error adding settings listener:', error);
    }
    
    // Return no-op cleanup function
    return () => {};
  }
};

/**
 * UI utility functions
 */
export const TableauUI = {
  /**
   * Display dialog safely
   */
  async displayDialog(url: string, payload?: string, options?: any): Promise<string | null> {
    try {
      const extensions = getTableauExtensions();
      if (!extensions.ui) {
        throw new Error('Tableau UI API not available');
      }
      
      return await extensions.ui.displayDialogAsync(url, payload, options);
    } catch (error) {
      console.error('Error displaying dialog:', error);
      return null;
    }
  },

  /**
   * Close dialog safely
   */
  closeDialog(payload?: string): boolean {
    try {
      const extensions = getTableauExtensions();
      extensions.ui?.closeDialog(payload);
      return true;
    } catch (error) {
      console.error('Error closing dialog:', error);
      return false;
    }
  }
};

/**
 * Extension initialization utilities
 */
export const TableauInit = {
  /**
   * Initialize extension with error handling
   */
  async initialize(options?: { configure?: () => {} }): Promise<boolean> {
    try {
      const extensions = getTableauExtensions();
      await extensions.initializeAsync(options);
      return true;
    } catch (error) {
      console.error('Error initializing extension:', error);
      return false;
    }
  },

  /**
   * Initialize dialog with error handling
   */
  async initializeDialog(): Promise<string | null> {
    try {
      const extensions = getTableauExtensions();
      return await extensions.initializeDialogAsync();
    } catch (error) {
      console.error('Error initializing dialog:', error);
      return null;
    }
  }
};

/**
 * Get worksheet safely
 */
export function getWorksheet() {
  try {
    const extensions = getTableauExtensions();
    return extensions.worksheetContent?.worksheet;
  } catch (error) {
    console.error('Error getting worksheet:', error);
    return null;
  }
}

/**
 * Get workbook formatting safely
 */
export function getWorkbookFormatting() {
  try {
    const extensions = getTableauExtensions();
    return extensions.environment?.workbookFormatting;
  } catch (error) {
    console.error('Error getting workbook formatting:', error);
    return null;
  }
}

/**
 * Get Tableau event types safely
 */
export function getTableauEventType() {
  try {
    return window.tableau?.TableauEventType;
  } catch (error) {
    console.error('Error getting Tableau event types:', error);
    return null;
  }
}