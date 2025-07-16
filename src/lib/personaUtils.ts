import Papa from 'papaparse';

export interface PersonaCSVRow {
  filename: string;
  alt_text: string;
  mood_desc: string;
}

export interface ParsedPersonaData {
  name: string;
  mood: string;
  alt_text: string;
  image_file: File;
}

export const parsePersonaCSV = (file: File): Promise<PersonaCSVRow[]> => {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.errors.length > 0) {
          reject(new Error(`CSV parsing errors: ${results.errors.map(e => e.message).join(', ')}`));
          return;
        }

        const data = results.data as PersonaCSVRow[];
        
        // Validate required columns
        const requiredColumns = ['filename', 'alt_text', 'mood_desc'];
        const missingColumns = requiredColumns.filter(col => 
          !data.some(row => row.hasOwnProperty(col))
        );

        if (missingColumns.length > 0) {
          reject(new Error(`Missing required columns: ${missingColumns.join(', ')}`));
          return;
        }

        resolve(data);
      },
      error: (error) => {
        reject(error);
      }
    });
  });
};

export const matchImageFilesToCSV = (
  csvData: PersonaCSVRow[],
  imageFiles: File[]
): ParsedPersonaData[] => {
  const results: ParsedPersonaData[] = [];
  
  csvData.forEach(row => {
    const imageFile = imageFiles.find(file => file.name === row.filename);
    
    if (imageFile) {
      // Extract name from filename (remove extension)
      const name = row.filename.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
      
      results.push({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        mood: row.mood_desc,
        alt_text: row.alt_text,
        image_file: imageFile,
      });
    }
  });

  return results;
};

export const validateImageFile = (file: File): boolean => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
    return false;
  }

  if (file.size > maxSize) {
    return false;
  }

  return true;
};