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
const util = require('../handlers/util');
const constants = require('../common/constants');

const testTimeout = 1000;
const sampleEvents = {
  draftCreated: require('./data/events.draftCreated.json'),
  draftCreatedNoOwner: require('./data/events.draftCreated.noOwner.json'),
  updatedInReview: require('./data/events.updated.in_review.json'),
  updatedReviewed: require('./data/events.updated.reviewed.json'),
  updatedReviewedCopilotAssigned: require('./data/events.updated.reviewed.copilotAssigned.json'),
  updatedReviewedAnotherStatus: require('./data/events.updated.reviewed.anotherStatus.json'),
  updatedReviewedSameStatus: require('./data/events.updated.reviewed.sameStatus.json'),
  memberAddedTeamMember: require('./data/events.memberAdded.teamMember.json'),
  memberAddedOwner: require('./data/events.memberAdded.owner.json'),
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
  projectTest: require('./data/projects.test.json'),
};
const sampleUsers = {
  user1: require('./data/users.1.json'),
};
const projectTypes = {
  app_dev: {
    label: 'Full App',
    color: '#96d957',
  },
  generic: {
    label: 'Work Project',
    color: '#b47dd6',
  },
  visual_prototype: {
    label: 'Design & Prototype',
    color: '#67c5ef',
  },
  visual_design: {
    label: 'Design',
    color: '#67c5ef',
  },
  app: {
    label: 'App',
    color: '#96d957',
  },
  quality_assurance: {
    label: 'QA',
    color: '#96d957',
  },
  chatbot: {
    label: 'Chatbot',
    color: '#96d957',
  },
  website: {
    label: 'Website',
    color: '#96d957',
  },
};
const sampleAuth = require('./data/authorization.json');

const expectedSlackNotficationBase = {
  username: 'Coder',
  icon_url: 'https://emoji.slack-edge.com/T03R80JP7/coder-grinning/a3b7f3fe9e838377.png',
  channel: '#connect-projects-test',
  attachments: [{
    pretext: '',
    fallback: '',
    color: '#67c5ef',
    title: 'test',
    title_link: 'https://connect.topcoder-dev.com/projects/1/',
    text: 'test',
    fields: [
      {
        short: false,
        title: 'Project Type',
        value: 'Design',
      },
    ],
    footer: 'Topcoder',
    footer_icon: 'https://emoji.slack-edge.com/T03R80JP7/topcoder/7c68acd90a6b6d77.png',
    ts: 1478304000,
  }],
};

const expectedSlackCopilotNotification = _.cloneDeep(expectedSlackNotficationBase);
_.extend(expectedSlackCopilotNotification.attachments[0], {
  pretext: 'A project has been reviewed and needs a copilot. Please check it out and claim it.',
  fallback: 'A project has been reviewed and needs a copilot. Please check it out and claim it.',
});

const expectedRepostedSlackCopilotNotification = _.cloneDeep(expectedSlackNotficationBase);
_.extend(expectedRepostedSlackCopilotNotification.attachments[0], {
  pretext: 'We\'re still looking for a copilot for a reviewed project. Please check it out and claim it.',
  fallback: 'We\'re still looking for a copilot for a reviewed project. Please check it out and claim it.',
});
const expectedClaimedSlackCopilotNotification = _.cloneDeep(expectedSlackNotficationBase);
_.extend(expectedClaimedSlackCopilotNotification.attachments[0], {
  pretext: 'F_user L_user has claimed a project. Welcome to the team!',
  fallback: 'F_user L_user has claimed a project. Welcome to the team!',
  text: 'Project description 1',
  title: 'Project name 1',
  ts: '1477671612',
});

const expectedManagerSlackNotification = _.cloneDeep(expectedSlackNotficationBase);
_.extend(expectedManagerSlackNotification.attachments[0], {
  pretext: 'A project is ready to be reviewed.',
  fallback: 'A project is ready to be reviewed.',
  fields: [
    { title: 'Ref Code', value: '', short: false },
    { title: 'Owner', value: 'F_user L_user', short: false },
    {
      short: false,
      title: 'Project Type',
      value: 'Design',
    },
  ],
});

function checkAssert(assertCount, count, cb) {
  if (assertCount === count) {
    return cb();
  }
  return undefined;
}

