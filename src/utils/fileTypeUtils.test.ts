import { describe, it, expect } from 'vitest';
import { determineFileType, safeFilename } from './fileTypeUtils';

describe('fileTypeUtils', () => {
  describe('determineFileType', () => {
    it('should detect image files', () => {
      expect(determineFileType('photo.jpg')).toBe('image');
      expect(determineFileType('photo.png')).toBe('image');
      expect(determineFileType('photo.gif')).toBe('image');
      expect(determineFileType('photo.webp')).toBe('image');
    });

    it('should detect PDF files', () => {
      expect(determineFileType('document.pdf')).toBe('pdf');
    });

    it('should detect Word documents', () => {
      expect(determineFileType('document.docx')).toBe('docx');
      expect(determineFileType('document.doc')).toBe('docx');
    });

    it('should detect Excel files', () => {
      expect(determineFileType('data.xlsx')).toBe('excel');
      expect(determineFileType('data.xls')).toBe('excel');
    });

    it('should detect CSV files', () => {
      expect(determineFileType('data.csv')).toBe('csv');
    });

    it('should detect code files', () => {
      expect(determineFileType('app.js')).toBe('code');
      expect(determineFileType('app.ts')).toBe('code');
    });

    it('should detect CSS as text', () => {
      expect(determineFileType('style.css')).toBe('text');
    });

    it('should detect archive files', () => {
      expect(determineFileType('archive.zip')).toBe('archive');
      expect(determineFileType('archive.rar')).toBe('archive');
    });

    it('should detect video files', () => {
      expect(determineFileType('video.mp4')).toBe('video');
    });

    it('should detect audio files', () => {
      expect(determineFileType('audio.mp3')).toBe('audio');
    });

    it('should default to text for unknown', () => {
      expect(determineFileType('unknown.xyz')).toBe('text');
    });
  });

  describe('safeFilename', () => {
    it('should remove invalid characters', () => {
      const result = safeFilename('file<>name.txt');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
    });

    it('should return attachment for undefined', () => {
      expect(safeFilename(undefined)).toBe('attachment');
    });

    it('should keep valid filenames unchanged', () => {
      expect(safeFilename('valid-file_name.txt')).toBe('valid-file_name.txt');
    });
  });
});
