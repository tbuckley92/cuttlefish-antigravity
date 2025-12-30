import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple CSV parser
function parseCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const row = {};
    let currentField = '';
    let inQuotes = false;
    let headerIndex = 0;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        row[headers[headerIndex]] = currentField.trim();
        currentField = '';
        headerIndex++;
      } else {
        currentField += char;
      }
    }
    // Add last field
    if (headerIndex < headers.length) {
      row[headers[headerIndex]] = currentField.trim();
    }
    
    rows.push(row);
  }
  
  return rows;
}

// Convert specialty name to constant name (e.g., "Cataract Surgery" -> "CATARACT_SURGERY")
function specialtyToConstantName(specialty) {
  return specialty
    .replace(/&/g, 'AND')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .toUpperCase()
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

// Convert boolean string to boolean
function parseBoolean(value) {
  return value.toUpperCase() === 'TRUE';
}

// Generate TypeScript constants
function generateConstants(csvData) {
  // Group data by Level and Specialty
  const grouped = {};
  
  csvData.forEach(row => {
    const level = parseInt(row.Level);
    const specialty = row.Specialty;
    const section = row.Section;
    const type = row.Type;
    const content = row.Content;
    const hasBlurb = parseBoolean(row.HasBlurb);
    const showCommentsAlways = parseBoolean(row.ShowCommentsAlways);
    const order = parseInt(row.Order);
    
    if (!grouped[level]) {
      grouped[level] = {};
    }
    if (!grouped[level][specialty]) {
      grouped[level][specialty] = {
        learningOutcomes: [],
        criteria: {
          sectionB: [],
          sectionC: [],
          sectionD: [],
          sectionE: [],
          sectionF: []
        },
        sectionBlurbs: {
          sectionB: false,
          sectionC: false,
          sectionD: false,
          sectionE: false,
          sectionF: false
        },
        showCommentsAlways: {
          sectionB: false,
          sectionC: false,
          sectionD: false,
          sectionE: false,
          sectionF: false
        }
      };
    }
    
    if (type === 'LearningOutcome') {
      grouped[level][specialty].learningOutcomes.push({
        content,
        order
      });
    } else if (type === 'Criterion') {
      const sectionKey = `section${section}`;
      if (grouped[level][specialty].criteria[sectionKey]) {
        grouped[level][specialty].criteria[sectionKey].push({
          content,
          order
        });
        // Track if section has blurb or always shows comments
        if (hasBlurb) {
          grouped[level][specialty].sectionBlurbs[sectionKey] = true;
        }
        if (showCommentsAlways) {
          grouped[level][specialty].showCommentsAlways[sectionKey] = true;
        }
      }
    }
  });
  
  // Sort by order
  Object.keys(grouped).forEach(level => {
    Object.keys(grouped[level]).forEach(specialty => {
      grouped[level][specialty].learningOutcomes.sort((a, b) => a.order - b.order);
      ['sectionB', 'sectionC', 'sectionD', 'sectionE', 'sectionF'].forEach(sectionKey => {
        grouped[level][specialty].criteria[sectionKey].sort((a, b) => a.order - b.order);
      });
    });
  });
  
  // Generate TypeScript code
  let tsCode = `// This file is auto-generated from epa-forms-data.csv.csv
// Do not edit manually - run: npm run generate-epa-data

export interface EPASpecialtyData {
  learningOutcomes: string[];
  criteria: {
    sectionB: string[];
    sectionC: string[];
    sectionD: string[];
    sectionE: string[];
    sectionF: string[];
  };
  sectionBlurbs: {
    sectionB: boolean;
    sectionC: boolean;
    sectionD: boolean;
    sectionE: boolean;
    sectionF: boolean;
  };
  showCommentsAlways: {
    sectionB: boolean;
    sectionC: boolean;
    sectionD: boolean;
    sectionE: boolean;
    sectionF: boolean;
  };
}

`;

  // Generate constants for each level and specialty
  Object.keys(grouped).sort().forEach(level => {
    Object.keys(grouped[level]).sort().forEach(specialty => {
      const data = grouped[level][specialty];
      const constName = `LEVEL_${level}_${specialtyToConstantName(specialty)}`;
      
      tsCode += `export const ${constName}: EPASpecialtyData = {\n`;
      tsCode += `  learningOutcomes: [\n`;
      data.learningOutcomes.forEach(lo => {
        tsCode += `    ${JSON.stringify(lo.content)},\n`;
      });
      tsCode += `  ],\n`;
      tsCode += `  criteria: {\n`;
      ['sectionB', 'sectionC', 'sectionD', 'sectionE', 'sectionF'].forEach(sectionKey => {
        tsCode += `    ${sectionKey}: [\n`;
        data.criteria[sectionKey].forEach(criterion => {
          tsCode += `      ${JSON.stringify(criterion.content)},\n`;
        });
        tsCode += `    ],\n`;
      });
      tsCode += `  },\n`;
      tsCode += `  sectionBlurbs: {\n`;
      ['sectionB', 'sectionC', 'sectionD', 'sectionE', 'sectionF'].forEach(sectionKey => {
        tsCode += `    ${sectionKey}: ${data.sectionBlurbs[sectionKey]},\n`;
      });
      tsCode += `  },\n`;
      tsCode += `  showCommentsAlways: {\n`;
      ['sectionB', 'sectionC', 'sectionD', 'sectionE', 'sectionF'].forEach(sectionKey => {
        tsCode += `    ${sectionKey}: ${data.showCommentsAlways[sectionKey]},\n`;
      });
      tsCode += `  },\n`;
      tsCode += `};\n\n`;
    });
  });
  
  // Generate a lookup map
  tsCode += `\n// Lookup map: Level -> Specialty -> Data\n`;
  tsCode += `export const EPA_SPECIALTY_DATA: Record<number, Record<string, EPASpecialtyData>> = {\n`;
  Object.keys(grouped).sort().forEach(level => {
    tsCode += `  ${level}: {\n`;
    Object.keys(grouped[level]).sort().forEach(specialty => {
      const constName = `LEVEL_${level}_${specialtyToConstantName(specialty)}`;
      tsCode += `    ${JSON.stringify(specialty)}: ${constName},\n`;
    });
    tsCode += `  },\n`;
  });
  tsCode += `};\n`;
  
  return tsCode;
}

// Main execution
try {
  const csvPath = path.join(__dirname, '..', 'epa-forms-data.csv.csv');
  const csvContent = fs.readFileSync(csvPath, 'utf-8');
  const csvData = parseCSV(csvContent);
  
  const tsCode = generateConstants(csvData);
  
  const outputPath = path.join(__dirname, '..', 'constants', 'epaSpecialtyData.ts');
  
  // Create constants directory if it doesn't exist
  const constantsDir = path.dirname(outputPath);
  if (!fs.existsSync(constantsDir)) {
    fs.mkdirSync(constantsDir, { recursive: true });
  }
  
  fs.writeFileSync(outputPath, tsCode, 'utf-8');
  
  console.log(`✅ Generated TypeScript constants from CSV`);
  console.log(`   Input: ${csvPath}`);
  console.log(`   Output: ${outputPath}`);
  console.log(`   Processed ${csvData.length} rows`);
} catch (error) {
  console.error('❌ Error generating constants:', error);
  process.exit(1);
}