describe('app', () => {
  let sourceExchange;
  let sourceQueue;
  let targetExchange; // eslint-disable-line
  let stub;
  let spy;
  let slackSpy;
  let systemTokenSpy;
  let getProjectByIdSpy;
  let correlationId = 1;

  const restoreStubAndSpy = () => {
    if (request.get.restore) {
      request.get.restore();
    }
    if (request.post.restore) {
      request.post.restore();
    }
    if (spy && spy.restore) {
      spy.restore();
    }

    if (slackSpy && slackSpy.restore) {
      slackSpy.restore();
    }

    if (systemTokenSpy && systemTokenSpy.restore) {
      systemTokenSpy.restore();
    }

    if (getProjectByIdSpy && getProjectByIdSpy.restore) {
      getProjectByIdSpy.restore();
    }
  };

  const connectToSource = (callback) => {
    sourceExchange = jackrabbit(config.RABBITMQ.URL)
      .topic(config.RABBITMQ.PROJECTS_EXCHANGE_NAME);
    sourceQueue = sourceExchange.queue(
      { name: config.RABBITMQ.CONNECT_NOTIFICATIONS_QUEUE_NAME },
      { keys: _.values(constants.events) });
    sourceQueue.on('ready', () => {
      sourceQueue.purge(() => { callback(); });
    });
  };
  const connectToTarget = (callback) => {
    targetExchange = jackrabbit(config.RABBITMQ.URL)
      .topic(config.RABBITMQ.NOTIFICATIONS_EXCHANGE_NAME);
    callback();
  };
  const purgeQueues = (done) => {
    sourceQueue.purge(() => done());
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
    restoreStubAndSpy();

    // Stub the calls to API server
    stub = sinon.stub(request, 'get');
    const stubArgs = {
      url: `${config.API_URL_PROJECTS}/1`,
    };
    stub.withArgs(sinon.match.has('url', stubArgs.url))
      .yields(null, { statusCode: 200 }, sampleProjects.project1);

    stubArgs.url = `${config.API_URL_PROJECTS}/1000`;
    stub.withArgs(sinon.match.has('url', stubArgs.url))
      .yields(null, { statusCode: 404 });

    stubArgs.url = `${config.API_URL_MEMBERS}/_search/?query=userId:1`;
    stub.withArgs(sinon.match.has('url', stubArgs.url))
      .yields(null, { statusCode: 200 }, sampleUsers.user1);

    stubArgs.url = `${config.API_URL_USERS}/1000`;
    stub.withArgs(sinon.match.has('url', stubArgs.url))
      .yields(null, { statusCode: 404 });

    stubArgs.url = `${config.API_URL_MEMBERS}/_search/?query=userId:40051331`;
    stub.withArgs(sinon.match.has('url', stubArgs.url))
      .yields(null, { statusCode: 200 }, sampleUsers.user1);

    stubArgs.url = `${config.API_URL_MEMBERS}/_search/?query=userId:50051333`;
    stub.withArgs(sinon.match.has('url', stubArgs.url))
      .yields(null, { statusCode: 200 }, sampleUsers.user1);

    postStub = sinon.stub(request, 'post');
    postStub.withArgs(sinon.match.has('url', `${config.API_URL_AUTHORIZATIONS}/`))
      .yields(null, { statusCode: 200 }, sampleAuth);

    postStub.withArgs(sinon.match.has('url', config.TC_SLACK_WEBHOOK_URL))
      .yields(null, { statusCode: 200 }, {});

    // spy the discourse notification call
    spy = sinon.spy(util, 'createProjectDiscourseNotification');
    slackSpy = sinon.spy(util, 'sendSlackNotification');
    systemTokenSpy = sinon.stub(util, 'getProjectTypeByKey', key => new Promise(resolve => (
      // console.log(key, 'mock called');
      resolve({
        key,
        displayName: projectTypes[key].label,
        icon: 'http://example.com/icon1.ico',
        question: 'question 1',
        info: 'info 1',
        aliases: ['key-1', 'key_1'],
        disabled: true,
        hidden: true,
        metadata: { 'slack-notification-mappings': projectTypes[key] },
        createdBy: 1,
        updatedBy: 1,
      })
    )));
    getProjectByIdSpy = sinon.stub(util, 'getProjectById', () => new Promise((resolve) => {
      resolve(sampleProjects.project1.result.content);
    }));
    purgeQueues(done);
  });

  afterEach(purgeQueues);

  /**
   * Send test event and verify notification
   */
  function sendTestEvent(testEvent, testEventType, copilotCb, managerCb) {
    copilotCallback = copilotCb;
    managerCallback = managerCb;
    correlationId += 1;

    sourceExchange.publish(testEvent, {
      key: testEventType,
      correlationId: correlationId.toString(),
    });
  }

  describe('Unknown event', () => {
    it('should not create notification', (done) => {
      sendTestEvent(sampleEvents.draftCreated, '');
      setTimeout(() => {
        sinon.assert.notCalled(spy);
        done();
      }, testTimeout);
    });
  });

  describe('`project.draft-created` event', () => {
    it('should create `Project.Created` notification', (done) => {
      sendTestEvent(sampleEvents.draftCreated, 'project.draft-created');
      setTimeout(() => {
        const expectedTitle = 'Share requirements and submit your draft project for review.';
        const expectedBody = 'Your project \'test\' has been drafted. If you have requirements documented, share them for review under the Files or Links section. Once you’re ready, click the "Submit for Review" button. Topcoder will then review your drafted project and will get your project started! Get stuck or need help? Email us at <a href="mailto:support@topcoder.com?subject=Question%20Regarding%20My%20New%20Topcoder%20Connect%20Project" rel="nofollow">support@topcoder.com</a>.';
        const params = spy.lastCall.args;
        assert.equal(params[2], expectedTitle);
        assert.equal(params[3], expectedBody);
        done();
      }, testTimeout);
    });
  });

  describe('`project.updated` event', () => {
    it('should create `Project.SubmittedForReview` and `Project.AvailableForReview` and manager slack notifications', (done) => {
      let assertCount = 0;
      const callbackCount = 1;
      request.get.restore();
      stub = sinon.stub(request, 'get');
      stub.withArgs(sinon.match.has('url', `${config.API_URL_MEMBERS}/_search/?query=userId:8547900`))
        .yields(null, { statusCode: 200 }, sampleUsers.user1);

      sendTestEvent(sampleEvents.updatedInReview, 'project.updated');
      setTimeout(() => {
        assertCount += 1;
        sinon.assert.notCalled(spy);
        params = slackSpy.lastCall.args;
        assert.deepEqual(params[1], expectedManagerSlackNotification);
        checkAssert(assertCount, callbackCount, done);
      }, testTimeout);
    });
    // there is no discourse notiifcation for Project.Reviewed
    it('should create `Project.Reviewed` and `Project.AvailableToClaim` and copilot slack notifications and do not repost after delay', (done) => {
      let assertCount = 0;
      const callbackCount = 1;
      sendTestEvent(sampleEvents.updatedReviewed, 'project.updated');
      setTimeout(() => {
        assertCount += 1;
        sinon.assert.notCalled(spy);
        const params = slackSpy.lastCall.args;

        assert.deepEqual(params[1], expectedSlackCopilotNotification);
        checkAssert(assertCount, callbackCount, done);
      }, testTimeout);
    });
    it('should create `Project.Reviewed` and `Project.AvailableToClaim` and copilot slack notifications and repost after delay till TTL', (done) => {
      getProjectByIdSpy.restore();
      getProjectByIdSpy = sinon.stub(util, 'getProjectById', () => (
        // console.log('getProjectById spy');
        new Promise((resolve) => {
          resolve(sampleProjects.projectTest.result.content);
        })
      ));

      let assertCount = 0;
      const callbackCount = config.get('RABBITMQ.DELAYED_NOTIFICATIONS_TTL') + 1;
      // should not repost anymore after ttl;
      function copCallback(data) { // eslint-disable-line
        assertCount += 1;
        checkAssert(assertCount, callbackCount, done);
      }
      sendTestEvent(sampleEvents.updatedReviewed, 'project.updated', copCallback);
      setTimeout(() => {
        assertCount += 1;
        sinon.assert.notCalled(spy);
        const params = slackSpy.lastCall.args;
        assert.deepEqual(params[1], expectedRepostedSlackCopilotNotification);
        // console.log('assert#', assertCount)
        // console.log('callbackCount#', callbackCount)
        // checkAssert(assertCount, callbackCount, done);
        done();
      }, testTimeout);
    });
    // there is no discourse notiifcation for Project.Reviewed
    it('should create `Project.Reviewed`, but not `Project.AvailableToClaim` and copilot slack notifications (copilot assigned)', (done) => {
      let assertCount = 0;
      const callbackCount = 1;

      sendTestEvent(sampleEvents.updatedReviewedCopilotAssigned, 'project.updated');
      setTimeout(() => {
        assertCount += 1;
        sinon.assert.notCalled(spy);
        checkAssert(assertCount, callbackCount, done);
      }, testTimeout);
    });

    it('should not create `Project.Reviewed` and `Project.AvailableToClaim` notifications (another status)', (done) => {
      sendTestEvent(sampleEvents.updatedReviewedAnotherStatus, 'project.updated');
      setTimeout(() => {
        sinon.assert.notCalled(spy);
        done();
      }, testTimeout);
    });

    it('should not create `Project.Reviewed` and `Project.AvailableToClaim` notifications (same status)', (done) => {
      sendTestEvent(sampleEvents.updatedReviewedSameStatus, 'project.updated');
      setTimeout(() => {
        sinon.assert.notCalled(spy);
        done();
      }, testTimeout);
    });
  });

  describe('`project.member.added` event', () => {
    it('should create `Project.Member.ownerAdded` notification', (done) => {
      sendTestEvent(sampleEvents.memberAddedOwner, 'project.member.added');
      setTimeout(() => {
        sinon.assert.notCalled(spy);
        done();
      }, testTimeout);
    });

    it('should create `Project.Member.TeamMemberAdded` notification', (done) => {
      sendTestEvent(sampleEvents.memberAddedTeamMember, 'project.member.added');
      setTimeout(() => {
        sinon.assert.notCalled(spy);
        done();
      }, testTimeout);
    });

    it('should create `Project.Member.ManagerJoined` notification', (done) => {
      sendTestEvent(sampleEvents.memberAddedManager, 'project.member.added');
      setTimeout(() => {
        sinon.assert.notCalled(spy);
        done();
      }, testTimeout);
    });

    it('should create `Project.Member.CopilotJoined` notification', (done) => {
      sendTestEvent(sampleEvents.memberAddedCopilot, 'project.member.added');
      setTimeout(() => {
        sinon.assert.notCalled(spy);
        done();
      }, testTimeout);
    });
    it('should create `Project.Member.CopilotJoined` notification and slack copilot joined notification', (done) => {
      getProjectByIdSpy.restore();
      getProjectByIdSpy = sinon.stub(util, 'getProjectById', () => (
        new Promise((resolve) => {
          resolve(sampleProjects.projectTest.result.content);
        })
      ));

      sendTestEvent(sampleEvents.memberAddedCopilot, 'project.member.added');
      setTimeout(() => {
        sinon.assert.notCalled(spy);
        const slackParams = slackSpy.lastCall.args;
        const expectedTestCopilotNotificaton = _.cloneDeep(expectedClaimedSlackCopilotNotification);
        _.extend(expectedTestCopilotNotificaton.attachments[0], {
          text: 'test',
          title: 'test',
          ts: 1478304000,
        });
        assert.deepEqual(slackParams[1], expectedTestCopilotNotificaton);
        done();
      }, testTimeout);
    });
  });

  describe('`project.member.removed` event', () => {
    it('should create `Project.Member.Left` notification', (done) => {
      sendTestEvent(sampleEvents.memberRemovedLeft, 'project.member.removed');
      setTimeout(() => {
        sinon.assert.notCalled(spy);
        done();
      }, testTimeout);
    });

    it('should create `Project.Member.Removed` notification', (done) => {
      sendTestEvent(sampleEvents.memberRemovedRemoved, 'project.member.removed');
      setTimeout(() => {
        sinon.assert.notCalled(spy);
        done();
      }, testTimeout);
    });
  });

  describe('`project.member.updated` event', () => {
    it('should create `Project.OwnerChanged` notification', (done) => {
      sendTestEvent(sampleEvents.memberUpdated, 'project.member.updated');
      setTimeout(() => {
        sinon.assert.notCalled(spy);
        done();
      }, testTimeout);
    });

    it('should not create `Project.OwnerChanged` notification (owner not changed)', (done) => {
      sendTestEvent(sampleEvents.memberUpdatedOwnerNotChanged, 'project.member.updated');
      setTimeout(() => {
        sinon.assert.notCalled(spy);
        done();
      }, testTimeout);
    });
  });

  describe('Others', () => {
    it('Should not create notification when API server return error', (done) => {
      sendTestEvent(sampleEvents.memberUpdated404, 'project.member.updated');
      setTimeout(() => {
        sinon.assert.notCalled(spy);
        done();
      }, testTimeout);
    });
  });
});

/* eslint-enable global-require, no-undef */
