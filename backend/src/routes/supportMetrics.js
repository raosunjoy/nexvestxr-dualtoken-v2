const express = require('express');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [new winston.transports.Console()]
});

const router = express.Router();

// Mock support metrics endpoint for Prometheus
router.get('/support-metrics', (req, res) => {
  try {
    // Mock metrics (in production, fetch from Intercom API)
    const metrics = `
# HELP support_tickets_total Total number of support tickets created
# TYPE support_tickets_total counter
support_tickets_total 150

# HELP support_tickets_open Number of open support tickets
# TYPE support_tickets_open gauge
support_tickets_open 25

# HELP support_ticket_resolution_time_seconds Average ticket resolution time in seconds
# TYPE support_ticket_resolution_time_seconds gauge
support_ticket_resolution_time_seconds 3600

# HELP support_tickets_by_status Total tickets by status
# TYPE support_tickets_by_status gauge
support_tickets_by_status{status="open"} 25
support_tickets_by_status{status="closed"} 125
support_tickets_by_status{status="pending"} 10
`;

    res.set('Content-Type', 'text/plain');
    res.send(metrics);
  } catch (error) {
    logger.error('Support metrics fetch failed', { error: error.message });
    res.status(500).send('Error fetching support metrics');
  }
});

module.exports = router;