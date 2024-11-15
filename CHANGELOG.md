# Change Log

All notable changes to the "Oaklean" extension will be documented in this file.

# 0.1.2
### Bug fixes
- Display an error message if the report version the user is attempting to load is not supported by the VSCode extension
- The method section now updates correctly after loading a new report.
- Fixed NaN values in the method view and the incorrect relative values in the inline view.
- Fixed incorrect behavior when the project is nested within directories, ensuring that the source file tree and method overview open the correct file on click.
### Quality of Life improvements
- Sensor Values are now displayed with only up to three decimal places for better readability
- Inline text now uses a dark font for light themes.

# 0.1.1 - 2024-07-31
### Bug fixes
- A bug in the filter feature that caused NaN% and Infinity% values when deleting the filter input has been fixed.

### Quality of Life improvements
- Measurement descriptions have been made more intuitive.
- For TypeScript projects, the file explorer now shows the original TypeScript files, even when measurements were taken with compiled files.
- The extension now highlights the user's last chosen options for each setting (sensor value type, selected profile, and value representation).
- The project report selection window will only appear when there are actually reports available.

## 0.1.0 - 2024-05-31
- 🎉 **First Public Release!** 🚀
- We are thrilled to announce that this version marks the official public debut of our project. After countless hours of development and refinement, it's finally ready for the world. Thank you for your support and we can't wait to see what you'll do with it!