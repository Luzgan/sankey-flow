# Tableau Extension Development Workflow

## 🚀 Quick Start

### **One-Command Development Setup**

```bash
./dev-start.sh
```

This script will:

- ✅ Check if Extensions API server is running
- ✅ Start it if needed
- ✅ Install dependencies
- ✅ Clean previous builds
- ✅ Start development mode with watch

## 📋 Development Commands

### **Core Development Commands**

| Command             | Purpose                         | When to Use       |
| ------------------- | ------------------------------- | ----------------- |
| `npm run dev`       | TypeScript watch mode           | Basic development |
| `npm run dev:full`  | Full development with file sync | **Recommended**   |
| `npm run start:dev` | Alias for dev:full              | Quick start       |
| `npm run build`     | Production build                | Before deployment |
| `npm run build:dev` | Development build               | Testing dev build |

### **File Management Commands**

| Command                    | Purpose                                     |
| -------------------------- | ------------------------------------------- |
| `npm run copy-files`       | Copy files to extensions-api (shell script) |
| `npm run copy-files:watch` | Auto-copy on file changes                   |
| `npm run clean`            | Remove build files                          |
| `./copy-files.sh`          | Direct shell script execution               |

### **Quality Commands**

| Command            | Purpose            |
| ------------------ | ------------------ |
| `npm run lint`     | Check code quality |
| `npm run lint:fix` | Fix linting issues |

## 🔄 Development Workflow

### **Daily Development Process**

1. **Start Development Environment**:

   ```bash
   ./dev-start.sh
   ```

2. **Open Tableau Public**:

   ```bash
   ./startTableauDevMac.sh
   ```

3. **Make Changes**:
   - Edit `SankeyViz.ts`
   - Webpack automatically recompiles
   - Files automatically copy to extensions-api
   - Refresh Tableau worksheet to see changes

### **What Happens Automatically**

- **TypeScript Compilation**: `SankeyViz.ts` → `SankeyViz.js`
- **Source Maps**: Generated for debugging
- **File Copying**: Built files copied to `../extensions-api/sankey-tableau-extension/`
- **Hot Reloading**: Changes detected and processed

### **Manual Steps**

- **Refresh Tableau Worksheet**: After making changes
- **Register Extension**: One-time setup in Tableau

## 🛠️ Development Features

### **Source Maps**

- Available in development mode
- Set breakpoints in TypeScript files
- Debug original source code

### **Watch Options**

- **TypeScript Files**: Auto-recompile on save
- **HTML Files**: Auto-copy on changes
- **TREX Files**: Auto-copy on changes
- **Aggregate Timeout**: 300ms (prevents rapid rebuilds)
- **Polling**: 1000ms (for file system changes)

### **Development vs Production**

| Feature      | Development | Production   |
| ------------ | ----------- | ------------ |
| Source Maps  | ✅ Yes      | ❌ No        |
| Minification | ❌ No       | ✅ Yes       |
| Debug Info   | ✅ Full     | ❌ Minimal   |
| Performance  | ⚠️ Slower   | ✅ Optimized |

## 📁 File Structure

```
sankey-tableau-extension/
├── SankeyViz.ts          # Main source code
├── SankeyViz.html        # Extension template
├── SankeyViz.trex        # Extension manifest
├── SankeyViz.js          # Compiled JavaScript (generated)
├── SankeyViz.js.map      # Source map (generated)
├── webpack.config.js     # Build configuration
├── package.json          # Dependencies and scripts
├── copy-files.sh         # File copying shell script
├── dev-start.sh          # Development startup script
└── startTableauDevMac.sh # Tableau startup script

../extensions-api/sankey-tableau-extension/
├── SankeyViz.html        # Copied for serving
├── SankeyViz.js          # Copied for serving
├── SankeyViz.js.map      # Copied for serving
└── SankeyViz.trex        # Copied for serving
```

## 🔧 Troubleshooting

### **Common Issues**

#### **Extensions API Server Not Running**

```bash
cd ../extensions-api
npm start
```

#### **Files Not Copying**

```bash
npm run copy-files
```

#### **TypeScript Errors**

- Check `SankeyViz.ts` for syntax errors
- Run `npm run lint` to check code quality

#### **Build Failures**

```bash
npm run clean
npm install
npm run build:dev
```

### **Performance Issues**

#### **Slow Builds**

- Check if `node_modules` is being watched
- Verify watch options in webpack.config.js

#### **Memory Issues**

- Restart development server
- Clear browser cache
- Check for memory leaks in code

## 🚀 Deployment

### **Production Build**

```bash
npm run build
npm run copy-files
```

### **Hosted Deployment**

1. **Build for production**
2. **Upload to hosting service** (GitHub Pages, Netlify, etc.)
3. **Update .trex file** with public URL
4. **Test hosted version**

## 📚 Resources

- [Tableau Extensions API](https://tableau.github.io/extensions-api/)
- [Webpack Documentation](https://webpack.js.org/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [D3.js Documentation](https://d3js.org/)
