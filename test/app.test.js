/*
 * Copyright (c) 2016 TopCoder, Inc. All rights reserved.
 */

/**
 * Tests for app.js
 */
process.env.NODE_ENV = 'test';

/* eslint-disable global-require, no-undef */

const assert = require('assert');
const config = require('config');
const jackrabbit = require('jackrabbit');
const sinon = require('sinon');
const request = require('request');
const _ = require('lodash');

const constants = require('../common/constants');

const sampleEvents = {
  draftCreated: require('./data/events.draftCreated.json'),
  draftCreatedNoOwner: require('./data/events.draftCreated.noOwner.json'),
  updatedInReview: require('./data/events.updated.in_review.json'),
  updatedReviewed: require('./data/events.updated.reviewed.json'),
  updatedReviewedCopilotAssigned: require('./data/events.updated.reviewed.copilotAssigned.json'),
  updatedReviewedAnotherStatus: require('./data/events.updated.reviewed.anotherStatus.json'),
  updatedReviewedSameStatus: require('./data/events.updated.reviewed.sameStatus.json'),
  memberAddedTeamMember: require('./data/events.memberAdded.teamMember.json'),
  memberAddedManager: require('./data/events.memberAdded.manager.json'),
  memberAddedCopilot: require('./data/events.memberAdded.copilot.json'),
  memberRemovedLeft: require('./data/events.memberRemoved.left.json'),
  memberRemovedRemoved: require('./data/events.memberRemoved.removed.json'),
  memberUpdated: require('./data/events.memberUpdated.json'),
  memberUpdatedOwnerNotChanged: require('./data/events.memberUpdated.ownerNotChanged.json'),
  memberUpdated404: require('./data/events.memberUpdated.404.json'),
};
const sampleProjects = {
  project1: require('./data/projects.1.json'),
};
const sampleUsers = {
  user1: require('./data/users.1.json'),
};

