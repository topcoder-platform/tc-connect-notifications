/*
 * Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
 */

/**
 * The test configuration file
 * @author TCSCODER
 * @version 1.0
 */


module.exports = {
  LOG_LEVEL: 'warn',
  CAPTURE_LOGS: 'false',

  RABBITMQ: {
    URL: 'amqp://localhost:5672',
    PROJECTS_EXCHANGE_NAME: 'test.projects',
    CONNECT_NOTIFICATIONS_QUEUE_NAME: 'test.connect-notifications',
    NOTIFICATIONS_EXCHANGE_NAME: 'test.notifications',
    DELAYED_NOTIFICATIONS_EXCHANGE_NAME: 'test.connect-notifications-reminders',
    DELAY_DURATION: 0,
  },
  TC_SLACK_WEBHOOK_URL: 'http://localhost:3001/slack',
  API_BASE_URL: 'http://localhost:3001',
  AUTH0_URL: process.env.AUTH0_URL || '',
  AUTH0_AUDIENCE: process.env.AUTH0_AUDIENCE || '',
  TOKEN_CACHE_TIME: process.env.TOKEN_CACHE_TIME || 86400000,
  AUTH0_CLIENT_ID: process.env.AUTH0_CLIENT_ID,
  AUTH0_CLIENT_Secret: process.env.AUTH0_CLIENT_SECRET,
};
