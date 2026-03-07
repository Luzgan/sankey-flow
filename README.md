# Sankey Chart Tableau Viz Extension

A Tableau viz extension that creates interactive Sankey diagrams to visualize flow relationships between different entities.

## Features

- **Interactive Sankey Charts**: Visualize flow relationships between different levels
- **Tableau Integration**: Seamless integration with Tableau's data and selection system
- **Responsive Design**: Automatically adjusts to container size
- **Interactive Elements**: Hover effects, selection, and smooth animations
- **Color Coding**: Automatic color assignment for different levels
- **Selection Support**: Full integration with Tableau's selection system

## Setup Instructions

### Prerequisites

1. **Tableau Desktop/Server**: Version 2018.2 or higher
2. **Extensions API Server**: The local development server from the extensions-api folder
3. **Web Browser**: For testing the extension

### Installation Steps

1. **Start the Extensions API Server**:

   ```bash
   cd ../extensions-api
   npm install
   npm start
   ```

   This will start the server on `http://localhost:8765`

2. **Copy Extension Files**:

   - Copy the `tableau-extension` folder to the `extensions-api` directory
   - The extension will be available at `http://localhost:8765/tableau-extension/SankeyViz.html`

3. **Register the Extension in Tableau**:
   - Open Tableau Desktop
   - Go to Help > Settings and Performance > Manage Extensions
   - Click "Add Extension"
   - Browse to the `SankeyViz.trex` file in the `tableau-extension` folder
   - Click "Add"

## How to Use

### 1. Create a New Worksheet

1. Open Tableau Desktop
2. Connect to your data source
3. Create a new worksheet

### 2. Add the Sankey Extension

1. In the worksheet, go to the Marks card
2. Click the dropdown arrow next to "Marks"
3. Select "Extension"
4. Choose "Sankey Chart" from the list

### 3. Configure the Visualization

The extension uses two main encodings:

#### **Level Encoding**

- **Purpose**: Defines the nodes/levels in your Sankey diagram
- **Usage**: Drag dimensions or measures to the "Level" shelf
- **Example**: For a flow from Source → Category → Target, you would add:
  - Source field to Level
  - Category field to Level
  - Target field to Level

#### **Edge Encoding**

- **Purpose**: Defines the flow values between levels
- **Usage**: Drag a measure to the "Edge" shelf
- **Example**: Sales, Quantity, or any numeric value representing the flow

### 4. Example Data Structure

For a typical Sankey diagram, your data should have:

- **Source**: The starting point (e.g., "Coal", "Gas", "Nuclear")
- **Category**: Intermediate category (e.g., "Electricity Generation")
- **Target**: The end point (e.g., "Industry", "Residential", "Commercial")
- **Value**: The flow amount (e.g., Sales, Quantity, etc.)

### 5. Sample Data

Here's an example of how your data should be structured:

| Source     | Category    | Target      | Value |
| ---------- | ----------- | ----------- | ----- |
| Coal       | Electricity | Industry    | 30    |
| Gas        | Electricity | Industry    | 25    |
| Nuclear    | Electricity | Residential | 20    |
| Renewables | Electricity | Commercial  | 15    |

## Interactivity

- **Hover**: Hover over links or nodes to see tooltips
- **Click**: Click on links or nodes to select them
- **Multi-select**: Hold Ctrl/Cmd to select multiple elements
- **Clear Selection**: Click outside the chart to clear selection

## Customization

### Colors

The extension automatically assigns colors to different levels using a predefined palette. Colors are consistent across sessions.

### Styling

The extension respects Tableau's workbook formatting settings for fonts and colors.

### Responsive Design

The chart automatically resizes when the container size changes.

## Troubleshooting

### Common Issues

1. **Extension Not Loading**:

   - Ensure the extensions API server is running on port 8765
   - Check that the .trex file path is correct
   - Verify the HTML file is accessible at the specified URL

2. **No Data Displayed**:

   - Ensure you have data in your worksheet
   - Check that you've added fields to both Level and Edge encodings
   - Verify your data has the correct structure

3. **Performance Issues**:
   - Large datasets may cause performance issues
   - Consider filtering your data before using the extension
   - The extension works best with datasets under 10,000 rows

### Debug Mode

To enable debug mode, open the browser's developer console while the extension is running. The extension will log detailed information about data processing and rendering.

## Technical Details

### Dependencies

- **D3.js**: For data visualization and DOM manipulation
- **d3-sankey**: For Sankey diagram layout calculations
- **tinycolor2**: For color manipulation and fogging effects
- **Tableau Extensions API**: For integration with Tableau

### Architecture

- **Data Processing**: Converts Tableau data to Sankey-compatible format
- **Layout Engine**: Uses d3-sankey for automatic layout calculation
- **Rendering**: SVG-based rendering with D3.js
- **Interactivity**: Full integration with Tableau's selection system

### Performance Considerations

- The extension processes data on the client side
- Large datasets may impact performance
- Consider using data extracts for better performance

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review the browser console for error messages
3. Ensure all dependencies are properly loaded
4. Verify your data structure matches the expected format

## License

This extension is provided as-is for educational and development purposes.