describe('app', () => {
  let sourceExchange;
  let sourceQueue;
  let targetExchange;
  let targetQueue;
  let stub;
  let correlationId = 1;
  let notificationCallback = () => { };

  const restoreStub = () => {
    if (request.get.restore) {
      request.get.restore();
    }
  };

  const connectToSource = (callback) => {
    sourceExchange = jackrabbit(config.SOURCE_RABBIT_URL)
      .topic(config.SOURCE_RABBIT_EXCHANGE_NAME);
    sourceQueue = sourceExchange.queue(
      { name: config.SOURCE_RABBIT_QUEUE_NAME },
      { keys: _.values(constants.events) });
    sourceQueue.on('ready', () => {
      sourceQueue.purge(() => { callback(); });
    });
  };
  const connectToTarget = (callback) => {
    targetExchange = jackrabbit(config.TARGET_RABBIT_URL)
      .topic(config.TARGET_RABBIT_EXCHANGE_NAME);
    targetQueue = targetExchange.queue(
      { name: config.TARGET_RABBIT_QUEUE_NAME },
      { key: config.TARGET_RABBIT_ROUTING_KEY });
    targetQueue.on('ready', () => {
      targetQueue.purge(() => { callback(); });
    });
    targetQueue.consume((data, ack, nack, message) => {
      ack();
      assert.ok(message);
      notificationCallback(data);
    });
  };
  const purgeQueues = (done) => {
    sourceQueue.purge(() => {
      targetQueue.purge(() => {
        done();
      });
    });
  };

  before((done) => {
    // Connect to queues
    connectToSource(() => {
      connectToTarget(() => {
        // Start app
        require('../app');
        done();
      });
    });
  });

  beforeEach((done) => {
    restoreStub();

    // Stub the calls to API server
    stub = sinon.stub(request, 'get');
    stub.withArgs(`${config.API_BASE_URL}/projects/1`)
      .yields(null, { statusCode: 200 }, sampleProjects.project1);
    stub.withArgs(`${config.API_BASE_URL}/projects/1000`)
      .yields(null, { statusCode: 404 });
    stub.withArgs(`${config.API_BASE_URL}/users/1`)
      .yields(null, { statusCode: 200 }, sampleUsers.user1);
    stub.withArgs(`${config.API_BASE_URL}/users/1000`)
      .yields(null, { statusCode: 404 });

    purgeQueues(done);
  });

  afterEach(purgeQueues);

  /**
   * Send test event and verify notification
   */
  function sendTestEvent(testEvent, testEventType, callback) {
    notificationCallback = callback;
    correlationId += 1;

    sourceExchange.publish(testEvent, {
      key: testEventType,
      correlationId: correlationId.toString(),
    });
  }

  describe('Unknown event', () => {
    it('should not create notification', (done) => {
      sendTestEvent(sampleEvents.draftCreated, '', () => {
        assert.fail();
      });
      setTimeout(done, 1000);
    });
  });

  describe('`project.draft-created` event', () => {
    it('should create `Project.Created` notification', (done) => {
      sendTestEvent(sampleEvents.draftCreated, 'project.draft-created', (notification) => {
        assert.deepEqual(notification, {
          recipients: [
            {
              id: 8547899,
              params: {
                projectId: sampleEvents.draftCreated.id,
                projectName: sampleEvents.draftCreated.name,
                projectDescription: sampleEvents.draftCreated.description,
              },
            },
          ],
          notificationType: constants.notifications.project.created.notificationType,
          subject: constants.notifications.project.created.subject,
        });

        done();
      });
    });

    it('should not create `Project.Created` notification (no owner)', (done) => {
      sendTestEvent(sampleEvents.draftCreatedNoOwner, 'project.draft-created', () => {
        assert.fail();
      });
      setTimeout(done, 1000);
    });
  });

  describe('`project.updated` event', () => {
    it('should create `Project.SubmittedForReview` and `Project.AvailableForReview` notifications', (done) => {
      let notificationCount = 0;
      const expectedParams = {
        projectId: sampleEvents.updatedInReview.updated.id,
        projectName: sampleEvents.updatedInReview.updated.name,
        projectDescription: sampleEvents.updatedInReview.updated.description,
      };
      sendTestEvent(sampleEvents.updatedInReview, 'project.updated', (notification) => {
        notificationCount += 1;

        if (notificationCount === 1) {
          assert.deepEqual(notification, {
            recipients: [
              { id: 8547899, params: expectedParams },
              { id: 8547900, params: expectedParams },
            ],
            notificationType: constants.notifications.project.submittedForReview.notificationType,
            subject: constants.notifications.project.submittedForReview.subject,
          });
        } else if (notificationCount === 2) {
          assert.deepEqual(notification, {
            recipients: [
              { id: 11111111, params: expectedParams },
              { id: 22222222, params: expectedParams },
              { id: 33333333, params: expectedParams },
            ],
            notificationType: constants.notifications.project.availableForReview.notificationType,
            subject: constants.notifications.project.availableForReview.subject,
          });

          done();
        } else {
          assert.fail();
        }
      });
    });

    it('should create `Project.Reviewed` and `Project.AvailableToClaim` notifications', (done) => {
      let notificationCount = 0;
      const expectedParams = {
        projectId: sampleEvents.updatedReviewed.updated.id,
        projectName: sampleEvents.updatedReviewed.updated.name,
        projectDescription: sampleEvents.updatedReviewed.updated.description,
      };
      sendTestEvent(sampleEvents.updatedReviewed, 'project.updated', (notification) => {
        notificationCount += 1;

        if (notificationCount === 1) {
          assert.deepEqual(notification, {
            recipients: [
              { id: 40152856, params: expectedParams },
              { id: 8547899, params: expectedParams },
              { id: 8547900, params: expectedParams },
              { id: 123456, params: expectedParams },
            ],
            notificationType: constants.notifications.project.reviewed.notificationType,
            subject: constants.notifications.project.reviewed.subject,
          });
        } else if (notificationCount === 2) {
          assert.deepEqual(notification, {
            recipients: [
              { id: 11111111, params: expectedParams },
              { id: 33333333, params: expectedParams },
            ],
            notificationType: constants.notifications.project.availableToClaim.notificationType,
            subject: constants.notifications.project.availableToClaim.subject,
          });

          done();
        } else {
          assert.fail();
        }
      });
    });

    it('should create `Project.Reviewed`, but not `Project.AvailableToClaim` notifications (copilot assigned)', (done) => {
      const expectedParams = {
        projectId: sampleEvents.updatedReviewedCopilotAssigned.updated.id,
        projectName: sampleEvents.updatedReviewedCopilotAssigned.updated.name,
        projectDescription: sampleEvents.updatedReviewedCopilotAssigned.updated.description,
      };
      sendTestEvent(sampleEvents.updatedReviewedCopilotAssigned, 'project.updated', (notification) => {
        assert.deepEqual(notification, {
          recipients: [
            { id: 40152856, params: expectedParams },
            { id: 8547899, params: expectedParams },
            { id: 8547900, params: expectedParams },
            { id: 123456, params: expectedParams },
          ],
          notificationType: constants.notifications.project.reviewed.notificationType,
          subject: constants.notifications.project.reviewed.subject,
        });

        done();
      });
    });

    it('should not create `Project.Reviewed` and `Project.AvailableToClaim` notifications (another status)', (done) => {
      sendTestEvent(sampleEvents.updatedReviewedAnotherStatus, 'project.updated', () => {
        assert.fail();
      });
      setTimeout(done, 1000);
    });

    it('should not create `Project.Reviewed` and `Project.AvailableToClaim` notifications (same status)', (done) => {
      sendTestEvent(sampleEvents.updatedReviewedSameStatus, 'project.updated', () => {
        assert.fail();
      });
      setTimeout(done, 1000);
    });
  });

  describe('`project.member.added` event', () => {
    it('should create `Project.Member.TeamMemberAdded` notification', (done) => {
      const expectedParams = {
        projectId: 1,
        projectName: 'Project name 1',
        memberId: 1,
        memberName: 'F_user L_user',
        memberHandle: 'test_user',
      };
      sendTestEvent(sampleEvents.memberAddedTeamMember, 'project.member.added', (notification) => {
        assert.deepEqual(notification, {
          recipients: [
            { id: 1, params: expectedParams },
            { id: 2, params: expectedParams },
            { id: 3, params: expectedParams },
            { id: 4, params: expectedParams },
          ],
          notificationType: constants.notifications.teamMember.added.notificationType,
          subject: constants.notifications.teamMember.added.subject,
        });

        done();
      });
    });

    it('should create `Project.Member.ManagerJoined` notification', (done) => {
      const expectedParams = {
        projectId: 1,
        projectName: 'Project name 1',
        memberId: 1,
        memberName: 'F_user L_user',
        memberHandle: 'test_user',
      };
      sendTestEvent(sampleEvents.memberAddedManager, 'project.member.added', (notification) => {
        assert.deepEqual(notification, {
          recipients: [
            { id: 1, params: expectedParams },
            { id: 2, params: expectedParams },
            { id: 3, params: expectedParams },
            { id: 4, params: expectedParams },
          ],
          notificationType: constants.notifications.teamMember.managerJoined.notificationType,
          subject: constants.notifications.teamMember.managerJoined.subject,
        });

        done();
      });
    });

    it('should create `Project.Member.CopilotJoined` notification', (done) => {
      const expectedParams = {
        projectId: 1,
        projectName: 'Project name 1',
        memberId: 1,
        memberName: 'F_user L_user',
        memberHandle: 'test_user',
      };
      sendTestEvent(sampleEvents.memberAddedCopilot, 'project.member.added', (notification) => {
        assert.deepEqual(notification, {
          recipients: [
            { id: 1, params: expectedParams },
            { id: 2, params: expectedParams },
            { id: 3, params: expectedParams },
            { id: 4, params: expectedParams },
          ],
          notificationType: constants.notifications.teamMember.copilotJoined.notificationType,
          subject: constants.notifications.teamMember.copilotJoined.subject,
        });

        done();
      });
    });
  });

  describe('`project.member.removed` event', () => {
    it('should create `Project.Member.Left` notification', (done) => {
      const expectedParams = {
        projectId: 1,
        projectName: 'Project name 1',
        memberId: 1,
        memberName: 'F_user L_user',
        memberHandle: 'test_user',
      };
      sendTestEvent(sampleEvents.memberRemovedLeft, 'project.member.removed', (notification) => {
        assert.deepEqual(notification, {
          recipients: [
            { id: 1, params: expectedParams },
            { id: 2, params: expectedParams },
            { id: 3, params: expectedParams },
            { id: 4, params: expectedParams },
          ],
          notificationType: constants.notifications.teamMember.left.notificationType,
          subject: constants.notifications.teamMember.left.subject,
        });

        done();
      });
    });

    it('should create `Project.Member.Removed` notification', (done) => {
      const expectedParams = {
        projectId: 1,
        projectName: 'Project name 1',
        memberId: 1,
        memberName: 'F_user L_user',
        memberHandle: 'test_user',
      };
      sendTestEvent(sampleEvents.memberRemovedRemoved, 'project.member.removed', (notification) => {
        assert.deepEqual(notification, {
          recipients: [
            { id: 1, params: expectedParams },
            { id: 2, params: expectedParams },
            { id: 3, params: expectedParams },
            { id: 4, params: expectedParams },
          ],
          notificationType: constants.notifications.teamMember.removed.notificationType,
          subject: constants.notifications.teamMember.removed.subject,
        });

        done();
      });
    });
  });

  describe('`project.member.updated` event', () => {
    it('should create `Project.OwnerChanged` notification', (done) => {
      const expectedParams = {
        projectId: 1,
        projectName: 'Project name 1',
        newOwnerUserId: 1,
        newOwnerName: 'F_user L_user',
        newOwnerHandle: 'test_user',
      };
      sendTestEvent(sampleEvents.memberUpdated, 'project.member.updated', (notification) => {
        assert.deepEqual(notification, {
          recipients: [
            { id: 1, params: expectedParams },
            { id: 2, params: expectedParams },
            { id: 3, params: expectedParams },
            { id: 4, params: expectedParams },
          ],
          notificationType: constants.notifications.teamMember.ownerChanged.notificationType,
          subject: constants.notifications.teamMember.ownerChanged.subject,
        });

        done();
      });
    });

    it('should not create `Project.OwnerChanged` notification (owner not changed)', (done) => {
      sendTestEvent(sampleEvents.memberUpdatedOwnerNotChanged, 'project.member.updated', () => {
        assert.fail();
      });

      setTimeout(done, 1000);
    });
  });

  describe('Others', () => {
    it('Should not create notification when API server return error', (done) => {
      sendTestEvent(sampleEvents.memberUpdated404, 'project.member.updated', () => {
        assert.fail();
      });

      setTimeout(done, 1000);
    });
  });
});

/* eslint-enable global-require, no-undef */
