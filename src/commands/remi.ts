import { SlashCommandBuilder } from 'discord.js';
import { Command } from '../types/Command'; // Adapte selon ton type Command

export const remi: Command = {
    data: new SlashCommandBuilder()
        .setName('remi')
        .setDescription('Poste une image de Rémi.'),
    execute: async (interaction) => {
        try {
            // URL de l'image (hébergée en ligne)
            const imageUrl = 'https://cdn.discordapp.com/attachments/540649957288574996/1196050983428571166/IMG_20240110_195521_715.jpg?ex=674af4c8&is=6749a348&hm=2bd6852cfec1ba39eba97e38c08cb04f140ef4b593f45414fdab56dd34edbb91&';

            // Répond avec un message et l'image
            await interaction.reply({
                content: 'Quel bogoss !',
                files: [imageUrl], // Si image locale : utilisez un chemin du projet
            });
        } catch (error) {
            console.error('Erreur lors de l\'exécution de la commande /remi:', error);
            await interaction.reply({
                content: 'Je n\'ai pas pu afficher l\'image. Réessaie plus tard !',
                ephemeral: true,
            });
        }
    },
};
