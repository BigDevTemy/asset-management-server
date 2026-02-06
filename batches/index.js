const cron = require('node-cron');
const { main: removeLogsBatch } = require('./removeLogsBatch');

/**
 * Initialize and start all batch jobs
 */
function initializeBatchJobs() {
    console.log('Initializing batch jobs...');
    
    // Schedule log cleanup to run every day at 11:00 PM
    // Cron format: minute hour day month dayOfWeek
    // 0 23 * * * = At 23:00 (11 PM) every day
    const logCleanupJob = cron.schedule('0 23 * * *', () => {
        console.log('Starting scheduled log cleanup job at:', new Date().toISOString());
        try {
            removeLogsBatch();
            console.log('Scheduled log cleanup job completed successfully');
        } catch (error) {
            console.error('Error in scheduled log cleanup job:', error.message);
        }
    }, {
        scheduled: false, // Don't start automatically
        timezone: "UTC" // You can change this to your preferred timezone
    });
    
    // Start the log cleanup job
    logCleanupJob.start();
    console.log('Log cleanup job scheduled to run daily at 11:00 PM UTC');
    
    // Optional: Run log cleanup immediately on startup (for testing)
    // Uncomment the line below if you want to run it once when the server starts
    // console.log('Running initial log cleanup...');
    // removeLogsBatch();
    
    return {
        logCleanupJob
    };
}

/**
 * Stop all batch jobs
 */
function stopBatchJobs(jobs) {
    console.log('Stopping batch jobs...');
    if (jobs && jobs.logCleanupJob) {
        jobs.logCleanupJob.stop();
        console.log('Log cleanup job stopped');
    }
}

// Export functions for use in other modules
module.exports = {
    initializeBatchJobs,
    stopBatchJobs
};
