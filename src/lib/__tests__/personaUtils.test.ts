import { describe, it, expect, vi } from 'vitest';
import { parsePersonaCSV, matchImageFilesToCSV, validateImageFile } from '../personaUtils';

// Mock Papa.parse
const mockPapaParse = vi.fn();
vi.mock('papaparse', () => ({
  default: {
    parse: mockPapaParse,
  },
}));

describe('personaUtils', () => {
  describe('parsePersonaCSV', () => {
    it('should parse valid CSV data', async () => {
      const mockFile = new File(['content'], 'test.csv', { type: 'text/csv' });
      const mockData = [
        { filename: 'image1.jpg', alt_text: 'Alt text 1', mood_desc: 'Happy' },
        { filename: 'image2.jpg', alt_text: 'Alt text 2', mood_desc: 'Sad' },
      ];

      mockPapaParse.mockImplementation((file, options) => {
        options.complete({ data: mockData, errors: [] });
      });

      const result = await parsePersonaCSV(mockFile);
      expect(result).toEqual(mockData);
    });

    it('should reject when CSV has parsing errors', async () => {
      const mockFile = new File(['content'], 'test.csv', { type: 'text/csv' });
      const mockErrors = [{ message: 'Invalid CSV format' }];

      mockPapaParse.mockImplementation((file, options) => {
        options.complete({ data: [], errors: mockErrors });
      });

      await expect(parsePersonaCSV(mockFile)).rejects.toThrow('CSV parsing errors: Invalid CSV format');
    });

    it('should reject when required columns are missing', async () => {
      const mockFile = new File(['content'], 'test.csv', { type: 'text/csv' });
      const mockData = [
        { filename: 'image1.jpg', alt_text: 'Alt text 1' }, // missing mood_desc
      ];

      mockPapaParse.mockImplementation((file, options) => {
        options.complete({ data: mockData, errors: [] });
      });

      await expect(parsePersonaCSV(mockFile)).rejects.toThrow('Missing required columns: mood_desc');
    });
  });

  describe('matchImageFilesToCSV', () => {
    it('should match image files to CSV data', () => {
      const csvData = [
        { filename: 'image1.jpg', alt_text: 'Alt text 1', mood_desc: 'Happy' },
        { filename: 'image2.png', alt_text: 'Alt text 2', mood_desc: 'Sad' },
        { filename: 'image3.gif', alt_text: 'Alt text 3', mood_desc: 'Excited' },
      ];

      const imageFiles = [
        new File(['content'], 'image1.jpg', { type: 'image/jpeg' }),
        new File(['content'], 'image2.png', { type: 'image/png' }),
        new File(['content'], 'other.jpg', { type: 'image/jpeg' }),
      ];

      const result = matchImageFilesToCSV(csvData, imageFiles);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'Image1',
        mood: 'Happy',
        alt_text: 'Alt text 1',
        image_file: imageFiles[0],
      });
      expect(result[1]).toEqual({
        name: 'Image2',
        mood: 'Sad',
        alt_text: 'Alt text 2',
        image_file: imageFiles[1],
      });
    });

    it('should handle filenames with hyphens and underscores', () => {
      const csvData = [
        { filename: 'happy-face_emoji.jpg', alt_text: 'Happy face', mood_desc: 'Joyful' },
      ];

      const imageFiles = [
        new File(['content'], 'happy-face_emoji.jpg', { type: 'image/jpeg' }),
      ];

      const result = matchImageFilesToCSV(csvData, imageFiles);

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Happy face emoji');
    });

    it('should return empty array when no matches found', () => {
      const csvData = [
        { filename: 'image1.jpg', alt_text: 'Alt text 1', mood_desc: 'Happy' },
      ];

      const imageFiles = [
        new File(['content'], 'different.jpg', { type: 'image/jpeg' }),
      ];

      const result = matchImageFilesToCSV(csvData, imageFiles);
      expect(result).toHaveLength(0);
    });
  });

  describe('validateImageFile', () => {
    it('should validate correct image types', () => {
      const validFiles = [
        new File(['content'], 'test.jpg', { type: 'image/jpeg' }),
        new File(['content'], 'test.png', { type: 'image/png' }),
        new File(['content'], 'test.gif', { type: 'image/gif' }),
        new File(['content'], 'test.webp', { type: 'image/webp' }),
      ];

      validFiles.forEach(file => {
        expect(validateImageFile(file)).toBe(true);
      });
    });

    it('should reject invalid image types', () => {
      const invalidFiles = [
        new File(['content'], 'test.txt', { type: 'text/plain' }),
        new File(['content'], 'test.pdf', { type: 'application/pdf' }),
        new File(['content'], 'test.mp4', { type: 'video/mp4' }),
      ];

      invalidFiles.forEach(file => {
        expect(validateImageFile(file)).toBe(false);
      });
    });

    it('should reject files larger than 5MB', () => {
      const largeContent = new Array(6 * 1024 * 1024).fill('x').join(''); // 6MB
      const largeFile = new File([largeContent], 'test.jpg', { type: 'image/jpeg' });

      expect(validateImageFile(largeFile)).toBe(false);
    });

    it('should accept files smaller than 5MB', () => {
      const smallContent = new Array(1024).fill('x').join(''); // 1KB
      const smallFile = new File([smallContent], 'test.jpg', { type: 'image/jpeg' });

      expect(validateImageFile(smallFile)).toBe(true);
    });
  });
});