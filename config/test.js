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
  SOURCE_RABBIT_URL: 'amqp://localhost:5672',
  SOURCE_RABBIT_EXCHANGE_NAME: 'test.projects',
  SOURCE_RABBIT_QUEUE_NAME: 'test.events-queue',
  TARGET_RABBIT_URL: 'amqp://localhost:5672',
  TARGET_RABBIT_EXCHANGE_NAME: 'test.notifications',
  TARGET_RABBIT_ROUTING_KEY: 'email',
  TARGET_RABBIT_QUEUE_NAME: 'test.notifications-queue',
  COPILOT_TARGET_RABBIT_QUEUE_NAME: 'test.copilot-notifications-queue',
  COPILOT_TARGET_RABBIT_ROUTING_KEY: 'copilot-slack',
  MANAGER_TARGET_RABBIT_ROUTING_KEY: 'manager-slack',
  MANAGER_TARGET_RABBIT_QUEUE_NAME: 'test.manager-notifications-queue',
  DELAY_RABBIT_EXCHANGE_NAME: 'test.delay-notifications',
  UNCLAIMED_PROJECT_REPOST_DELAY: 0,
  API_BASE_URL: 'http://localhost:3001',
  ALL_MANAGER_USER_IDS: [11111111, 22222222],
  ALL_COPILOT_USER_IDS: [11111111, 33333333],
  DISABLE_DELAY_EXCHANGE: false,
  SLACK_ICON_URL: 'https://emoji.slack-edge.com/T03R80JP7/topcoder/7c68acd90a6b6d77.png',
  SLACK_USERNAME: 'webhookbot',
};
