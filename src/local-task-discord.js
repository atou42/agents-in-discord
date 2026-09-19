// discord.js retries POSTs after network/5xx errors by default. For task creation
// an uncertain response must not create a second thread or starter message.
export function createLocalTaskDiscordWriter({ REST, Routes, MessagePayload }) {
  const writers = new WeakMap();
  function restFor(channel) {
    const client = channel.client;
    let rest = writers.get(client);
    if (!rest) {
      rest = new REST({ ...client.rest.options, retries: 0 }).setToken(client.token);
      if (client.rest.agent) rest.setAgent(client.rest.agent);
      writers.set(client, rest);
    }
    return rest;
  }
  async function payloadFor(channel, payload) {
    return MessagePayload.create(channel, payload).resolveBody().resolveFiles();
  }
  return {
    async createThread(parent, { title, payload, requestId }) {
      const forum = parent.type === 15;
      const message = forum ? await payloadFor(parent, payload) : null;
      return restFor(parent).post(Routes.threads(parent.id), {
        body: { name: title, auto_archive_duration: 10080,
          ...(forum ? { message: message.body } : { type: 11 }) },
        ...(forum ? { files: message.files } : {}),
        reason: `Local task request ${requestId}`,
      });
    },
    async sendStarter(thread, payload) {
      const message = await payloadFor(thread, payload);
      const data = await restFor(thread).post(Routes.channelMessages(thread.id), { body: message.body, files: message.files });
      return thread.messages.fetch(data.id);
    },
  };
}
