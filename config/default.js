/*
 * Copyright (C) 2016 TopCoder Inc., All Rights Reserved.
 */

/**
 * The default configuration file
 * @author TCSCODER
 * @version 1.0
 */


module.exports = {
  AUTH_DOMAIN: 'topcoder-dev.com',
  LOG_LEVEL: 'info',
  CAPTURE_LOGS: 'false',
  // Token is generated from https://logentries.com/
  LOGENTRIES_TOKEN: '',

  RABBITMQ_URL: 'amqp://localhost:5672',
  // Source RabbitMQ that provides events to tc-connect-notifications
  SOURCE_RABBIT_EXCHANGE_NAME: 'projects',
  SOURCE_RABBIT_QUEUE_NAME: 'connect-notifications',

  // Target RabbitMQ that receive notifications from tc-connect-notifications
  TARGET_RABBIT_EXCHANGE_NAME: 'notifications',
  COPILOT_TARGET_RABBIT_ROUTING_KEY: 'slack.copilot',
  MANAGER_TARGET_RABBIT_ROUTING_KEY: 'slack.manager',

  TARGET_RABBIT_DELAY_EXCHANGE_NAME: 'dev.connect-notifications-reminders',
  TARGET_RABBIT_DELAY_ROUTING_KEY: 'project.copilot-unclaimed',
  // currently 50 secs for testing
  UNCLAIMED_PROJECT_REPOST_DELAY: 50000,

  // The base url to the project/user API server
  API_BASE_URL: 'http://localhost:3001',
  // Id and secret to generate token to make calls as system admin user
  SYSTEM_USER_CLIENT_ID: '',
  SYSTEM_USER_CLIENT_SECRET: '',

  // Disable delay exchange and use direct instead ( delete existing delay exchnge after changing)
  DISABLE_DELAY_EXCHANGE: false,

  SLACK_ICON_URL: 'https://emoji.slack-edge.com/T03R80JP7/coder-grinning/a3b7f3fe9e838377.png',
  SLACK_USERNAME: 'Coder',
  TOPCODER_ICON_URL: 'https://emoji.slack-edge.com/T03R80JP7/topcoder/7c68acd90a6b6d77.png',
};
