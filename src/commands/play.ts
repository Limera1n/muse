import {ChatInputCommandInteraction} from 'discord.js';
import {SlashCommandBuilder} from '@discordjs/builders';
import {inject, injectable, optional} from 'inversify';
import Spotify from 'spotify-web-api-node';
import Command from './index.js';
import {TYPES} from '../types.js';
import ThirdParty from '../services/third-party.js';
import KeyValueCacheProvider from '../services/key-value-cache.js';
import AddQueryToQueue from '../services/add-query-to-queue.js';

@injectable()
export default class implements Command {
  public readonly slashCommand: Partial<SlashCommandBuilder> & Pick<SlashCommandBuilder, 'toJSON'>;

  private readonly spotify?: Spotify;
  private readonly addQueryToQueue: AddQueryToQueue;

  constructor(
    @inject(TYPES.ThirdParty) @optional() thirdParty: ThirdParty,
    @inject(TYPES.Services.AddQueryToQueue) addQueryToQueue: AddQueryToQueue
  ) {
    this.spotify = thirdParty?.spotify;
    this.addQueryToQueue = addQueryToQueue;

    this.slashCommand = new SlashCommandBuilder()
      .setName('play')
      .setDescription('Play a song or playlist')
      .addStringOption(option =>
        option
          .setName('query')
          .setDescription('YouTube URL, Spotify URL, or search query')
          .setRequired(true)
      );
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const query = interaction.options.getString('query', true); // The query is now mandatory.

    await this.addQueryToQueue.addToQueue({
      interaction,
      query: query.trim(),
      addToFrontOfQueue: false, // Adjust based on your default behavior.
      shuffleAdditions: false,
      shouldSplitChapters: false,
      skipCurrentTrack: false,
    });

    await interaction.reply(`Playing: **${query}**`);
  }
}
