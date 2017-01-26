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

  RABBITMQ_URL: 'amqp://localhost:5672',

  SOURCE_RABBIT_EXCHANGE_NAME: 'test.projects',
  SOURCE_RABBIT_QUEUE_NAME: 'test.connect-notifications',

  TARGET_RABBIT_EXCHANGE_NAME: 'test.notifications',
  TARGET_RABBIT_QUEUE_NAME: 'test.notifications',

  COPILOT_TARGET_RABBIT_QUEUE_NAME: 'test.notifications-slack-copilot',
  MANAGER_TARGET_RABBIT_QUEUE_NAME: 'test.notifications-slack-manager',

  TARGET_RABBIT_DELAY_EXCHANGE_NAME: 'test.connect-notifications-reminders',

  UNCLAIMED_PROJECT_REPOST_DELAY: 0,
  API_BASE_URL: 'http://localhost:3001',

  DISABLE_DELAY_EXCHANGE: false,
};
