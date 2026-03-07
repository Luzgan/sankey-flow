# Quick Start Guide - Sankey Chart Tableau Extension

## Prerequisites

- **Tableau Desktop/Server**: Version 2018.2 or higher
- **Node.js**: Version 16 or higher
- **npm**: Comes with Node.js
- **Extensions API**: The local development server

## Quick Setup (5 minutes)

### 1. Install Dependencies

```bash
cd tableau-extension
npm install
npm run build
```

### 2. Start Extensions API Server

```bash
cd ../extensions-api
npm install
npm start
```

### 3. Register Extension in Tableau

1. Open Tableau Desktop
2. Go to **Help** > **Settings and Performance** > **Manage Extensions**
3. Click **"Add Extension"**
4. Browse to `tableau-extension/SankeyViz.trex`
5. Click **"Add"**

### 4. Test the Extension

1. Create a new worksheet in Tableau
2. Connect to the `sample-data.csv` file in the `tableau-extension` folder
3. In the Marks card, click the dropdown and select **"Extension"**
4. Choose **"Sankey Chart"**
5. Drag fields to the shelves:
   - **Level**: Drag "Source", "Category", "Target" (in order)
   - **Edge**: Drag "Value"

## Expected Result

You should see a Sankey diagram showing the flow from energy sources through electricity generation to end users, with:

- **Nodes**: Representing each level (Source, Category, Target)
- **Links**: Showing the flow values between levels
- **Colors**: Different colors for each level
- **Interactivity**: Hover and click to select

## Troubleshooting

### Extension Not Loading

- Ensure the Extensions API server is running on `http://localhost:8765`
- Check that the .trex file path is correct
- Verify the HTML file is accessible

### No Data Displayed

- Ensure you have data in your worksheet
- Check that you've added fields to both Level and Edge encodings
- Verify your data has the correct structure (see sample-data.csv)

### Build Errors

- Run `npm install` to ensure all dependencies are installed
- Check that TypeScript is properly installed: `npx tsc --version`

## Data Format Requirements

Your data should have:

- **Multiple levels**: At least 2 levels for a meaningful Sankey diagram
- **Flow values**: A numeric field representing the flow between levels
- **Consistent structure**: Each row should have values for all levels

Example:

```
Level1, Level2, Level3, Value
Source, Category, Target, FlowAmount
```

## Next Steps

- Customize colors and styling
- Add more levels to your data
- Explore the TypeScript source code for customization
- Check the main README.md for detailed documentation
