module.exports = {


  friendlyName: 'Make remark',


  description: 'Make a remark.',


  inputs: {
    remark: { type: 'string', required: true },
  },


  exits: {
    notAuthenticated: { statusCode: 401, description: 'Must be logged in.' },
  },


  fn: function (inputs, exits, env) {

    var req = env.req;

    // Find the user who is currently logged in, and thus arriving in the zone.
    // (This is different between the web app and the mobile app-- hence our helper.)
    sails.helpers.checkAuth({req:req})
    .exec({
      error: function(err) { return exits.error(err); },
      notAuthenticated: function() { return exits.notAuthenticated(); },
      success: function(loggedInUserId) {

        User.update()
        .where({ id: loggedInUserId })
        .set({ remark: inputs.remark })
        .meta({ fetch: true })
        .exec(function (err, users) {
          if (err) { return exits.error(err); }
          if (users.length > 1) { return exits.error(new Error('Consistency violation: Somehow, more than one user exists with the same username.  This should be impossible!')); }

          var thisUser = users[0];
          if (!thisUser) { return exits.error(new Error('Consistency violation: The logged-in user has gone missing!  (Corresponding user record no longer exists in the database.)')); }

          try {
            // Publish this user's new remark to his or her zone.
            Zone.publish([thisUser.currentZone], {
              verb: 'userRemarked',
              username: thisUser.username,
              remark: thisUser.remark,
              avatarColor: thisUser.avatarColor
            }, req);
          } catch (e) { return exits.error(new Error('Unexpected error publishing new remark to zone: '+e.stack)); }

          return exits.success();
        }, exits.error);
      }//</ success :: sails.helpers.checkAuth() >
    });//</ sails.helpers.checkAuth() >
  }


};
