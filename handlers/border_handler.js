const logs = require("../modules/member_logs.js");
const roles = require("../modules/roles.js");
const serverSettings = require("../utils/server_settings.js");

exports.handleJoins = async function(member) {
    logs.join(member);
    roles.join(member);
}

exports.handleLeaves = async function(member) {
	// there has to be a better way to do this
    const entry = await member.guild.fetchAuditLogs({ type: "MEMBER_KICK" }).then(audit => audit.entries.first());
		// if there's not any kick case in this server
		if(!entry){
			return logs.leave(member);
		};
		// if the target was not the member who left
		if(entry.target.id !== member.id){
			return logs.leave(member);
		};
		if(entry.createdTimestamp > (Date.now() - 5000)){
			logs.kickMsg(member);
			logs.leave(member);
			return;
		};
	logs.leave(member);
}

exports.handleNewGuild = async function(guild) {
    serverSettings.initGuild(guild.id);
}

exports.banHandler = async function(guild, member) {
    logs.banMsg(guild, member);
}

exports.unbanHandler = async function(guild, member) {
    logs.unbanMsg(guild, member);
}
