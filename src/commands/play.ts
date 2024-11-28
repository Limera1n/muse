import { AutocompleteInteraction, ChatInputCommandInteraction, Attachment } from 'discord.js';
import { SlashCommandBuilder } from '@discordjs/builders';
import { inject, injectable, optional } from 'inversify';
import Spotify from 'spotify-web-api-node';
import Command from './index.js';
import { TYPES } from '../types.js';
import ThirdParty from '../services/third-party.js';
import getYouTubeAndSpotifySuggestionsFor from '../utils/get-youtube-and-spotify-suggestions-for.js';
import KeyValueCacheProvider from '../services/key-value-cache.js';
import { ONE_HOUR_IN_SECONDS } from '../utils/constants.js';
import AddQueryToQueue from '../services/add-query-to-queue.js';

@injectable()
export default class implements Command {
  public readonly slashCommand: Partial<SlashCommandBuilder | SlashCommandSubcommandsOnlyBuilder> & Pick<SlashCommandBuilder, 'toJSON'>;

  public requiresVC = true;

  private readonly spotify?: Spotify;
  private readonly cache: KeyValueCacheProvider;
  private readonly addQueryToQueue: AddQueryToQueue;

  constructor(@inject(TYPES.ThirdParty) @optional() thirdParty: ThirdParty, @inject(TYPES.KeyValueCache) cache: KeyValueCacheProvider, @inject(TYPES.Services.AddQueryToQueue) addQueryToQueue: AddQueryToQueue) {
    this.spotify = thirdParty?.spotify;
    this.cache = cache;
    this.addQueryToQueue = addQueryToQueue;

    const queryDescription = thirdParty === undefined
      ? 'YouTube URL or search query'
      : 'YouTube URL, Spotify URL, or search query';

    // Création de la commande /play avec une option pour le fichier audio
    this.slashCommand = new SlashCommandBuilder()
      .setName('play')
      .setDescription('Play a song')
      .addStringOption(option => option
        .setName('query')
        .setDescription(queryDescription)
        .setAutocomplete(true)
        .setRequired(false)) // L'option pour la recherche est désormais facultative
      .addAttachmentOption(option => option
        .setName('file')
        .setDescription('Upload an audio file to play')
        .setRequired(false)) // Option pour uploader un fichier audio
      .addBooleanOption(option => option
        .setName('immediate')
        .setDescription('Add track to the front of the queue'))
      .addBooleanOption(option => option
        .setName('shuffle')
        .setDescription('Shuffle the input if you\'re adding multiple tracks'))
      .addBooleanOption(option => option
        .setName('split')
        .setDescription('If a track has chapters, split it'))
      .addBooleanOption(option => option
        .setName('skip')
        .setDescription('Skip the currently playing track'));
  }

  public async execute(interaction: ChatInputCommandInteraction): Promise<void> {
    const query = interaction.options.getString('query') ?? '';
    const file = interaction.options.getAttachment('file'); // Récupère le fichier audio téléchargé

    // Si un fichier audio est téléchargé, on l'ajoute à la queue
    if (file) {
      await this.addQueryToQueue.addToQueue({
        interaction,
        query: file.url, // Utilise l'URL du fichier téléchargé
        addToFrontOfQueue: interaction.options.getBoolean('immediate') ?? false,
        shuffleAdditions: interaction.options.getBoolean('shuffle') ?? false,
        shouldSplitChapters: interaction.options.getBoolean('split') ?? false,
        skipCurrentTrack: interaction.options.getBoolean('skip') ?? false,
      });
    } else if (query) {
      // Si c'est une recherche classique
      await this.addQueryToQueue.addToQueue({
        interaction,
        query: query.trim(),
        addToFrontOfQueue: interaction.options.getBoolean('immediate') ?? false,
        shuffleAdditions: interaction.options.getBoolean('shuffle') ?? false,
        shouldSplitChapters: interaction.options.getBoolean('split') ?? false,
        skipCurrentTrack: interaction.options.getBoolean('skip') ?? false,
      });
    } else {
      // Si aucune option n'est renseignée
      await interaction.reply('Please provide either a search query or an audio file.');
    }
  }

  public async handleAutocompleteInteraction(interaction: AutocompleteInteraction): Promise<void> {
    const query = interaction.options.getString('query')?.trim();

    if (!query || query.length === 0) {
      await interaction.respond([]);
      return;
    }

    try {
      new URL(query);
      await interaction.respond([]);
      return;
    } catch {}

    // Suggestions YouTube et Spotify pour la recherche
    const suggestions = await this.cache.wrap(
      getYouTubeAndSpotifySuggestionsFor,
      query,
      this.spotify,
      10,
      {
        expiresIn: ONE_HOUR_IN_SECONDS,
        key: `autocomplete:${query}`,
      });

    await interaction.respond(suggestions);
  }
}
