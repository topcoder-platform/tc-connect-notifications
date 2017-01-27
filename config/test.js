/*
 * Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
 */

/**
 * The test configuration file
 * @author TCSCODER
 * @version 1.0
 */


module.exports = {
  LOG_LEVEL: 'debug',
  CAPTURE_LOGS: 'false',

  RABBITMQ: {
    URL: 'amqp://localhost:5672',
    PROJECTS_EXCHANGE_NAME: 'test.projects',
    CONNECT_NOTIFICATIONS_QUEUE_NAME: 'test.connect-notifications',
    SLACK_NOTIFICATIONS_COPILOT_QUEUE_NAME: 'test.notifications-slack-copilot',
    SLACK_NOTIFICATIONS_MANAGER_QUEUE_NAME: 'test.notifications-slack-manager',
    NOTIFICATIONS_EXCHANGE_NAME: 'test.notifications',
    DELAYED_NOTIFICATIONS_EXCHANGE_NAME: 'test.connect-notifications-reminders',
    DELAY_DURATION: 0,
  },

  API_BASE_URL: 'http://localhost:3001',
};
