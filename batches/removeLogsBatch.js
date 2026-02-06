
const fs = require('fs');
const path = require('path');

/**
 * Log cleanup batch job to remove log files older than 7 days
 */
function main() {
    console.log('Starting log cleanup batch job...');

    const logsDirectory = path.join(__dirname, '..', 'logs');
    const retentionDays = 7;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    try {
        // Check if logs directory exists
        if (!fs.existsSync(logsDirectory)) {
            console.log('Logs directory does not exist:', logsDirectory);
            return;
        }

        // Read all files in the logs directory
        const files = fs.readdirSync(logsDirectory);
        console.log(`Found ${files.length} files in logs directory`);

        let deletedCount = 0;
        let errorCount = 0;

        files.forEach(file => {
            const filePath = path.join(logsDirectory, file);

            try {
                // Get file stats
                const stats = fs.statSync(filePath);

                // Check if it's a file (not a directory)
                if (!stats.isFile()) {
                    console.log(`Skipping directory: ${file}`);
                    return;
                }

                // Check if file is older than retention period
                if (stats.mtime < cutoffDate) {
                    // Double-check the file name pattern to ensure it's a log file
                    if (isLogFile(file)) {
                        fs.unlinkSync(filePath);
                        console.log(`Deleted old log file: ${file} (modified: ${stats.mtime.toISOString()})`);
                        deletedCount++;
                    } else {
                        console.log(`Skipping non-log file: ${file}`);
                    }
                } else {
                    console.log(`Keeping recent log file: ${file} (modified: ${stats.mtime.toISOString()})`);
                }

            } catch (error) {
                console.error(`Error processing file ${file}:`, error.message);
                errorCount++;
            }
        });

        console.log(`\nLog cleanup completed:`);
        console.log(`- Files deleted: ${deletedCount}`);
        console.log(`- Errors encountered: ${errorCount}`);
        console.log(`- Retention period: ${retentionDays} days`);
        console.log(`- Cutoff date: ${cutoffDate.toISOString()}`);

    } catch (error) {
        console.error('Error during log cleanup:', error.message);
        process.exit(1);
    }
}

/**
 * Check if a file is a log file based on naming pattern
 * @param {string} filename - The filename to check
 * @returns {boolean} - True if it appears to be a log file
 */
function isLogFile(filename) {
    // Check for common log file extensions
    const logExtensions = ['.log', '.txt'];
    const hasLogExtension = logExtensions.some(ext => filename.toLowerCase().endsWith(ext));

    // Check for log file naming patterns (e.g., combined-2025-09-03.log, error-2025-09-03.log)
    const logPatterns = ['combined-', 'error-', 'http-', 'access-', 'app-'];
    const hasLogPattern = logPatterns.some(pattern => filename.toLowerCase().includes(pattern));

    return hasLogExtension || hasLogPattern;
}

// Run the batch job
if (require.main === module) {
    main();
}

module.exports = { main, isLogFile };