/*
 * Copyright (c) 2016 TopCoder, Inc. All rights reserved.
 */

/**
 * Define all event handlers
 * @author TCSCODER
 * @version 1.0
 */
const config = require('config');
const constants = require('../common/constants');
const util = require('./util');
const _ = require('lodash');

/**
 * Create notifications from project.member.added events
 * @param {Object} data the event data
 * @returns {Array} the array of notifications
 */
function* memberAdded(logger, data) {
  const [project, addedMember] = yield [
    util.getProjectById(data.projectId),
    util.getUserById(data.userId),
  ];

  let topic;
  const notifications = {
    slack: {
      copilot: [],
    },
  };
  if (data.role === constants.memberRoles.customer && data.isPrimary) {
    topic = constants.notifications.discourse.teamMembers.ownerAdded;
  } else if (data.role === constants.memberRoles.customer) {
    topic = constants.notifications.discourse.teamMembers.added;
  } else if (data.role === constants.memberRoles.manager) {
    topic = constants.notifications.discourse.teamMembers.managerJoined;
  } else if (data.role === constants.memberRoles.copilot) {
    topic = constants.notifications.discourse.teamMembers.copilotJoined;
    // Notify project claimed
    if ((project.status === constants.projectStatuses.active ||
      project.status === constants.projectStatuses.reviewed)
      && _.filter(project.members, ['role', 'copilot']).length < 2) {
      const slackNotification = yield util.buildSlackNotification(
        {
          project,
          firstName: addedMember.firstName,
          lastName: addedMember.lastName,
        },
        constants.notifications.slack.projectClaimed);
      notifications.slack.copilot.push(slackNotification);
    }
  }

  const topicData = {
    projectName: project.name,
    projectUrl: `https://connect.${config.get('AUTH_DOMAIN')}/projects/${project.id}/`,
    firstName: addedMember.firstName,
    lastName: addedMember.lastName,
  };

  if (topic && !topic.disabled) {
    notifications.discourse = [{
      projectId: project.id,
      title: topic.title,
      content: topic.content(topicData),
    }];
  }
  return notifications;
}

/**
 * Create notifications from project.member.removed events
 * @param {Object} data the event data
 * @returns {Array} the array of notifications
 */
function* memberRemoved(logger, data) {
  const [project, removedMember] = yield [
    util.getProjectById(data.projectId),
    util.getUserById(data.userId),
  ];

  let topic;
  const notifications = {};
  if (data.updatedBy === data.userId) {
    // Left
    topic = constants.notifications.discourse.teamMembers.left;
  } else {
    // Removed
    topic = constants.notifications.discourse.teamMembers.removed;
  }
  const topicData = {
    projectName: project.name,
    projectUrl: `https://connect.${config.get('AUTH_DOMAIN')}/projects/${project.id}/`,
    firstName: removedMember.firstName,
    lastName: removedMember.lastName,
  };

  if (topic && !topic.disabled) {
    notifications.discourse = [{
      projectId: project.id,
      title: topic.title,
      content: topic.content(topicData),
    }];
  }
  return notifications;
}

/**
 * Create notifications from project.member.updated events
 * @param {Object} data the event data
 * @returns {Array} the array of notifications
 */
function* memberUpdated(logger, data) {
  if (data.updated.role !== constants.memberRoles.customer || !data.updated.isPrimary) {
    return [];
  }

  const [project, updatedMember] = yield [
    util.getProjectById(data.updated.projectId),
    util.getUserById(data.updated.userId),
  ];

  const topic = constants.notifications.discourse.teamMembers.ownerChanged;

  const notifications = {};
  const topicData = {
    projectName: project.name,
    projectUrl: `https://connect.${config.get('AUTH_DOMAIN')}/projects/${project.id}/`,
    firstName: updatedMember.firstName,
    lastName: updatedMember.lastName,
  };

  if (topic && !topic.disabled) {
    notifications.discourse = [{
      projectId: project.id,
      title: topic.title,
      content: topic.content(topicData),
    }];
  }
  return notifications;
}


module.exports = {
  memberAdded,
  memberRemoved,
  memberUpdated,
};
