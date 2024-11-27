import { Telegraf } from "telegraf";
import axios from "axios";

// Load environment variables from .env file
import "@std/dotenv/load";

// Get bot access token from environment variables
const BOT_ACCESS_TOKEN = Deno.env.get("BOT_ACCESS_TOKEN");
if (!BOT_ACCESS_TOKEN) throw new Error("BOT_ACCESS_TOKEN is not set");

const bot = new Telegraf(BOT_ACCESS_TOKEN);

const dexscreener = axios.create({
  baseURL: "https://api.dexscreener.com",
});

const numberFormatter = Intl.NumberFormat("en", {
  notation: "compact",
  maximumSignificantDigits: 4,
});

// Regular expression for Solana address (base58 string of length 32-44)
const solanaAddressRegex = /[1-9A-HJ-NP-Za-km-z]{32,44}/;

const escapeMarkdown = (text: string) => {
  return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
};

const spacer = "  ";

bot.hears(solanaAddressRegex, async (ctx) => {
  try {
    // We can assert that the address will have a match because the regex is used in the hears filter
    const address = ctx.message.text.match(solanaAddressRegex)![0];

    const links1 = [
      `[🪐 JUP](${`https://jup.ag/swap/SOL-${address}`})`,
    ];

    if (address.endsWith("pump")) {
      links1.unshift(
        `[💊 PUMP](${`https://pump.fun/coin/${address}`})`,
      );
    }

    const links2 = [
      `[🦅 DEXS](${`https://dexscreener.com/solana/${address}`})`,
      `[🛠️ DEXT](${`https://www.dextools.io/app/en/solana/pair-explorer/${address}`})`,
      `[🐊 GMGN](${`https://gmgn.ai/sol/token/${address}`})`,
    ];

    const response = await dexscreener.get(`/latest/dex/tokens/${address}`);

    if (!response?.data?.pairs) {
      ctx.reply("No pairs found");
      return;
    }

    const pair = response.data.pairs[0];
    const baseToken = pair.baseToken;
    const info = pair.info;

    const tokenLinks = new Array<string>();

    for (const website of info?.websites || []) {
      tokenLinks.push(`[${website.label}](${website.url})`);
    }

    for (const social of info?.socials || []) {
      tokenLinks.push(`[${social.type}](${social.url})`);
    }

    const sections = [
      `${baseToken.name} [$${baseToken.symbol}]:`,
      `Market Cap: $${escapeMarkdown(numberFormatter.format(pair.marketCap))}`,
      `\n\`${address}\`\n`,
      `Quick links™${spacer}${links1.join(spacer)}\n${links2.join(spacer)}\n`,
      tokenLinks.join(spacer),
    ];

    console.log(sections.join("\n"));

    await ctx.reply(`${sections.join("\n")}`, {
      parse_mode: "MarkdownV2",
      link_preview_options: { is_disabled: true },
    });

  } catch (e) {
    ctx.reply(
      `\`\`\`\nError: ${
        e instanceof Error ? e.message : "Unknown error"
      }\n\`\`\``,
      {
        parse_mode: "MarkdownV2",
        reply_parameters: {
          message_id: ctx.message.message_id,
        },
      },
    );
  }
});

bot.launch();

// Enable graceful stop
// Deno.addSignalListener("SIGINT", () => bot.stop("SIGINT"));
// Deno.addSignalListener("SIGTERM", () => bot.stop("SIGTERM"));
