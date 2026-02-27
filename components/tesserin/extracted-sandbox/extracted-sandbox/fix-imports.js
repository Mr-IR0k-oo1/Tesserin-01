const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walk(dirPath, callback) : callback(dirPath);
  });
}

walk('./extracted-sandbox/src', (filePath) => {
  if (filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // We want to replace paths like "~/components/..." with relative paths.
    // The base directory for "~/" is "extracted-sandbox/src"
    
    const srcDir = path.resolve('./extracted-sandbox/src');
    const fileDir = path.dirname(path.resolve(filePath));
    
    // Calculate relative path from this file's directory back to srcDir
    let relPathToSrc = path.relative(fileDir, srcDir);
    if (relPathToSrc === '') relPathToSrc = '.';
    
    // Replace all occurrences of import { ... } from '~/[path]';
    // or import ... from '~/[path]';
    const regex = /from\s+['"]~\/(.*?)['"]/g;
    let changed = false;
    content = content.replace(regex, (match, impPath) => {
      changed = true;
      let newImp = path.join(relPathToSrc, impPath);
      if (!newImp.startsWith('.')) newImp = './' + newImp;
      return `from '${newImp}'`;
    });
    
    // Generic import case
    const regex2 = /import\s+['"]~\/(.*?)['"]/g;
    content = content.replace(regex2, (match, impPath) => {
      changed = true;
      let newImp = path.join(relPathToSrc, impPath);
      if (!newImp.startsWith('.')) newImp = './' + newImp;
      return `import '${newImp}'`;
    });

    if (changed) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Fixed imports in', filePath);
    }
  }
});
